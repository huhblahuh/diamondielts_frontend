import React from 'react';
import styles from './AssignmentDetailPage.module.css';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import CommonAttachmentUploader from '../../components/CommonAttachmentUploader';
import { QuestionMarquee } from './AssignmentQuestionMarquee';
import { cleanFileName, countOccupiedSpeakingAttempts, detectPartNumber, formatDateTime, hasCompletedSpeakingAttempt, isSpeakingItem, truncateText } from './assignmentDetailUtils';
import { isFailedSpeakingSubmission, isRejectedOffTopic, isUnviewableSpeakingSubmission } from '../../features/student/speakingSubmissionStatus';

export default function AssignmentTaskCard({
    item, index, itemDetail, itemHistory, isOpen, isClosing,
    detailLoading, detailError, pendingFiles, editingSubmissionId,
    isSubmitting, isBlockedByDeadline, onToggle, onRetry,
    onFileChange, onSaveEditedFile, onSubmitFile, onCancelEdit,
    onViewSubmission, onEditFile, onRemoveFile, onStartSpeaking,
}) {
    const isSpeaking = isSpeakingItem(item);
    const isDone = item.hasSubmission || (isSpeaking
        ? hasCompletedSpeakingAttempt(itemHistory) : itemHistory.length > 0);
    const partNum = detectPartNumber(item.type || item.itemType);
    const isPart2 = isSpeaking && partNum === 2;
    const partLabel = isSpeaking ? `Part ${partNum}` : 'Tự luận';
    const content = normalizeSpeakingContent(itemDetail?.content || item.content);
    const questionText = content.question || item.description || item.title || (isSpeaking ? `Speaking Exercise ${index + 1}` : 'Nộp bài tự luận');
    const cueList = content.suggestions || [];
    const attemptCount = isSpeaking ? countOccupiedSpeakingAttempts(itemHistory) : itemHistory.length;
    const maxAttemptsText = item.maxAttempts || '∞';
    const scoredAttempt = itemHistory.find(attempt => attempt.overallScore != null);
    const viewableAttempt = itemHistory.find(attempt => !isSpeaking || !isUnviewableSpeakingSubmission(attempt.status));
    const bandScore = scoredAttempt ? Number(scoredAttempt.overallScore).toFixed(1) : null;

    return (
        <article
            className={`${styles.task} ${isDone ? styles.taskIsDone : ''} ${isOpen ? styles.taskIsOpen : ''} ${isClosing ? styles.taskIsClosing : ''} ${!isSpeaking ? styles.taskFile : ''}`}
        >
            <button
                className={styles.taskHeader}
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggle(item.itemId)}
            >
                <div className={styles.taskHeaderTop}>
                    <div className={styles.taskHeaderTopLeft}>
                        <div className={`${styles.taskNumber} ${!isSpeaking ? styles.taskNumberFile : ''}`}>
                            {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className={styles.taskTopline}>
                            {isSpeaking ? (
                                <>
                                    <span className={`${styles.taskType} ${styles.taskTypeDesktop}`}>
                                        Bài nói · {partLabel}
                                    </span>
                                    <span className={`${styles.taskType} ${styles.taskTypeMobile}`}>
                                        Speaking
                                    </span>
                                </>
                            ) : (
                                <span className={styles.taskTypeFile}>Nộp file</span>
                            )}
                            <span className={styles.taskDot}>•</span>
                            <span className={styles.taskState}>
                                {isDone ? 'Đã có bài nộp' : 'Chưa thực hiện'}
                            </span>
                        </div>
                    </div>

                    <span className={styles.chev} aria-label={isOpen ? "Thu gọn" : "Mở rộng"}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </span>
                </div>

                <QuestionMarquee text={questionText} />

                <div className={styles.taskMetrics}>
                    <span className={styles.attemptPill}>
                        {itemDetail
                            ? `${attemptCount}/${maxAttemptsText} lần nộp`
                            : item.hasSubmission ? 'Đã nộp' : `0/${maxAttemptsText} lần nộp`}
                    </span>
                    {bandScore && (
                        <span className={styles.bandPill}>Band {bandScore}</span>
                    )}
                    {isSpeaking && (
                        <span className={styles.partPill}>{partLabel}</span>
                    )}
                </div>
            </button>

            <div
                className={`${styles.taskPanelWrapper} ${isOpen ? styles.taskPanelOpen : ''}`}
                aria-hidden={!isOpen}
            >
                {(isOpen || isClosing) && (
                <div className={styles.taskPanelInner}>
                    <div className={styles.taskPanel}>
                    {detailLoading && !itemDetail ? (
                        <div className={styles.loadingBox}>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Đang tải chi tiết hạng mục...
                        </div>
                    ) : detailError && !itemDetail ? (
                        <div className="alert alert-danger m-3 d-flex align-items-center justify-content-between">
                            <span>{detailError}</span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onRetry(item.itemId, true)}
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : (
                        <div className={styles.panelInner}>
                            <div>
                                {/* Prompt Box */}
                                <div className={styles.promptBox}>
                                    <strong>Yêu cầu câu hỏi</strong>
                                    <span title={questionText}>{truncateText(questionText)}</span>
                                    {!isPart2 && cueList.length > 0 && (
                                        <div style={{ marginTop: '10px' }}>
                                            <em>You should say:</em>
                                            <ul className={styles.cueList}>
                                                {cueList.map((cue, idx) => (
                                                    <li key={idx}>{cue}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Teacher Attachments */}
                                {itemDetail?.payloads && itemDetail.payloads.length > 0 && (
                                    <div className={styles.attachmentsSection}>
                                        <div className={styles.attachmentsTitle}>
                                            <i className="bi bi-paperclip"></i> Tài liệu đính kèm của giáo viên:
                                        </div>
                                        <div className={styles.attachmentItems}>
                                            {itemDetail.payloads.map((payload, idx) => {
                                                const fileName = payload.originalFileName || cleanFileName(payload.dataValue);
                                                return (
                                                    <a
                                                        key={idx}
                                                        href={payload.downloadUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.attachmentBtn}
                                                        title="Bấm để tải về"
                                                    >
                                                        <i className="bi bi-file-earmark-arrow-down-fill text-primary"></i>
                                                        <span className="text-truncate">{fileName}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* File Submission specific upload UI */}
                                {!isSpeaking && (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                                                <i className="bi bi-cloud-arrow-up"></i> {editingSubmissionId ? 'Tải lên file thay thế:' : 'Tải lên bài làm:'}
                                            </p>
                                            <CommonAttachmentUploader
                                                attachments={pendingFiles || []}
                                                onAttachmentsChange={(files) => onFileChange(item.itemId, files)}
                                                disabled={isBlockedByDeadline || isSubmitting}
                                                placeholder="Kéo & thả tài liệu bài làm hoặc bấm để chọn file từ thiết bị"
                                            />
                                        </div>

                                        {editingSubmissionId ? (
                                            <div className="d-flex gap-2">
                                                <button
                                                    type="button"
                                                    className={styles.primary}
                                                    onClick={() => onSaveEditedFile(item.itemId, editingSubmissionId)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.secondary}
                                                    onClick={() => onCancelEdit()}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className={styles.primary}
                                                onClick={() => onSubmitFile(item.itemId)}
                                                disabled={isBlockedByDeadline || isSubmitting || !(pendingFiles?.length > 0)}
                                            >
                                                <i className="bi bi-cloud-arrow-up"></i>
                                                {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* History Rows */}
                                {itemHistory && itemHistory.length > 0 && (
                                    <div className={styles.historySection}>
                                        <div className={styles.historyTitle}>
                                            <i className="bi bi-clock-history"></i> Lịch sử bài làm đã nộp ({itemHistory.length})
                                        </div>
                                        <div className={styles.history}>
                                            {itemHistory.map((h) => {
                                                const canView = isSpeaking && !isUnviewableSpeakingSubmission(h.status);
                                                const bandDisplay = h.overallScore !== null && h.overallScore !== undefined
                                                    ? `Band ${Number(h.overallScore).toFixed(1)}`
                                                    : (h.status === 'Completed' ? 'Đã chấm'
                                                        : isFailedSpeakingSubmission(h.status) ? 'Xử lý thất bại'
                                                            : isRejectedOffTopic(h.status) ? 'Bài nói lạc đề' : 'Đang xử lý');
                                                return (
                                                    <div
                                                        key={h.submissionId}
                                                        className={`${styles.historyRow} ${isSpeaking && !canView ? styles.historyRowDisabled : ''}`}
                                                        onClick={canView ? () => onViewSubmission(item.itemId, h.submissionId) : undefined}
                                                        onKeyDown={canView ? (event) => {
                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                event.preventDefault();
                                                                onViewSubmission(item.itemId, h.submissionId);
                                                            }
                                                        } : undefined}
                                                        role={canView ? 'button' : undefined}
                                                        tabIndex={canView ? 0 : undefined}
                                                        title={canView ? 'Bấm để xem chi tiết bài làm này' : undefined}
                                                    >
                                                        <div>
                                                            <strong>{isSpeaking && isRejectedOffTopic(h.status)
                                                                ? 'Bài nói lạc đề' : `Lần nộp #${h.attemptNumber}`}</strong>
                                                            <br />
                                                            <small>{formatDateTime(h.createdAt)}</small>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className={styles.bandPill}>{bandDisplay}</span>
                                                            {!isSpeaking && (
                                                                <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => onEditFile(item.itemId, h.submissionId)}
                                                                        title="Chỉnh sửa bài nộp"
                                                                    >
                                                                        <i className="bi bi-pencil"></i>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => onRemoveFile(item.itemId, h.submissionId)}
                                                                        title="Xóa bài nộp"
                                                                    >
                                                                        <i className="bi bi-trash"></i>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Side Actions Column */}
                            <div className={styles.sideActions}>
                                {isSpeaking && (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.primary}
                                            onClick={() => onStartSpeaking(item)}
                                        >
                                            <i className="bi bi-mic-fill"></i>
                                            {attemptCount > 0 ? 'Làm lại bài' : 'Bắt đầu làm bài'}
                                        </button>
                                        {viewableAttempt && (
                                            <button
                                                type="button"
                                                className={styles.secondary}
                                                onClick={() => onViewSubmission(item.itemId, viewableAttempt.submissionId)}
                                            >
                                                <i className="bi bi-file-earmark-text"></i>
                                                Xem chi tiết bài chấm
                                            </button>
                                        )}
                                        {/* Tip: Microphone warning is intentionally removed per user request */}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                </div>
                )}
            </div>
        </article>
    );
}
