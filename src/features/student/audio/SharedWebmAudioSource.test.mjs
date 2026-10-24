import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedWebmAudioSource } from './SharedWebmAudioSource.js';

test('final recorder chunk is sent once and in order before finalization', async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
    const stoppedTracks = [];
    const sent = [];
    class Recorder extends EventTarget {
        static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
        constructor() { super(); this.state = 'inactive'; }
        start() { this.state = 'recording'; }
        emitChunk(value, waitMs) {
            const data = new Blob([Uint8Array.of(value)]);
            const read = data.arrayBuffer.bind(data);
            data.arrayBuffer = async () => {
                await new Promise(resolve => setTimeout(resolve, waitMs));
                return read();
            };
            this.ondataavailable({ data });
        }
        stop() {
            this.emitChunk(3, 0);
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
        await source.start({ onData: data => sent.push(new Uint8Array(data)[0]), onError: error => { throw error; } });
        source.recorder.emitChunk(1, 20);
        source.recorder.emitChunk(2, 0);
        const audioBlob = await source.finishCaptureAndFlush();
        await source.finishCaptureAndFlush();
        assert.deepEqual(sent, [1, 2, 3]);
        assert.deepEqual([...new Uint8Array(await audioBlob.arrayBuffer())], [1, 2, 3]);
        assert.equal(source.chunksSent, 3);
        source.stop();
        assert.equal(stoppedTracks.length, 1);
    } finally {
        if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
        else delete globalThis.navigator;
        if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder);
        else delete globalThis.MediaRecorder;
    }
});
