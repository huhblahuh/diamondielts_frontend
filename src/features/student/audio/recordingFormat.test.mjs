import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingExtension, selectRecordingMimeType } from './recordingFormat.js';

test('prefers WebM/Opus when both WebM and MP4 are supported', () => {
    assert.equal(selectRecordingMimeType({ isTypeSupported: () => true }), 'audio/webm;codecs=opus');
});

test('falls back to MP4 on browsers without WebM', () => {
    assert.equal(selectRecordingMimeType({ isTypeSupported: type => type === 'audio/mp4' }), 'audio/mp4');
});

test('returns no format when MediaRecorder or supported formats are unavailable', () => {
    assert.equal(selectRecordingMimeType(null), null);
    assert.equal(selectRecordingMimeType({}), null);
    assert.equal(selectRecordingMimeType({ isTypeSupported: () => false }), null);
});

test('upload extensions match the Blob container including codec parameters', () => {
    for (const type of ['audio/webm', 'audio/webm;codecs=opus']) {
        assert.equal(recordingExtension(new Blob(['audio'], { type })), 'webm');
    }
    for (const type of ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2']) {
        assert.equal(recordingExtension(new Blob(['audio'], { type })), 'mp4');
    }
    assert.throws(() => recordingExtension(new Blob(['audio'], { type: 'audio/wav' })));
});
