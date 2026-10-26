const STORAGE_KEY = 'speaking-debug-log-v1';
const MAX_ENTRIES = 500;
const listeners = new Set();

export const speakingDebugEnabled = new URLSearchParams(globalThis.location?.search || '')
    .get('speakingDebug') === '1';

function readStoredEntries() {
    if (!speakingDebugEnabled) return [];
    try {
        const entries = JSON.parse(globalThis.sessionStorage?.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(entries) ? entries.slice(-MAX_ENTRIES) : [];
    } catch {
        return [];
    }
}

let entries = readStoredEntries();

export function getSpeakingDiagnostics() {
    return entries.slice();
}

export function subscribeSpeakingDiagnostics(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function clearSpeakingDiagnostics() {
    entries = [];
    try { globalThis.sessionStorage?.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    listeners.forEach(listener => listener());
}

export function logSpeakingDiagnostic(event, details = {}) {
    if (!speakingDebugEnabled) return;
    // Call sites pass counters, states and error codes only. Never log keys,
    // transcript text, audio bytes, or request payloads.
    const entry = {
        time: new Date().toISOString(),
        event,
        ...details,
    };
    entries = [...entries, entry].slice(-MAX_ENTRIES);
    try { globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* storage unavailable */ }
    console.info('[Speaking debug]', entry);
    listeners.forEach(listener => listener());
}

export function formatSpeakingDiagnostics() {
    return entries.map(entry => JSON.stringify(entry)).join('\n');
}
