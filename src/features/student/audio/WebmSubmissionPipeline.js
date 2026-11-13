import { SharedWebmAudioSource } from './SharedWebmAudioSource';

export class WebmSubmissionPipeline {
    constructor() {
        this.source = new SharedWebmAudioSource();
    }

    async start() {
        // getUserMedia chỉ hoạt động an toàn trên HTTPS/secure context.
        if (!globalThis.isSecureContext) {
            throw new Error('Cần mở trang bằng HTTPS để sử dụng micro.');
        }
        await this.source.start({
            onError: error => { this.captureError = error; }
        });
    }


    async stop() {
        try {
            // Kết quả gồm file Blob và thời lượng; finally đảm bảo micro được đóng.
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
