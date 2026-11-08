import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { transform } from 'esbuild';
import axios from 'axios';

test('Axios reporting preserves success, popup error fields, and expired-session cleanup', async () => {
    // Only replace Vite's build-time DEV flag; exercise the real Axios interceptors.
    const source = await readFile(new URL('./axiosClient.js', import.meta.url), 'utf8');
    const { code } = await transform(source, { format: 'esm', define: { 'import.meta.env.DEV': 'false' } });
    const moduleUrl = new URL(`./.axios-sentry-test-${process.pid}.mjs`, import.meta.url);
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: key => storage.get(key) || null, removeItem: key => storage.delete(key),
    } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/login' } } });
    try {
        await writeFile(moduleUrl, code);
        const { default: client } = await import(moduleUrl.href);
        const success = await client.get('/test', { adapter: async config => ({ status: 200, config, headers: {}, data: { ok: true } }) });
        assert.deepEqual(success, { ok: true });

        storage.set('token', 'test-token');
        storage.set('user', 'test-user');
        const fail = status => client.post('/test', {}, { adapter: async config => {
            assert.equal(config.headers.Authorization, 'Bearer test-token');
            throw new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
                status, config, headers: {}, data: { code: 'TEST_FAILURE', message: 'Popup explanation', canRetry: true },
            });
        } });
        await assert.rejects(fail(422), error => {
            assert.deepEqual(error, { status: 422, code: 'TEST_FAILURE', message: 'Popup explanation', canRetry: true, requestId: undefined });
            return true;
        });
        await assert.rejects(fail(401));
        assert.equal(storage.has('token'), false);
        assert.equal(storage.has('user'), false);
    } finally {
        await unlink(moduleUrl).catch(() => {});
        if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
        else delete globalThis.localStorage;
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else delete globalThis.window;
    }
});
