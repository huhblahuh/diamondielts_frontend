// Keep API messages and diagnostic codes in telemetry, not in the recording UI.
export function speakingSubmissionNotice(error = {}) {
    if (error.code === 'SUBMISSION_IN_PROGRESS') {
        return 'Bài nói đang được xử lý. Bạn có thể kiểm tra trong lịch sử.';
    }
    if (['NO_SPEECH', 'INVALID_AUDIO', 'OFF_TOPIC'].includes(error.code)) {
        return 'Bản ghi chưa phù hợp để xử lý. Hãy nghe lại và ghi âm lại bài nói.';
    }
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403) return 'Bạn chưa có quyền nộp bài nói này.';
    if (error.status === 429 || error.status === 503) {
        return 'Hiện chưa thể nhận thêm bài nói. Bản ghi vẫn được giữ ở đây; vui lòng thử lại sau.';
    }
    if (error.status === 400 || error.status === 422) {
        return 'Chưa thể nhận bản ghi này. Hãy kiểm tra bài tập và nghe lại bản ghi trước khi thử lại.';
    }
    return 'Chưa xác nhận được bài nộp. Bản ghi vẫn được giữ ở đây; hãy kiểm tra lịch sử trước khi nộp lại.';
}
