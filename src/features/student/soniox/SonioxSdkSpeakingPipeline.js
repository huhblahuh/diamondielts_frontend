import { SonioxClient } from '@soniox/client';
import { SharedWebmAudioSource } from '../audio/SharedWebmAudioSource';
import { finalizedText, sonioxTokensToWords } from './SonioxTokenAdapter';

const CONNECT_TIMEOUT_MS = 12_000;
const FINISH_TIMEOUT_MS = 60_000;
const GENERIC_ERROR = 'Không thể xử lý bài nói. Vui lòng thử ghi âm lại. Nếu lỗi lặp lại, hãy liên hệ hỗ trợ.';

export function formatSpeakingPipelineError(error) {
    const knownMessages = [
        'Trình duyệt không hỗ trợ ghi âm WebM/Opus.',
        'Cần mở trang bằng HTTPS',
        'Kết nối Soniox quá thời gian.',
        'Soniox chưa hoàn tất phiên ghi âm.',
        'Soniox thiếu timestamps hợp lệ.'
    ];
    return knownMessages.some(message => error?.message?.startsWith(message))
        ? error.message : GENERIC_ERROR;
}

function withTimeout(promise, milliseconds, message) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })
    ]).finally(() => clearTimeout(timer));
}

export class SonioxSdkSpeakingPipeline {
    constructor({ credentials, question, partNumber = 1 }) {
        if (!credentials?.soniox?.temporaryApiKey || !credentials?.sessionId) {
            throw new Error('Thiếu thông tin phiên Soniox.');
        }
        this.credentials = credentials;
        this.question = (question || '').replace(/\s+/g, ' ').trim().slice(0, 4_000);
        this.partNumber = partNumber;
        this.source = new SharedWebmAudioSource();
        this.finalTokens = [];
        this.finished = false;
        this.disposed = false;
        this.stopPromise = null;
    }

    async start() {
        if (!globalThis.isSecureContext) {
            throw new Error('Cần mở trang bằng HTTPS để sử dụng micro.');
        }
        const soniox = this.credentials.soniox;
        const client = new SonioxClient({
            config: { api_key: soniox.temporaryApiKey, ...(soniox.webSocketUrl ? { stt_ws_url: soniox.webSocketUrl } : {}) }
        });
        let resolveConnected;
        let rejectConnected;
        const connected = new Promise((resolve, reject) => {
            resolveConnected = resolve;
            rejectConnected = reject;
        });
        this.recording = client.realtime.record({
            source: this.source,
            model: soniox.model || 'stt-rt-v5',
            audio_format: 'auto',
            auto_reconnect: false,
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
                    { key: 'task', value: 'The candidate answers an IELTS Speaking question in English' },
                    { key: 'part', value: `Part ${this.partNumber}` },
                    { key: 'topic', value: this.question || 'IELTS Speaking response' }
                ],
                ...(this.question ? { text: `Examiner question: ${this.question}` } : {})
            }
        });
        this.recording.on('connected', () => resolveConnected());
        this.recording.on('result', result => {
            for (const token of result.tokens || []) {
                if (token.text === '<end>' || token.text === '<fin>') continue;
                if (token.is_final) this.finalTokens.push(token);
            }
        });
        this.recording.on('finished', () => { this.finished = true; });
        this.recording.on('error', error => {
            this.fatalError = error;
            rejectConnected(error);
        });
        try {
            await withTimeout(connected, CONNECT_TIMEOUT_MS, 'Kết nối Soniox quá thời gian. Vui lòng thử lại.');
        } catch (error) {
            await this.dispose();
            throw error;
        }
    }

    stop() {
        if (this.stopPromise) return this.stopPromise;
        this.stopPromise = this.finish();
        return this.stopPromise;
    }

    async finish() {
        if (!this.recording) throw new Error('Chưa bắt đầu ghi âm.');
        try {
            const audioBlob = await this.source.finishCaptureAndFlush();
            this.source.stop();
            if (this.fatalError) throw this.fatalError;
            await withTimeout(this.recording.stop(), FINISH_TIMEOUT_MS, 'Soniox chưa hoàn tất phiên ghi âm. Vui lòng thử lại.');
            if (this.fatalError) throw this.fatalError;
            if (!this.finished) throw new Error('Soniox chưa xác nhận hoàn tất bài nói.');
            const transcript = finalizedText(this.finalTokens);
            const tokens = sonioxTokensToWords(this.finalTokens);
            if (transcript && !tokens.length) throw new Error('Soniox thiếu timestamps hợp lệ. Vui lòng ghi âm lại.');
            return {
                audioBlob,
                durationSeconds: this.source.durationSeconds,
                transcript,
                tokens,
                sonioxFinalized: true,
                sessionId: this.credentials.sessionId
            };
        } finally {
            await this.dispose();
        }
    }

    async dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.recording?.cancel();
        this.source.stop();
    }
}
