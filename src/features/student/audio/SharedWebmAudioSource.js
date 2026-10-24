const MIME_TYPE = 'audio/webm;codecs=opus';
const TIMESLICE_MS = 100;

export class SharedWebmAudioSource {
    constructor() {
        this.chunks = [];
        this.chunksSent = 0;
        this.pending = Promise.resolve();
        this.startedAt = null;
        this.stoppedAt = null;
        this.finishPromise = null;
    }

    async start(handlers) {
        if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder?.isTypeSupported?.(MIME_TYPE)) {
            throw new Error('Trình duyệt không hỗ trợ ghi âm WebM/Opus. Hãy thử Chrome hoặc trình duyệt hỗ trợ WebM/Opus.');
        }
        this.handlers = handlers;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            this.recorder = new MediaRecorder(this.stream, { mimeType: MIME_TYPE });
            this.recorder.ondataavailable = event => {
                if (!event.data?.size) return;
                this.chunks.push(event.data);
                // Blob conversion is asynchronous. Chain it to preserve recorder order.
                this.pending = this.pending.then(async () => {
                    const buffer = await event.data.arrayBuffer();
                    this.handlers.onData(buffer);
                    this.chunksSent += 1;
                }).catch(error => {
                    this.captureError = error;
                    this.handlers.onError(error);
                });
            };
            this.recorder.onerror = event => {
                this.captureError = event.error || new Error('MediaRecorder gặp lỗi.');
                this.handlers.onError(this.captureError);
            };
            this.recorder.start(TIMESLICE_MS);
            this.startedAt = performance.now();
        } catch (error) {
            this.stop();
            throw error;
        }
    }

    async finishCaptureAndFlush() {
        if (this.finishPromise) return this.finishPromise;
        this.finishPromise = (async () => {
            if (!this.recorder) throw new Error('Chưa bắt đầu ghi âm.');
            if (this.recorder.state !== 'inactive') {
                await new Promise((resolve, reject) => {
                    this.recorder.addEventListener('stop', resolve, { once: true });
                    try { this.recorder.stop(); } catch (error) { reject(error); }
                });
            }
            this.stoppedAt ??= performance.now();
            await this.pending;
            if (this.captureError) throw this.captureError;
            if (!this.chunks.length || this.chunksSent !== this.chunks.length) {
                throw new Error('Các chunk âm thanh chưa được chuyển đầy đủ.');
            }
            return new Blob(this.chunks, { type: MIME_TYPE });
        })();
        return this.finishPromise;
    }

    stop() {
        if (this.recorder?.state !== 'inactive') {
            try { this.recorder.stop(); } catch { /* already stopping */ }
        }
        this.stoppedAt ??= performance.now();
        this.stream?.getTracks().forEach(track => track.stop());
    }

    get durationSeconds() {
        return Math.max(0, ((this.stoppedAt ?? performance.now()) - (this.startedAt ?? performance.now())) / 1000);
    }
}
