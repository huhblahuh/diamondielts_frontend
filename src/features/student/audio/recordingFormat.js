const MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
];

export function selectRecordingMimeType(recorder = globalThis.MediaRecorder) {
    return MIME_TYPES.find(type => recorder?.isTypeSupported?.(type)) ?? null;
}

export function recordingExtension(blob) {
    const mimeType = blob.type.split(';')[0].trim().toLowerCase();
    if (mimeType === 'audio/webm') return 'webm';
    if (mimeType === 'audio/mp4') return 'mp4';
    throw new Error('Định dạng ghi âm không được hỗ trợ. Cần WebM hoặc MP4.');
}
