import * as Sentry from '@sentry/react';

const reported = new WeakSet();
const privateKey = /authorization|cookie|password|passwd|secret|token|email|phone|transcript|prompt|recording|audio|requestbody|responsebody|^body$|^data$|^headers$|^user$/i;
const safeIdentifier = value => typeof value === 'string' && /^[\w:.-]{1,150}$/.test(value) ? value : undefined;

export function scrubText(value) {
    return String(value)
        .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [Filtered]')
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g, '[Filtered]')
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Filtered]')
        .replace(/((?:password|passwd|secret|token|api[_-]?key)\s*[=:]\s*)[^\s&,;]+/gi, '$1[Filtered]')
        .replace(/https?:\/\/[^\s"'<>]+/gi, url => safeUrl(url))
        .slice(0, 2000);
}

export function safeUrl(value) {
    try {
        const url = new URL(String(value), 'https://local.invalid');
        const path = url.pathname.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Filtered]');
        return url.origin === 'https://local.invalid' ? path : `${url.origin}${path}`;
    } catch {
        return '[Invalid URL]';
    }
}

function scrub(value, depth = 0) {
    if (depth > 10) return '[Truncated]';
    if (typeof value === 'string') return scrubText(value);
    if (Array.isArray(value)) return value.map(item => scrub(item, depth + 1));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key, privateKey.test(key) ? '[Filtered]'
                : /(?:^|\.)(?:url|from|to)$/.test(key) && typeof item === 'string' ? safeUrl(item)
                    : scrub(item, depth + 1),
        ]));
    }
    return value;
}

export function sanitizeEvent(event, hint = {}) {
    // A caught error may subsequently be rethrown. Keep the explicit report only.
    if (hint.originalException && reported.has(hint.originalException) && !event.tags?.error_source) return null;
    const clean = scrub(event);
    delete clean.user;
    if (clean.request) {
        clean.request = { url: safeUrl(event.request?.url || ''), method: event.request?.method };
    }
    if (clean.exception?.values) {
        for (const exception of clean.exception.values) {
            // JSON parse errors can quote an entire input, including account data.
            if (exception.type === 'SyntaxError') exception.value = 'SyntaxError (input omitted)';
            for (const frame of exception.stacktrace?.frames || []) delete frame.vars;
        }
    }
    return clean;
}

export function sanitizeBreadcrumb(breadcrumb) {
    // Legacy console output and DOM labels can include arbitrary application data.
    if (breadcrumb.category === 'console' || breadcrumb.category?.startsWith('ui.')) return null;
    const clean = scrub(breadcrumb);
    if (breadcrumb.data) {
        clean.data = {};
        for (const key of ['url', 'from', 'to']) {
            if (typeof breadcrumb.data[key] === 'string') clean.data[key] = safeUrl(breadcrumb.data[key]);
        }
        for (const key of ['method', 'status_code']) {
            if (breadcrumb.data[key] != null) clean.data[key] = scrub(breadcrumb.data[key]);
        }
    }
    return clean;
}

export function isCancellation(error) {
    return error?.name === 'AbortError' || error?.name === 'CanceledError'
        || error?.code === 'ERR_CANCELED' || error?.__CANCEL__ === true;
}

export function markErrorReported(error) {
    if (error && (typeof error === 'object' || typeof error === 'function')) reported.add(error);
}

export function reportHandledError(error, location, details = {}) {
    try {
        if (!Sentry.getClient() || isCancellation(error)) return;
        if (error && typeof error === 'object' && reported.has(error)) return;
        markErrorReported(error);
        // Copy only message/stack; Axios errors contain headers, payloads and files.
        const exception = new Error(scrubText(error?.message || (typeof error === 'string' ? error : 'Handled application error')));
        exception.name = error?.name || 'HandledError';
        if (typeof error?.stack === 'string') exception.stack = error.stack;
        return Sentry.captureException(exception, {
            tags: { error_source: details.source || 'handled', error_location: location },
            contexts: { failure: scrub({
                error_code: safeIdentifier(error?.code),
                request_id: safeIdentifier(error?.request_id || error?.requestId),
                ...details,
            }) },
            ...(details.source === 'api' ? { fingerprint: [
                'api', details.method, details.endpoint.replace(/\/[0-9]+(?=\/|$)/g, '/:id'),
                String(details.status || details.network_code || 'NETWORK_ERROR'), details.response_code || '',
            ] } : {}),
        });
    } catch {
        // Monitoring must never interrupt the application's original error handling.
    }
}

export function reportApiError(error, normalizedError) {
    try {
        if (isCancellation(error)) {
            markErrorReported(normalizedError);
            return;
        }
        const status = error.response?.status;
        const method = String(error.config?.method || 'unknown').toUpperCase();
        const endpoint = safeUrl(error.config?.url || '');
        const code = error.response?.data?.code;
        reportHandledError(new Error(`API ${method} ${endpoint}: ${status || error.code || 'NETWORK_ERROR'}`), 'axios.response', {
            source: 'api', method, endpoint, status,
            network_code: safeIdentifier(error.code), response_code: safeIdentifier(code),
            request_id: safeIdentifier(error.response?.data?.requestId
                || error.response?.headers?.['x-request-id'] || error.config?.headers?.['X-Request-ID']),
            trace_id: safeIdentifier(error.response?.data?.traceId),
        });
        markErrorReported(error);
        markErrorReported(normalizedError);
    } catch {
        // Preserve API behavior even if telemetry fails.
    }
}
