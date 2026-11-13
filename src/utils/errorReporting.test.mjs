import test from 'node:test';
import assert from 'node:assert/strict';
import * as Sentry from '@sentry/react';
import {
    reportHandledError, reportApiError, sanitizeEvent, sanitizeBreadcrumb, safeUrl,
    setReportUser, syncReportUser,
} from './errorReporting.js';

const events = [];
Sentry.init({
    dsn: 'https://public@example.invalid/1',
    defaultIntegrations: false,
    beforeSend: sanitizeEvent,
    transport: () => ({
        send: async envelope => {
            for (const [header, event] of envelope[1]) if (header.type === 'event') events.push(event);
            return { statusCode: 200 };
        },
        flush: async () => true,
    }),
});

test('API failure contains debugging metadata, excludes payloads, and is not duplicated by a UI catch', async () => {
    events.length = 0;
    const normalized = { message: 'popup message', status: 500 };
    const apiError = {
        stack: 'AxiosError: Request failed\n    at submitSpeaking (https://app.example.com/assets/speaking.js:42:7)',
        config: { method: 'post', url: '/student/submissions/speaking?token=private-token',
            headers: { Authorization: 'Bearer private-key' }, data: { audio: 'private-audio' } },
        response: { status: 500, headers: { 'x-request-id': 'request-123' },
            data: { code: 'SUBMISSION_FAILED', traceId: 'trace-123', message: 'private-message', transcript: 'private-transcript' } },
    };
    reportApiError(apiError, normalized);
    reportHandledError(normalized, 'SpeakingPractice.submit');
    reportHandledError(apiError, 'outer.catch');
    await Sentry.flush(2000);
    assert.equal(events.length, 1);
    assert.equal(events[0].contexts.failure.status, 500);
    assert.equal(events[0].contexts.failure.response_code, 'SUBMISSION_FAILED');
    assert.equal(events[0].contexts.failure.request_id, 'request-123');
    assert.equal(events[0].contexts.failure.endpoint, '/student/submissions/speaking');
    assert.equal(events[0].tags.error_source, 'api');
    assert.ok(events[0].exception.values[0].stacktrace.frames.some(frame =>
        frame.function === 'submitSpeaking' && frame.lineno === 42));
    assert.doesNotMatch(JSON.stringify(events), /private-|popup message/);
});

test('HTTP 400/401/403/429 and network errors are recorded; deliberate cancellation is skipped', async () => {
    events.length = 0;
    for (const status of [400, 401, 403, 429]) {
        reportApiError({ config: { method: 'get', url: '/test' }, response: { status } }, {});
    }
    reportApiError({ config: { method: 'post', url: '/test' }, code: 'ERR_NETWORK' }, {});
    const cancellation = {};
    reportApiError({ code: 'ERR_CANCELED' }, cancellation);
    reportHandledError(cancellation, 'cancel.catch');
    reportHandledError({ name: 'AbortError' }, 'abort.catch');
    await Sentry.flush(2000);
    assert.equal(events.length, 5);
    assert.equal(events.at(-1).contexts.failure.network_code, 'ERR_NETWORK');
});

test('handled errors retain the original stack, are deduplicated, and remain separate for separate failures', async () => {
    events.length = 0;
    const error = new TypeError('microphone failure');
    reportHandledError(error, 'audio.start');
    reportHandledError(error, 'speaking.start');
    reportHandledError(new TypeError('microphone failure'), 'audio.start');
    await Sentry.flush(2000);
    assert.equal(events.length, 2);
    assert.equal(events[0].exception.values[0].type, 'TypeError');
    assert.ok(events[0].exception.values[0].stacktrace.frames.some(frame => frame.filename?.includes('errorReporting.test.mjs')));
    assert.equal(sanitizeEvent({ tags: {} }, { originalException: error }), null);
});

test('scrubbing removes credentials, request bodies, personal fields and URL parameters without mutating inputs', () => {
    const event = {
        user: { email: 'student@example.com' },
        request: { url: 'https://user:password@api.example.com/test?token=secret#secret', headers: { Authorization: 'secret' }, data: 'secret' },
        extra: { password: 'secret', transcript: 'secret', message: 'Bearer abc123 student@example.com' },
        exception: { values: [{ type: 'SyntaxError', value: 'Unexpected private input', stacktrace: { frames: [{ vars: { password: 'secret' } }] } }] },
    };
    const clean = sanitizeEvent(event);
    assert.equal(clean.request.url, 'https://api.example.com/test');
    assert.equal(clean.user, undefined);
    assert.equal(clean.request.headers, undefined);
    assert.equal(clean.exception.values[0].stacktrace.frames[0].vars, undefined);
    assert.doesNotMatch(JSON.stringify(clean), /secret|abc123|student@example|private input/);
    assert.equal(event.extra.password, 'secret');
    assert.equal(safeUrl('/test?token=secret#secret'), '/test');
    assert.equal(sanitizeBreadcrumb({ category: 'console', message: 'private' }), null);
    const breadcrumb = sanitizeBreadcrumb({ category: 'fetch', data: { url: '/api/test?secret=abc', method: 'POST', status_code: 500, body: 'secret' } });
    assert.deepEqual(breadcrumb.data, { url: '/api/test', method: 'POST', status_code: 500 });
});

test('only an internal numeric account ID survives the user filter', () => {
    const event = { user: { id: 123, email: 'private@example.com', username: 'private-name', ip_address: '127.0.0.1' } };
    assert.deepEqual(sanitizeEvent(event).user, { id: '123' });
    assert.equal(event.user.email, 'private@example.com');
    for (const id of [null, '', 0, -1, 'private@example.com', {}, '1.5']) {
        assert.equal(sanitizeEvent({ user: { id } }).user, undefined);
    }
});

test('reports restore a stored account, change accounts and clear identity when the session ends', async () => {
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const stored = new Map([
        ['token', 'private-token'],
        ['user', JSON.stringify({ userId: 123, email: 'private@example.com', fullName: 'private-name' })],
    ]);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: key => stored.get(key) ?? null,
    } });
    try {
        events.length = 0;
        syncReportUser();
        reportHandledError(new Error('restored session'), 'test');
        setReportUser(456);
        reportHandledError(new Error('new session'), 'test');
        setReportUser(null);
        reportHandledError(new Error('logged out'), 'test');
        stored.delete('token');
        syncReportUser();
        reportHandledError(new Error('missing token'), 'test');
        stored.set('token', 'private-token');
        stored.set('user', '{invalid json');
        syncReportUser();
        reportHandledError(new Error('invalid storage'), 'test');
        await Sentry.flush(2000);
        assert.deepEqual(events.map(event => event.user), [{ id: '123' }, { id: '456' }, undefined, undefined, undefined]);
        assert.doesNotMatch(JSON.stringify(events), /private-token|private@example|private-name/);
    } finally {
        setReportUser(null);
        if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
        else delete globalThis.localStorage;
    }
});
