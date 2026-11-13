import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedWebmAudioSource } from './SharedWebmAudioSource.js';

for (const mimeType of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4']) {
test(`${mimeType}: includes the final chunk once and in order in the recording file`, async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
    const stoppedTracks = [];
    class Recorder extends EventTarget {
        static isTypeSupported(type) { return type === mimeType; }
        constructor(stream, options) {
            super();
            assert.equal(options.mimeType, mimeType);
            this.mimeType = options.mimeType;
            this.state = 'inactive';
        }
        start() { this.state = 'recording'; }
        emitChunk(value) {
            this.ondataavailable({ data: new Blob([Uint8Array.of(value)]) });
        }
        stop() {
            this.emitChunk(3);
            this.state = 'inactive';
            queueMicrotask(() => this.dispatchEvent(new Event('stop')));
        }
    }
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({
        getTracks: () => [{ stop: () => stoppedTracks.push(true) }]
    }) } } });
    Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: Recorder });
    try {
        const source = new SharedWebmAudioSource();
        await source.start({ onError: error => { throw error; } });
        source.recorder.emitChunk(1);
        source.recorder.emitChunk(2);
        const audioBlob = await source.finishCaptureAndFlush();
        await source.finishCaptureAndFlush();
        assert.deepEqual([...new Uint8Array(await audioBlob.arrayBuffer())], [1, 2, 3]);
        assert.equal(audioBlob.type, mimeType);
        source.stop();
        assert.equal(stoppedTracks.length, 1);
    } finally {
        if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
        else delete globalThis.navigator;
        if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder);
        else delete globalThis.MediaRecorder;
    }
});
}
