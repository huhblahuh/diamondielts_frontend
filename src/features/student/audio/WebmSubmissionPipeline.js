import { SharedWebmAudioSource } from './SharedWebmAudioSource';

export class WebmSubmissionPipeline {
    constructor() {
        this.source = new SharedWebmAudioSource();
    }

    async start() {
        if (!globalThis.isSecureContext) {
            throw new Error('Cần mở trang bằng HTTPS để sử dụng micro.');
        }
        await this.source.start({
            onData: () => {},
            onError: error => { this.captureError = error; }
        });
    }

    diagnosticState() {
        return {
            engine: 'webm-upload',
            recordedChunks: this.source.chunks.length,
            recordedBytes: this.source.bytes,
            capturedAudioMs: Math.round(this.source.durationSeconds * 1000)
        };
    }

    async stop() {
        try {
            const audioBlob = await this.source.finishCaptureAndFlush();
            if (this.captureError) throw this.captureError;
            return { audioBlob, durationSeconds: this.source.durationSeconds };
        } finally {
            this.dispose();
        }
    }

    dispose() {
        this.source.stop();
    }
}
