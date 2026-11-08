import * as Sentry from '@sentry/react';
import { sanitizeEvent, sanitizeBreadcrumb, reportHandledError, safeUrl } from './utils/errorReporting.js';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const configuredTraceRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '');
const traceRate = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE?.trim()
    && Number.isFinite(configuredTraceRate) && configuredTraceRate >= 0 && configuredTraceRate <= 1
    ? configuredTraceRate : import.meta.env.PROD ? 0.1 : 1;

if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
        integrations: [Sentry.browserTracingIntegration()],
        sampleRate: 1,
        tracesSampleRate: traceRate,
        sendDefaultPii: false,
        beforeSend: sanitizeEvent,
        beforeBreadcrumb: sanitizeBreadcrumb,
        beforeSendTransaction: sanitizeEvent,
        beforeSendSpan: span => sanitizeEvent(span),
    });

    // Resource errors do not bubble and are not JavaScript exceptions. Capture
    // image/audio/script failures separately, without file contents or signed URLs.
    window.addEventListener('error', event => {
        const target = event.target;
        if (!['IMG', 'AUDIO', 'VIDEO', 'SCRIPT', 'LINK'].includes(target?.tagName)) return;
        reportHandledError(new Error(`Resource load failed: ${target.tagName}`), 'resource.load', {
            source: 'resource', element: target.tagName,
            url: safeUrl(target.currentSrc || target.src || target.href || ''),
            media_error_code: target.error?.code,
        });
    }, true);
}
