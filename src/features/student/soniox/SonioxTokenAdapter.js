export function finalizedText(tokens) {
    return tokens.map(token => token.text || '').join('').replace(/\s+/g, ' ').trim();
}

export function sonioxTokensToWords(tokens) {
    const words = [];
    let current = null;

    const flush = () => {
        if (!current) return;
        const text = current.text.trim();
        if (text && /[\p{L}\p{N}]/u.test(text)) {
            const confidence = current.confidences.length > 0
                ? current.confidences.reduce((sum, value) => sum + value, 0) / current.confidences.length
                : null;
            words.push({
                text,
                start_ms: current.startMs,
                end_ms: current.endMs,
                confidence,
                is_final: true,
                language: current.language
            });
        }
        current = null;
    };

    for (const token of tokens || []) {
        const text = token?.text || '';
        if (!token?.is_final || text === '<end>' || text === '<fin>') continue;

        for (const part of text.match(/\s+|[^\s]+/gu) || []) {
            if (/^\s+$/u.test(part)) {
                flush();
                continue;
            }
            if (!current) {
                current = {
                    text: '',
                    startMs: Number.isFinite(token.start_ms) ? token.start_ms : null,
                    endMs: Number.isFinite(token.end_ms) ? token.end_ms : null,
                    confidences: [],
                    language: token.language || null
                };
            }
            current.text += part;
            if (Number.isFinite(token.start_ms)) {
                current.startMs = current.startMs === null
                    ? token.start_ms : Math.min(current.startMs, token.start_ms);
            }
            if (Number.isFinite(token.end_ms)) {
                current.endMs = current.endMs === null
                    ? token.end_ms : Math.max(current.endMs, token.end_ms);
            }
            if (Number.isFinite(token.confidence)) current.confidences.push(token.confidence);
            current.language ||= token.language || null;
        }
    }

    flush();
    return words.filter(word => Number.isFinite(word.start_ms)
        && Number.isFinite(word.end_ms)
        && word.end_ms > word.start_ms);
}
