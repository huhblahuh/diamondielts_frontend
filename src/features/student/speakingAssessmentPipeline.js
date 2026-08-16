const SAMPLE_RATE = 16_000;
const SONIOX_CONNECT_TIMEOUT_MS = 12_000;
const SONIOX_FINISH_TIMEOUT_MS = 20_000;
const SONIOX_DRAIN_TIMEOUT_MS = 5_000;
const SONIOX_TRAILING_SILENCE_MS = 200;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function withTimeout(promise, milliseconds, message) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(message)), milliseconds);
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

        this.finalTokens = [];
        this.interimTokens = [];
        this.fatalError = null;
        this.finishReceived = false;

        this.finishedPromise = new Promise(resolve => {
            this.resolveFinished = resolve;
        });
    }

    async start() {
        if (!globalThis.isSecureContext) {
            throw new Error('Ghi âm yêu cầu HTTPS hoặc localhost.');
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

            await this.connectSoniox();
            await this.startAudioCapture();
            this.startMediaRecorder();
            this.capturing = true;
        } catch (error) {
            await this.dispose();
            throw error;
        }
    }

    async connectSoniox() {
        const soniox = this.credentials.soniox;
        const socket = new WebSocket(
            soniox.webSocketUrl || 'wss://stt-rt.soniox.com/transcribe-websocket'
        );
        this.socket = socket;

        await withTimeout(new Promise((resolve, reject) => {
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    api_key: soniox.temporaryApiKey,
                    model: soniox.model || 'stt-rt-v5',
                    audio_format: 'pcm_s16le',
                    sample_rate: SAMPLE_RATE,
                    num_channels: 1,
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
                resolve();
            };
            socket.onerror = () => reject(new Error('Không thể kết nối dịch vụ ghi âm.'));
        }), SONIOX_CONNECT_TIMEOUT_MS, 'Không thể kết nối dịch vụ ghi âm.');

        socket.onmessage = event => {
            try {
                this.handleSonioxMessage(JSON.parse(event.data));
            } catch {
                this.fatalError = new Error('Không thể xử lý dữ liệu ghi âm.');
                this.resolveFinished();
            }
        };

        socket.onerror = () => {
            if (!this.disposed && !this.finishReceived) {
                this.fatalError = new Error('Dịch vụ ghi âm gặp sự cố.');
                this.resolveFinished();
            }
        };

        socket.onclose = () => {
            if (!this.disposed && !this.finishReceived && !this.fatalError) {
                this.fatalError = new Error('Dịch vụ ghi âm bị gián đoạn.');
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
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(
                    pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
                );
            }
        };
    }

    startMediaRecorder() {
        this.mediaChunks = [];
        const options = mediaRecorderOptions();
        this.mediaRecorder = options
            ? new MediaRecorder(this.mediaStream, options)
            : new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = event => {
            if (event.data?.size) this.mediaChunks.push(event.data);
        };
        this.mediaRecorder.start(250);
    }

    handleSonioxMessage(message) {
        if (message.error_code || message.error_message) {
            this.fatalError = new Error('Dịch vụ xử lý âm thanh gặp sự cố.');
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

        if (message.finished) {
            this.finishReceived = true;
            this.resolveFinished();
        }
    }

    async stopMediaRecorder() {
        if (!this.mediaRecorder) return null;
        if (this.mediaRecorder.state === 'inactive') {
            return new Blob(this.mediaChunks, {
                type: this.mediaRecorder.mimeType || 'audio/webm'
            });
        }

        await new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = resolve;
            this.mediaRecorder.onerror = () => reject(
                new Error('Không thể hoàn tất ghi âm.')
            );
            this.mediaRecorder.stop();
        });

        return new Blob(this.mediaChunks, {
            type: this.mediaRecorder.mimeType || 'audio/webm'
        });
    }

    sendTrailingSilence() {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        const sampleCount = Math.ceil(SONIOX_TRAILING_SILENCE_MS * SAMPLE_RATE / 1000);
        this.socket.send(new Int16Array(sampleCount).buffer);
    }

    async waitForSocketDrain() {
        const deadline = Date.now() + SONIOX_DRAIN_TIMEOUT_MS;
        while (
            this.socket?.readyState === WebSocket.OPEN
            && this.socket.bufferedAmount > 0
        ) {
            if (Date.now() >= deadline) {
                throw new Error('Không thể hoàn tất xử lý bài nói.');
            }
            await delay(20);
        }
    }

    async stop() {
        if (this.stopping) throw new Error('Không thể thực hiện thao tác ghi âm.');
        if (!this.capturing) throw new Error('Không thể thực hiện thao tác ghi âm.');
        this.stopping = true;
        this.capturing = false;

        const mediaBlobPromise = this.stopMediaRecorder();

        try {
            if (this.socket?.readyState !== WebSocket.OPEN) {
                throw this.fatalError || new Error('Dịch vụ ghi âm bị gián đoạn.');
            }

            this.sendTrailingSilence();
            await this.waitForSocketDrain();
            if (this.socket.readyState !== WebSocket.OPEN) {
                throw this.fatalError || new Error('Dịch vụ ghi âm bị gián đoạn.');
            }
            this.socket.send('');

            await withTimeout(
                this.finishedPromise,
                SONIOX_FINISH_TIMEOUT_MS,
                'Không thể hoàn tất xử lý bài nói.'
            );
            if (this.fatalError) throw this.fatalError;
            if (!this.finishReceived) {
                throw new Error('Không thể hoàn tất xử lý bài nói.');
            }

            const transcript = tokenText(this.finalTokens);
            if (!transcript) {
                throw new Error('Không nhận được nội dung bài nói.');
            }

            const words = sonioxTokensToWords(this.finalTokens);
            if (words.length === 0) {
                throw new Error('Soniox did not return valid word timestamps.');
            }

            return {
                audioBlob: await mediaBlobPromise,
                durationSeconds: this.sampleCount / SAMPLE_RATE,
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
        this.capturing = false;
        this.stopping = true;
        try {
            if (this.mediaRecorder?.state !== 'inactive') this.mediaRecorder.stop();
        } catch { /* noop */ }
        await this.releaseBrowserResources();
    }
}
