import { logSpeakingDiagnostic } from './speakingDiagnostics';

const SAMPLE_RATE = 16_000;
const SONIOX_CONNECT_TIMEOUT_MS = 12_000;
const SONIOX_FINISH_TIMEOUT_MS = 60_000;
const SONIOX_FINISH_STALL_TIMEOUT_MS = 20_000;
const SONIOX_TRAILING_SILENCE_MS = 200;
const PCM_PACKET_SAMPLES = SAMPLE_RATE / 10;
const WEBM_RECORDER_TIMESLICE_MS = 100;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function pipelineError(code, message, details = {}) {
    const error = new Error(message);
    error.name = 'SpeakingPipelineError';
    error.code = code;
    error.details = details;
    return error;
}

export function formatSpeakingPipelineError(error) {
    if (error?.name !== 'SpeakingPipelineError') {
        return 'Không thể xử lý bài nói. Vui lòng thử ghi âm lại. Nếu lỗi lặp lại, hãy gửi ảnh thông báo lỗi để được hỗ trợ.';
    }

    const serviceDetails = error.code === 'STT_SERVICE_ERROR'
        ? [
            error.details?.serviceCode != null ? `Soniox: ${error.details.serviceCode}` : null,
            error.details?.serviceType ? `Loại: ${error.details.serviceType}` : null,
            error.details?.requestId ? `Request ID: ${error.details.requestId}` : null,
        ].filter(Boolean)
        : [];
    return `${error.message} (Mã lỗi: ${[error.code, ...serviceDetails].join('; ')})`;
}

function withTimeout(promise, milliseconds, timeoutError) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(timeoutError), milliseconds);
        })
    ]).finally(() => clearTimeout(timer));
}

function tokenText(tokens) {
    return tokens
        .map(token => token.text || '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

export function sonioxTokensToWords(tokens) {
    const words = [];
    let current = null;

    const flush = () => {
        if (!current) return;
        const text = current.text.trim();
        if (text && /[\p{L}\p{N}]/u.test(text)) {
            const confidence = current.confidences.length > 0
                ? current.confidences.reduce((sum, value) => sum + value, 0)
                    / current.confidences.length
                : null;
            words.push({
                text,
                start_ms: current.startMs,
                end_ms: current.endMs,
                confidence,
                is_final: true,
                language: current.language
            });
        }
        current = null;
    };

    for (const token of tokens || []) {
        const text = token?.text || '';
        if (!token?.is_final || text === '<end>' || text === '<fin>') continue;

        for (const part of text.match(/\s+|[^\s]+/gu) || []) {
            if (/^\s+$/u.test(part)) {
                flush();
                continue;
            }

            if (!current) {
                current = {
                    text: '',
                    startMs: Number.isFinite(token.start_ms) ? token.start_ms : null,
                    endMs: Number.isFinite(token.end_ms) ? token.end_ms : null,
                    confidences: [],
                    language: token.language || null
                };
            }

            current.text += part;
            if (Number.isFinite(token.start_ms)) {
                current.startMs = current.startMs === null
                    ? token.start_ms
                    : Math.min(current.startMs, token.start_ms);
            }
            if (Number.isFinite(token.end_ms)) {
                current.endMs = current.endMs === null
                    ? token.end_ms
                    : Math.max(current.endMs, token.end_ms);
            }
            if (Number.isFinite(token.confidence)) {
                current.confidences.push(token.confidence);
            }
            current.language ||= token.language || null;
        }
    }

    flush();
    return words.filter(word =>
        Number.isFinite(word.start_ms)
        && Number.isFinite(word.end_ms)
        && word.end_ms > word.start_ms
    );
}

class StreamingLinearResampler {
    constructor(inputRate, outputRate) {
        this.ratio = inputRate / outputRate;
        this.buffer = new Float32Array(0);
        this.position = 0;
    }

    process(input) {
        if (!input?.length) return new Float32Array(0);
        if (this.ratio === 1) return input;

        const combined = new Float32Array(this.buffer.length + input.length);
        combined.set(this.buffer);
        combined.set(input, this.buffer.length);

        const output = [];
        while (this.position + 1 < combined.length) {
            const leftIndex = Math.floor(this.position);
            const fraction = this.position - leftIndex;
            output.push(
                combined[leftIndex]
                + (combined[leftIndex + 1] - combined[leftIndex]) * fraction
            );
            this.position += this.ratio;
        }

        const consumed = Math.floor(this.position);
        this.buffer = combined.slice(consumed);
        this.position -= consumed;
        return Float32Array.from(output);
    }
}

function floatToPcm16(input) {
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
        const value = Math.max(-1, Math.min(1, input[index]));
        output[index] = value < 0 ? value * 32768 : value * 32767;
    }
    return output;
}

function mediaRecorderOptions() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
    const mimeType = candidates.find(
        candidate => globalThis.MediaRecorder?.isTypeSupported?.(candidate)
    );
    return mimeType ? { mimeType } : undefined;
}

export class SpeakingAssessmentPipeline {
    constructor({ credentials, question, partNumber = 1, onTranscript = null }) {
        if (!credentials?.soniox?.temporaryApiKey) {
            throw new Error('Không thể khởi tạo ghi âm.');
        }

        this.credentials = credentials;
        this.question = (question || '').replace(/\s+/g, ' ').trim().slice(0, 4_000);
        this.partNumber = partNumber;
        this.onTranscript = onTranscript;
        // Allow comparing both capture paths on the same deployment.
        const forcePcm = new URLSearchParams(globalThis.location?.search ?? '')
            .get('speakingStt') === 'pcm';
        this.useWebmStreaming = Boolean(
            !forcePcm && globalThis.MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus')
        );

        this.mediaStream = null;
        this.mediaRecorder = null;
        this.mediaChunks = [];
        this.audioContext = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.silentGain = null;
        this.resampler = null;
        this.socket = null;

        this.capturing = false;
        this.stopping = false;
        this.disposed = false;
        this.sampleCount = 0;
        this.recordingStartedAt = null;
        this.recordingStoppedAt = null;
        this.pendingPcm = new Int16Array(PCM_PACKET_SAMPLES);
        this.pendingPcmSamples = 0;

        this.finalTokens = [];
        this.interimTokens = [];
        this.fatalError = null;
        this.finishReceived = false;

        this.finishedPromise = new Promise(resolve => {
            this.resolveFinished = resolve;
        });

        this.stats = {
            recorderChunks: 0,
            webmChunksSent: 0,
            recorderBytes: 0,
            maxProcessedAudioMs: 0,
            maxFinalizedAudioMs: 0,
        };
        this.lastAudioLogAt = 0;
        this.lastSonioxLogAt = 0;
        logSpeakingDiagnostic('pipeline_created', {
            part: this.partNumber,
            format: this.useWebmStreaming ? 'webm-opus' : 'pcm16',
        });
    }

    diagnosticState() {
        return {
            socketState: this.socket?.readyState ?? null,
            bufferedBytes: this.socket?.bufferedAmount ?? 0,
            recordedChunks: this.stats.recorderChunks,
            sentChunks: this.stats.webmChunksSent,
            recordedBytes: this.stats.recorderBytes,
            capturedAudioMs: this.useWebmStreaming
                ? Math.round(((this.recordingStoppedAt ?? performance.now())
                    - (this.recordingStartedAt ?? performance.now())))
                : Math.round(this.sampleCount / SAMPLE_RATE * 1000),
            processedAudioMs: this.stats.maxProcessedAudioMs,
            finalizedAudioMs: this.stats.maxFinalizedAudioMs,
            finalTokens: this.finalTokens.length,
        };
    }

    logAudioProgress() {
        const now = performance.now();
        if (now - this.lastAudioLogAt < 2000) return;
        this.lastAudioLogAt = now;
        logSpeakingDiagnostic('audio_progress', this.diagnosticState());
    }

    async start() {
        logSpeakingDiagnostic('pipeline_start', { secureContext: globalThis.isSecureContext });
        if (!globalThis.isSecureContext) {
            throw pipelineError(
                'MIC_INSECURE_CONTEXT',
                'Trình duyệt chặn micro trên địa chỉ HTTP qua mạng LAN. Hãy mở http://localhost:5173 trên chính máy này, hoặc dùng một địa chỉ HTTPS khi thử trên thiết bị khác.'
            );
        }

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            logSpeakingDiagnostic('microphone_ready', {
                audioTracks: this.mediaStream.getAudioTracks().length,
                sampleRate: this.mediaStream.getAudioTracks()[0]?.getSettings?.().sampleRate ?? null,
            });
            await this.connectSoniox();
            if (!this.useWebmStreaming) await this.startAudioCapture();
            this.startMediaRecorder();
            this.capturing = true;
            logSpeakingDiagnostic('capture_started', this.diagnosticState());
        } catch (error) {
            logSpeakingDiagnostic('pipeline_start_failed', { code: error?.code || error?.name || 'UNKNOWN' });
            await this.dispose();
            throw error;
        }
    }

    async connectSoniox() {
        const soniox = this.credentials.soniox;
        logSpeakingDiagnostic('soniox_connecting');
        const socket = new WebSocket(
            soniox.webSocketUrl || 'wss://stt-rt.soniox.com/transcribe-websocket'
        );
        this.socket = socket;

        await withTimeout(new Promise((resolve, reject) => {
            socket.onopen = () => {
                logSpeakingDiagnostic('soniox_socket_open');
                socket.send(JSON.stringify({
                    api_key: soniox.temporaryApiKey,
                    model: soniox.model || 'stt-rt-v5',
                    audio_format: this.useWebmStreaming ? 'auto' : 'pcm_s16le',
                    ...(!this.useWebmStreaming ? {
                        sample_rate: SAMPLE_RATE,
                        num_channels: 1,
                    } : {}),
                    language_hints: ['en'],
                    language_hints_strict: false,
                    enable_language_identification: true,
                    enable_endpoint_detection: true,
                    endpoint_latency_adjustment_level: 0,
                    endpoint_sensitivity: -0.1,
                    max_endpoint_delay_ms: 2000,
                    context: {
                        general: [
                            { key: 'domain', value: 'IELTS Speaking' },
                            {
                                key: 'task',
                                value: 'The candidate answers an IELTS Speaking question in English'
                            },
                            { key: 'part', value: `Part ${this.partNumber}` },
                            { key: 'topic', value: this.question || 'IELTS Speaking response' }
                        ],
                        text: this.question ? `Examiner question: ${this.question}` : undefined
                    }
                }));
                logSpeakingDiagnostic('soniox_config_sent', {
                    format: this.useWebmStreaming ? 'auto-webm' : 'pcm_s16le',
                });
                resolve();
            };
            socket.onerror = () => {
                logSpeakingDiagnostic('soniox_connect_error');
                reject(pipelineError(
                    'STT_CONNECT_FAILED',
                    'Không kết nối được dịch vụ nhận dạng giọng nói. Hãy kiểm tra mạng rồi thử lại.'
                ));
            };
        }), SONIOX_CONNECT_TIMEOUT_MS, pipelineError(
            'STT_CONNECT_TIMEOUT',
            'Kết nối dịch vụ nhận dạng giọng nói quá 12 giây. Hãy kiểm tra mạng rồi thử lại.'
        ));

        socket.onmessage = event => {
            try {
                this.handleSonioxMessage(JSON.parse(event.data));
            } catch {
                logSpeakingDiagnostic('soniox_invalid_response');
                this.fatalError = pipelineError(
                    'STT_INVALID_RESPONSE',
                    'Dịch vụ nhận dạng trả về dữ liệu không hợp lệ. Vui lòng ghi âm lại.'
                );
                this.resolveFinished();
            }
        };

        socket.onerror = () => {
            if (!this.disposed && !this.finishReceived) {
                logSpeakingDiagnostic('soniox_socket_error', this.diagnosticState());
                this.fatalError = pipelineError(
                    'STT_SOCKET_ERROR',
                    'Kết nối tới dịch vụ nhận dạng gặp lỗi khi đang ghi âm. Hãy kiểm tra mạng rồi ghi âm lại.'
                );
                this.resolveFinished();
            }
        };

        socket.onclose = event => {
            logSpeakingDiagnostic('soniox_socket_closed', {
                closeCode: event.code,
                clean: event.wasClean,
                ...this.diagnosticState(),
            });
            if (!this.disposed && !this.finishReceived && !this.fatalError) {
                this.fatalError = pipelineError(
                    'STT_SOCKET_CLOSED',
                    'Kết nối nhận dạng giọng nói bị ngắt trước khi hoàn tất. Hãy kiểm tra mạng rồi ghi âm lại.',
                    { closeCode: event.code }
                );
                this.resolveFinished();
            }
        };
    }

    async startAudioCapture() {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('Trình duyệt không hỗ trợ AudioContext.');
        }

        try {
            this.audioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
        } catch {
            this.audioContext = new AudioContextClass();
        }

        await this.audioContext.resume();
        await this.audioContext.audioWorklet.addModule(
            new URL('./pcmCaptureWorklet.js', import.meta.url)
        );
        this.resampler = new StreamingLinearResampler(
            this.audioContext.sampleRate,
            SAMPLE_RATE
        );
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.workletNode = new AudioWorkletNode(this.audioContext, 'speaking-pcm-capture');
        this.silentGain = this.audioContext.createGain();
        this.silentGain.gain.value = 0;

        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.silentGain);
        this.silentGain.connect(this.audioContext.destination);

        this.workletNode.port.onmessage = event => {
            if (!this.capturing) return;
            const resampled = this.resampler.process(new Float32Array(event.data));
            const pcm = floatToPcm16(resampled);
            if (!pcm.length) return;

            this.sampleCount += pcm.length;
            this.logAudioProgress();
            if (this.socket?.readyState === WebSocket.OPEN) {
                try {
                    this.queuePcm(pcm);
                } catch (cause) {
                    this.fatalError = pipelineError(
                        'STT_AUDIO_SEND_FAILED',
                        'Không gửi được âm thanh tới dịch vụ nhận dạng. Vui lòng kiểm tra mạng rồi ghi âm lại.'
                    );
                    this.fatalError.cause = cause;
                    this.resolveFinished();
                }
            }
        };
    }

    queuePcm(pcm) {
        let offset = 0;
        while (offset < pcm.length) {
            const count = Math.min(PCM_PACKET_SAMPLES - this.pendingPcmSamples, pcm.length - offset);
            this.pendingPcm.set(pcm.subarray(offset, offset + count), this.pendingPcmSamples);
            this.pendingPcmSamples += count;
            offset += count;
            if (this.pendingPcmSamples === PCM_PACKET_SAMPLES) this.flushPendingPcm();
        }
    }

    flushPendingPcm() {
        if (this.pendingPcmSamples === 0) return;
        const samples = this.pendingPcmSamples;
        const packet = this.pendingPcm.slice(0, samples);
        this.socket.send(packet.buffer);
        this.pendingPcmSamples = 0;
    }

    startMediaRecorder() {
        this.mediaChunks = [];
        const options = this.useWebmStreaming
            ? { mimeType: 'audio/webm;codecs=opus' }
            : mediaRecorderOptions();
        this.mediaRecorder = options
            ? new MediaRecorder(this.mediaStream, options)
            : new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = event => {
            if (event.data?.size) {
                this.mediaChunks.push(event.data);
                this.stats.recorderChunks += 1;
                this.stats.recorderBytes += event.data.size;
                if (this.useWebmStreaming) {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        try {
                            this.socket.send(event.data);
                            this.stats.webmChunksSent += 1;
                        } catch (cause) {
                            this.fatalError ||= pipelineError(
                                'STT_AUDIO_SEND_FAILED',
                                'Không gửi được âm thanh WebM tới dịch vụ nhận dạng. Vui lòng ghi âm lại.'
                            );
                            this.fatalError.cause = cause;
                            this.resolveFinished();
                        }
                    } else {
                        this.fatalError ||= pipelineError(
                            'STT_SOCKET_CLOSED',
                            'Kết nối nhận dạng đã ngắt khi đang gửi âm thanh WebM. Vui lòng ghi âm lại.'
                        );
                        this.resolveFinished();
                    }
                }
                this.logAudioProgress();
            }
        };
        this.mediaRecorder.addEventListener('stop', () => {
            if (!this.stopping) {
                this.fatalError = pipelineError(
                    'RECORDER_STOPPED_EARLY',
                    'Ghi âm đã dừng trước khi bạn kết thúc. Vui lòng kiểm tra micro rồi ghi âm lại.'
                );
                this.resolveFinished();
            }
        }, { once: true });
        this.mediaRecorder.addEventListener('error', () => {
            this.fatalError = pipelineError(
                'RECORDER_ERROR',
                'Trình duyệt không thể tiếp tục ghi âm. Vui lòng kiểm tra micro rồi ghi âm lại.'
            );
            this.resolveFinished();
        }, { once: true });
        this.mediaRecorder.start(this.useWebmStreaming ? WEBM_RECORDER_TIMESLICE_MS : 250);
        this.recordingStartedAt = performance.now();
        this.recordingStoppedAt = null;
        logSpeakingDiagnostic('recorder_started', { mimeType: this.mediaRecorder.mimeType });
    }

    handleSonioxMessage(message) {
        if (Number.isFinite(message.total_audio_proc_ms)) {
            this.stats.maxProcessedAudioMs = Math.max(this.stats.maxProcessedAudioMs, message.total_audio_proc_ms);
        }
        if (Number.isFinite(message.final_audio_proc_ms)) {
            this.stats.maxFinalizedAudioMs = Math.max(this.stats.maxFinalizedAudioMs, message.final_audio_proc_ms);
        }
        if (message.error_code || message.error_message) {
            logSpeakingDiagnostic('soniox_service_error', {
                serviceCode: message.error_code ?? null,
                serviceType: message.error_type ?? null,
                requestId: message.request_id ?? null,
                ...this.diagnosticState(),
            });
            this.fatalError = pipelineError(
                'STT_SERVICE_ERROR',
                'Dịch vụ nhận dạng giọng nói báo lỗi. Vui lòng ghi âm lại; nếu lỗi lặp lại, hãy liên hệ hỗ trợ.',
                {
                    serviceCode: message.error_code || null,
                    serviceType: message.error_type || null,
                    requestId: message.request_id || null,
                }
            );
            this.resolveFinished();
            return;
        }

        this.interimTokens = [];
        for (const token of message.tokens || []) {
            if (token.text === '<end>' || token.text === '<fin>') continue;

            if (token.is_final) {
                // Soniox guarantees finalized tokens are emitted only once.
                // Keep whitespace tokens because they delimit complete words.
                this.finalTokens.push(token);
            } else {
                this.interimTokens.push(token);
            }
        }

        this.onTranscript?.({
            finalText: tokenText(this.finalTokens),
            interimText: tokenText(this.interimTokens)
        });

        const now = performance.now();
        if (message.finished || now - this.lastSonioxLogAt >= 2000) {
            this.lastSonioxLogAt = now;
            logSpeakingDiagnostic(message.finished ? 'soniox_finished' : 'soniox_progress', {
                ...this.diagnosticState(),
                interimTokens: this.interimTokens.length,
            });
        }

        if (message.finished) {
            this.finishReceived = true;
            this.resolveFinished();
        }
    }

    async stopMediaRecorder() {
        if (!this.mediaRecorder) return null;
        if (this.mediaRecorder.state === 'inactive') {
            this.recordingStoppedAt ??= performance.now();
            return new Blob(this.mediaChunks, {
                type: this.mediaRecorder.mimeType || 'audio/webm'
            });
        }

        await withTimeout(new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = resolve;
            this.mediaRecorder.onerror = () => reject(
                pipelineError('RECORDER_FINALIZE_ERROR', 'Trình duyệt không thể tạo file ghi âm. Vui lòng ghi âm lại.')
            );
            this.recordingStoppedAt = performance.now();
            this.mediaRecorder.stop();
        }), 10_000, pipelineError(
            'RECORDER_FINALIZE_TIMEOUT',
            'Trình duyệt không tạo xong file ghi âm sau 10 giây. Vui lòng ghi âm lại.'
        ));

        const blob = new Blob(this.mediaChunks, {
            type: this.mediaRecorder.mimeType || 'audio/webm'
        });
        logSpeakingDiagnostic('recorder_finalized', { bytes: blob.size, mimeType: blob.type });
        return blob;
    }

    sendTrailingSilence() {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        const sampleCount = Math.ceil(SONIOX_TRAILING_SILENCE_MS * SAMPLE_RATE / 1000);
        try {
            this.socket.send(new Int16Array(sampleCount).buffer);
        } catch (cause) {
            const error = pipelineError(
                'STT_SEND_FAILED',
                'Không gửi được phần cuối bài nói tới dịch vụ nhận dạng. Hãy kiểm tra mạng rồi ghi âm lại.'
            );
            error.cause = cause;
            throw error;
        }
    }

    async waitForSonioxFinish() {
        logSpeakingDiagnostic('soniox_finish_wait_started', this.diagnosticState());
        const startedAt = performance.now();
        let lastProgressAt = startedAt;
        let processedAudioMs = this.stats.maxProcessedAudioMs;
        let finalizedAudioMs = this.stats.maxFinalizedAudioMs;
        let finalTokenCount = this.finalTokens.length;
        let bufferedBytes = this.socket?.bufferedAmount ?? 0;
        let lastLogAt = startedAt;

        while (!this.finishReceived && !this.fatalError) {
            await Promise.race([this.finishedPromise, delay(250)]);
            const now = performance.now();
            const nextBufferedBytes = this.socket?.bufferedAmount ?? 0;
            if (nextBufferedBytes < bufferedBytes
                || this.stats.maxProcessedAudioMs > processedAudioMs
                || this.stats.maxFinalizedAudioMs > finalizedAudioMs
                || this.finalTokens.length > finalTokenCount) {
                lastProgressAt = now;
                processedAudioMs = this.stats.maxProcessedAudioMs;
                finalizedAudioMs = this.stats.maxFinalizedAudioMs;
                finalTokenCount = this.finalTokens.length;
            }
            bufferedBytes = nextBufferedBytes;
            if (this.finishReceived || this.fatalError) break;
            if (now - lastLogAt >= 2000) {
                lastLogAt = now;
                logSpeakingDiagnostic('soniox_finish_wait_progress', {
                    waitedMs: Math.round(now - startedAt),
                    stalledMs: Math.round(now - lastProgressAt),
                    ...this.diagnosticState(),
                });
            }
            if (now - startedAt >= SONIOX_FINISH_TIMEOUT_MS
                || now - lastProgressAt >= SONIOX_FINISH_STALL_TIMEOUT_MS) {
                logSpeakingDiagnostic('soniox_finish_timeout', {
                    waitedMs: Math.round(now - startedAt),
                    stalledMs: Math.round(now - lastProgressAt),
                    ...this.diagnosticState(),
                });
                throw pipelineError(
                    'STT_FINALIZE_TIMEOUT',
                    'Dịch vụ nhận dạng chưa xử lý xong bài nói trong thời gian cho phép. Vui lòng thử lại; nếu lỗi lặp lại, hãy liên hệ hỗ trợ.',
                    {
                        finishWaitMs: Math.round(now - startedAt),
                        msSinceProgress: Math.round(now - lastProgressAt),
                        processedAudioMs,
                        finalizedAudioMs,
                        bufferedBytes,
                    }
                );
            }
        }
    }

    async stop() {
        if (this.stopping) throw new Error('Không thể thực hiện thao tác ghi âm.');
        if (!this.capturing) throw new Error('Không thể thực hiện thao tác ghi âm.');
        this.stopping = true;
        this.capturing = false;
        logSpeakingDiagnostic('pipeline_stop_requested', this.diagnosticState());

        const mediaBlobPromise = this.stopMediaRecorder();

        try {
            // MediaRecorder emits its last dataavailable event before stop. Wait for
            // that event before closing the WebM stream so the final audio is sent.
            const webmBlob = this.useWebmStreaming ? await mediaBlobPromise : null;
            if (this.fatalError) throw this.fatalError;
            if (this.useWebmStreaming && (!webmBlob?.size
                || this.stats.webmChunksSent !== this.stats.recorderChunks)) {
                throw pipelineError(
                    'STT_AUDIO_INCOMPLETE',
                    'File ghi âm WebM chưa được gửi đầy đủ tới dịch vụ nhận dạng. Vui lòng ghi âm lại.',
                    { recorderChunks: this.stats.recorderChunks, chunksSent: this.stats.webmChunksSent }
                );
            }
            if (this.socket?.readyState !== WebSocket.OPEN) {
                throw this.fatalError || pipelineError(
                    'STT_SOCKET_CLOSED',
                    'Kết nối nhận dạng giọng nói đã bị ngắt. Hãy kiểm tra mạng rồi ghi âm lại.'
                );
            }

            if (!this.useWebmStreaming) {
                try {
                    this.flushPendingPcm();
                } catch (cause) {
                    const error = pipelineError(
                        'STT_SEND_FAILED',
                        'Không gửi được phần âm thanh cuối tới dịch vụ nhận dạng. Hãy kiểm tra mạng rồi ghi âm lại.'
                    );
                    error.cause = cause;
                    throw error;
                }
                this.sendTrailingSilence();
            }
            try {
                // WebSocket preserves frame order: the end marker follows every audio
                // frame already queued, even when bufferedAmount has not reached zero.
                this.socket.send('');
                logSpeakingDiagnostic('soniox_end_queued', this.diagnosticState());
            } catch (cause) {
                const error = pipelineError(
                    'STT_FINISH_SEND_FAILED',
                    'Không gửi được tín hiệu kết thúc bài nói. Hãy kiểm tra mạng rồi ghi âm lại.'
                );
                error.cause = cause;
                throw error;
            }

            await this.waitForSonioxFinish();
            if (this.fatalError) throw this.fatalError;
            if (!this.finishReceived) {
                throw pipelineError(
                    'STT_NOT_FINALIZED',
                    'Dịch vụ nhận dạng chưa xác nhận hoàn tất bài nói. Vui lòng ghi âm lại.'
                );
            }
            const transcript = tokenText(this.finalTokens);
            const words = sonioxTokensToWords(this.finalTokens);
            // Let the UI handle an empty transcript as a zero-word recording,
            // so it can guide the student through checking the microphone.
            if (transcript && words.length === 0) {
                throw pipelineError(
                    'STT_INVALID_TIMESTAMPS',
                    'Dịch vụ nhận dạng thiếu mốc thời gian của lời nói. Vui lòng ghi âm lại.'
                );
            }

            const audioBlob = webmBlob || await mediaBlobPromise;
            logSpeakingDiagnostic('pipeline_complete', {
                ...this.diagnosticState(),
                fileBytes: audioBlob?.size ?? 0,
                fileMimeType: audioBlob?.type ?? null,
                wordCount: words.length,
            });
            return {
                audioBlob,
                durationSeconds: this.useWebmStreaming
                    ? Math.max(0, (this.recordingStoppedAt - this.recordingStartedAt) / 1000)
                    : this.sampleCount / SAMPLE_RATE,
                transcript,
                tokens: words,
                sonioxFinalized: true,
                sessionId: this.credentials.sessionId
            };
        } finally {
            await Promise.resolve(mediaBlobPromise).catch(() => null);
            await this.releaseBrowserResources();
        }
    }

    async releaseBrowserResources() {
        this.mediaStream?.getTracks().forEach(track => track.stop());
        try { this.workletNode?.disconnect(); } catch { /* noop */ }
        try { this.sourceNode?.disconnect(); } catch { /* noop */ }
        try { this.silentGain?.disconnect(); } catch { /* noop */ }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { await this.audioContext.close(); } catch { /* noop */ }
        }
        if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
            try { this.socket.close(); } catch { /* noop */ }
        }
    }

    async dispose() {
        if (this.disposed) return;
        this.disposed = true;
        logSpeakingDiagnostic('pipeline_disposed', this.diagnosticState());
        this.capturing = false;
        this.stopping = true;
        try {
            if (this.mediaRecorder?.state !== 'inactive') this.mediaRecorder.stop();
        } catch { /* noop */ }
        await this.releaseBrowserResources();
    }
}
