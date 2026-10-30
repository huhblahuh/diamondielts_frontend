export function addSpeakingHistoryCard(history, event) {
    if (!['Checking', 'Grading'].includes(event?.displayStatus)
        || !Number(event.submissionId)) return history;

    const submissionId = Number(event.submissionId);
    const status = event.displayStatus === 'Grading' ? 'Grading' : 'Pending';
    const existing = history.find(item => Number(item.submissionId) === submissionId);
    if (existing) {
        if (existing.status !== 'Pending' || status !== 'Grading') return history;
        return history.map(item => Number(item.submissionId) === submissionId
            ? { ...item, status: 'Grading' } : item);
    }

    const attemptNumber = Math.max(0, ...history.map(item => Number(item.attemptNumber) || 0)) + 1;
    return [{
        submissionId,
        attemptNumber,
        status,
        createdAt: event.occurredAt || new Date().toISOString(),
        overallScore: null,
        payloads: [],
        feedbackPayloads: [],
    }, ...history];
}
