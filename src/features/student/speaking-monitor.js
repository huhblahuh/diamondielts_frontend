const API = 'https://diamond-speaking-monitor.diamondsielts.workers.dev/api/events';

const ERROR_CODES = new Set([
    'MIC_PERMISSION_DENIED', 'MIC_RECORDING_FAILED', 'SONIOX_TIMEOUT',
    'SONIOX_WS_CLOSED', 'SONIOX_NO_TRANSCRIPT', 'AZURE_SPEECH_FAILED',
    'API_TIMEOUT', 'SUBMISSION_FAILED', 'NETWORK_ERROR', 'UNKNOWN'
]);

export function createAttempt(mode = 'legacy') {
    return { attemptId: crypto.randomUUID(), mode, finished: false, pending: Promise.resolve() };
}

export function logSpeaking(attempt, status, errorCode = null) {
    if (!attempt) return Promise.resolve();
    attempt.pending = attempt.pending.then(async () => {
        try {
            const response = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify({
                    attemptId: attempt.attemptId,
                    mode: attempt.mode,
                    status,
                    ...(status === 'FAILED' ? { errorCode: ERROR_CODES.has(errorCode) ? errorCode : 'UNKNOWN' } : {})
                })
            });
            if (!response.ok) console.warn('Speaking monitor failed:', response.status);
        } catch (error) {
            console.warn('Cannot send monitoring event:', error);
        }
    });
    return attempt.pending;
}

export function finishAttempt(attempt, status, errorCode = null) {
    if (!attempt || attempt.finished) return;
    attempt.finished = true;
    void logSpeaking(attempt, status, errorCode);
}

export function speakingErrorCode(error, fallback = 'UNKNOWN') {
    const code = error?.errorCode || error?.response?.data?.errorCode || error?.response?.data?.code || error?.code;
    if (ERROR_CODES.has(code)) return code;
    const message = String(error?.message || '').toLowerCase();
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') return 'MIC_PERMISSION_DENIED';
    if (/soniox/.test(message) && /quá thời gian|timeout|timed out/.test(message)) return 'SONIOX_TIMEOUT';
    if (/websocket|socket|connection closed|kết nối.*đóng/.test(message)) return 'SONIOX_WS_CLOSED';
    if (/transcript|timestamps/.test(message)) return 'SONIOX_NO_TRANSCRIPT';
    if (/azure.*speech/.test(message)) return 'AZURE_SPEECH_FAILED';
    if (/timeout|timed out|quá thời gian/.test(message) || code === 'ECONNABORTED') return 'API_TIMEOUT';
    if (code === 'ERR_NETWORK' || /network|failed to fetch/.test(message)) return 'NETWORK_ERROR';
    return fallback;
}

