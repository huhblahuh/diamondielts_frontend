export const normalizeSpeakingContent = (value) => {
    let content = value;
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content);
        } catch {
            content = {};
        }
    }
    return {
        question: typeof content?.question === 'string' ? content.question.trim() : '',
        suggestions: Array.isArray(content?.suggestions)
            ? content.suggestions.map(item => String(item).trim()).filter(Boolean)
            : []
    };
};

export const makeSpeakingContent = (question, suggestions = [], type = 'Part 1') => ({
    question: String(question || '').trim(),
    suggestions: type === 'Part 2'
        ? suggestions.map(item => String(item).trim()).filter(Boolean)
        : []
});

export const getSpeakingPrompt = (content) => {
    const normalized = normalizeSpeakingContent(content);
    if (normalized.suggestions.length === 0) return normalized.question;
    return `${normalized.question}\nYou should say:\n${normalized.suggestions.map(item => `- ${item}`).join('\n')}`;
};
