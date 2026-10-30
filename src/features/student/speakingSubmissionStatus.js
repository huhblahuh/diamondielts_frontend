export const isRejectedOffTopic = status =>
    status?.toLowerCase() === 'rejectedofftopic';

export const isFailedSpeakingSubmission = status =>
    status?.toLowerCase() === 'failed';

export const isUnviewableSpeakingSubmission = status =>
    ['pending', 'grading'].includes(status?.toLowerCase())
    || isFailedSpeakingSubmission(status)
    || isRejectedOffTopic(status);

export const offTopicSubmissionMessage = 'Bài nói không được tính lượt nộp do nói lạc đề.';
