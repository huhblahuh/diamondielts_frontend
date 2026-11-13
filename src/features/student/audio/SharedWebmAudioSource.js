import { reportHandledError } from '../../../utils/errorReporting.js';
import { selectRecordingMimeType } from './recordingFormat.js';
const TIMESLICE_MS = 100;

export class SharedWebmAudioSource {
    constructor() {
        this.chunks = [];
        this.startedAt = null;
        this.stoppedAt = null;
        this.finishPromise = null;
    }

    async start(handlers) {
        // Chọn định dạng trình duyệt hỗ trợ, xin quyền micro và gom từng chunk audio.
        this.mimeType = selectRecordingMimeType();
        if (!navigator.mediaDevices?.getUserMedia || !this.mimeType) {
            throw new Error('Trình duyệt không hỗ trợ ghi âm WebM hoặc MP4. Hãy cập nhật trình duyệt rồi thử lại.');
        }
        this.handlers = handlers;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
            this.mimeType = this.recorder.mimeType || this.mimeType;
            this.recorder.ondataavailable = event => {
                if (!event.data?.size) return;
                this.chunks.push(event.data);

            };
            this.recorder.onerror = event => {
                this.captureError = event.error || new Error('MediaRecorder gặp lỗi.');
                reportHandledError(this.captureError, 'audio.MediaRecorder.onerror');
                this.handlers.onError(this.captureError);
            };
            this.recorder.start(TIMESLICE_MS);
            this.startedAt = performance.now();
        } catch (error) {
            reportHandledError(error, "features/student/audio/SharedWebmAudioSource.js:51");
            this.stop();
            throw error;
        }
    }

    async finishCaptureAndFlush() {
        // Chờ MediaRecorder phát chunk cuối sau stop rồi ghép tất cả thành Blob để preview/nộp.
        if (this.finishPromise) return this.finishPromise;
        this.finishPromise = (async () => {
            if (!this.recorder) throw new Error('Chưa bắt đầu ghi âm.');
            if (this.recorder.state !== 'inactive') {
                await new Promise((resolve, reject) => {
                    this.recorder.addEventListener('stop', resolve, { once: true });
                    try { this.recorder.stop(); } catch (error) {
                        reportHandledError(error, "features/student/audio/SharedWebmAudioSource.js:65"); reject(error); }
                });
            }
            this.stoppedAt ??= performance.now();
            if (this.captureError) throw this.captureError;
            if (!this.chunks.length) {
                throw new Error('Không có dữ liệu ghi âm.');
            }
            return new Blob(this.chunks, { type: this.mimeType });
        })();
        return this.finishPromise;
    }

    stop() {
        // Luôn giải phóng micro khi dừng pipeline hoặc khi khởi tạo ghi âm gặp lỗi.
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
