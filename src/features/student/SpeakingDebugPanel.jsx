import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    clearSpeakingDiagnostics,
    formatSpeakingDiagnostics,
    getSpeakingDiagnostics,
    logSpeakingDiagnostic,
    speakingDebugEnabled,
    subscribeSpeakingDiagnostics,
} from './speakingDiagnostics';

export default function SpeakingDebugPanel() {
    const [entries, setEntries] = useState(getSpeakingDiagnostics);
    const [open, setOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState('');
    const textRef = useRef(null);

    useEffect(() => {
        if (!speakingDebugEnabled) return undefined;
        const unsubscribe = subscribeSpeakingDiagnostics(() => setEntries(getSpeakingDiagnostics()));
        logSpeakingDiagnostic('debug_view_opened', {
            userAgent: navigator.userAgent,
            secureContext: window.isSecureContext,
            webmOpusSupported: window.MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus') ?? false,
        });
        const logEnvironment = () => logSpeakingDiagnostic('browser_state', {
            online: navigator.onLine,
            visibility: document.visibilityState,
        });
        document.addEventListener('visibilitychange', logEnvironment);
        window.addEventListener('online', logEnvironment);
        window.addEventListener('offline', logEnvironment);
        logEnvironment();
        return () => {
            unsubscribe();
            document.removeEventListener('visibilitychange', logEnvironment);
            window.removeEventListener('online', logEnvironment);
            window.removeEventListener('offline', logEnvironment);
        };
    }, []);

    if (!speakingDebugEnabled) return null;

    const copyLogs = async () => {
        const text = formatSpeakingDiagnostics();
        try {
            await navigator.clipboard.writeText(text);
            setCopyStatus('Đã sao chép log');
        } catch {
            textRef.current?.focus();
            textRef.current?.select();
            setCopyStatus('Đã chọn log; hãy dùng lệnh Sao chép của trình duyệt');
        }
    };

    return createPortal(
        <aside style={{
            position: 'fixed', right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
            zIndex: 2147483647, width: open ? 'min(94vw, 520px)' : 'auto',
            background: '#0f172a', color: '#f8fafc', borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,.35)', padding: 10,
            fontSize: 13,
        }}>
            <button type="button" onClick={() => setOpen(value => !value)}
                style={{ color: '#fff', background: '#334155', border: 0, borderRadius: 8, padding: '8px 12px' }}>
                {open ? 'Đóng debug' : `Debug âm thanh (${entries.length})`}
            </button>
            {open && <>
                <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                    <button type="button" onClick={copyLogs}>Sao chép log</button>
                    <button type="button" onClick={() => { clearSpeakingDiagnostics(); setCopyStatus('Đã xóa log'); }}>Xóa log</button>
                </div>
                {copyStatus && <div role="status">{copyStatus}</div>}
                <textarea ref={textRef} readOnly value={formatSpeakingDiagnostics()}
                    aria-label="Log debug âm thanh"
                    style={{ width: '100%', height: 'min(42vh, 360px)', resize: 'none',
                        background: '#020617', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }} />
            </>}
        </aside>, document.body
    );
}
