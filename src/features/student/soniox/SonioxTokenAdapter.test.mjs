import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizedText, sonioxTokensToWords } from './SonioxTokenAdapter.js';

test('final tokens keep word timestamps required by the speaking submission', () => {
    const tokens = [
        { text: 'Hello', start_ms: 100, end_ms: 300, is_final: true, confidence: 0.9 },
        { text: ' ', is_final: true },
        { text: 'world', start_ms: 350, end_ms: 600, is_final: true, confidence: 0.8 },
        { text: '<fin>', is_final: true },
        { text: 'guess', start_ms: 610, end_ms: 700, is_final: false }
    ];
    assert.equal(finalizedText(tokens.filter(token => token.is_final && token.text !== '<fin>')), 'Hello world');
    assert.deepEqual(sonioxTokensToWords(tokens).map(({ text, start_ms, end_ms, is_final }) => ({
        text, start_ms, end_ms, is_final
    })), [
        { text: 'Hello', start_ms: 100, end_ms: 300, is_final: true },
        { text: 'world', start_ms: 350, end_ms: 600, is_final: true }
    ]);
});
