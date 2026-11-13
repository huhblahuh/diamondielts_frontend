import test from 'node:test';
import assert from 'node:assert/strict';
import { speakingSubmissionNotice } from './speakingSubmissionNotice.js';

test('submission notices do not expose backend diagnostics or claim a lost response means the submission failed', () => {
    const notice = speakingSubmissionNotice({ message: 'Internal database failure: private-details' });
    assert.doesNotMatch(notice, /private-details|database/);
    assert.match(notice, /Chưa xác nhận/);
    assert.match(notice, /kiểm tra lịch sử/);
    assert.match(notice, /Bản ghi vẫn được giữ/);
});

test('an active submission tells the student to check history instead of resubmitting', () => {
    const notice = speakingSubmissionNotice({ code: 'SUBMISSION_IN_PROGRESS', status: 409 });
    assert.match(notice, /đang được xử lý/);
    assert.doesNotMatch(notice, /nộp lại|thử lại/);
});
