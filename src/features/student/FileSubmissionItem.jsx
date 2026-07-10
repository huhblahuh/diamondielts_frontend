import React from 'react';
import styles from './StudentAssignmentModal.module.css';
import CommonAttachmentUploader from '../../components/CommonAttachmentUploader';

export default function FileSubmissionItem({
    item,
    index,
    itemHistory,
    editingSubmissionId,
    isBlockedByDeadline,
    files,
    submittingItemId,
    handleFileChange,
    setEditingSubmissionId,
    handleEditSubmission,
    handleRemoveSubmission,
    handleSaveEditedSubmission,
    handleSubmitHomework,
    formatDateTime
}) {
    const parsedContent = item.contentJson ? JSON.parse(item.contentJson) : {};

    return (
        <div className={styles.itemCard}>
            {/* Tiêu đề & Loại bài tập */}
            <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                    <h4>Hạng mục {index + 1}: {parsedContent.title || 'Nộp tài liệu tự luận'}</h4>
                    <p className={styles.itemDesc}>{parsedContent.description || 'Vui lòng làm bài và tải lên file bài làm theo đúng yêu cầu bên dưới.'}</p>
                </div>
                <span className={styles.itemBadge}>
                    <i className="bi bi-folder-symlink"></i> File Submission
                </span>
            </div>

            {/* Tài liệu đính kèm mẫu từ Giáo viên (Nếu có) */}
            {item.payloads && item.payloads.length > 0 && (
                <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                        <i className="bi bi-paperclip"></i> Tài liệu đính kèm của giáo viên:
                    </p>
                    <div className={styles.attachmentList}>
                        {item.payloads.map((payload, idx) => {
                            const rawName = (payload && payload.dataValue) ? payload.dataValue.substring(payload.dataValue.lastIndexOf('/') + 1) : '';

                            const cleanFileName = (raw) => {
                                if (!raw) return '';
                                const lastDot = raw.lastIndexOf('.');
                                if (lastDot === -1) return raw;

                                const ext = raw.substring(lastDot);
                                let nameWithoutExt = raw.substring(0, lastDot);

                                const guidRegex = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
                                if (guidRegex.test(nameWithoutExt)) {
                                    nameWithoutExt = nameWithoutExt.replace(guidRegex, '');
                                }

                                const prefixIdRegex = /^[0-9]+_/;
                                if (prefixIdRegex.test(nameWithoutExt)) {
                                    nameWithoutExt = nameWithoutExt.replace(prefixIdRegex, '');
                                }

                                return nameWithoutExt + ext;
                            };

                            const fileName = payload.originalFileName || cleanFileName(rawName) || 'Tài liệu đính kèm';
                            return (
                                <a
                                    key={idx}
                                    href={payload.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.attachmentCard}
                                    title="Bấm để tải về"
                                >
                                    <i className="bi bi-file-earmark-arrow-down-fill"></i>
                                    <span className="text-truncate">{fileName}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Khu vực nộp bài */}
            {(() => {
                const latestSub = itemHistory[0];
                const isEditing = latestSub && editingSubmissionId === latestSub.submissionId;

                if (isBlockedByDeadline) {
                    if (itemHistory.length === 0) {
                        return (
                            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.9rem' }}>
                                <i className="bi bi-exclamation-triangle-fill"></i> Hạn nộp bài tập đã kết thúc. Bạn không thể nộp bài tập này nữa.
                            </div>
                        );
                    }
                }

                if (itemHistory.length === 0 || isEditing) {
                    return (
                        <div className={styles.submitArea}>
                            {isEditing && (
                                <div className={styles.editBanner}>
                                    <i className="bi bi-pencil-square"></i>
                                    Đang sửa bài làm: Lần nộp #{latestSub.attemptNumber}. Bạn hãy tải lên file mới để thay thế bài cũ.
                                </div>
                            )}
                            <h5 className={styles.submitAreaTitle}>
                                <i className="bi bi-cloud-arrow-up"></i> {isEditing ? 'Tải lên file bài làm mới' : 'Tải lên bài làm của bạn'}
                            </h5>

                            <CommonAttachmentUploader
                                files={files}
                                onChange={(updatedFiles) => handleFileChange(item.itemId, updatedFiles)}
                                maxCount={1}
                                allowedTypes={['.pdf', '.doc', '.docx', '.zip', '.rar']}
                            />

                            <div className={styles.actionButtonRow} style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
                                {isEditing && (
                                    <button
                                        className={styles.btnCancelEdit}
                                        onClick={() => setEditingSubmissionId(null)}
                                        disabled={submittingItemId === item.itemId}
                                    >
                                        Hủy bỏ
                                    </button>
                                )}
                                <button
                                    className={styles.btnSubmitHomework}
                                    onClick={() => isEditing ? handleSaveEditedSubmission(item.itemId, latestSub.submissionId) : handleSubmitHomework(item.itemId)}
                                    disabled={submittingItemId === item.itemId || files.length === 0}
                                >
                                    {submittingItemId === item.itemId ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            Đang nộp...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check2-circle"></i> {isEditing ? 'Lưu thay đổi' : 'Nộp bài làm'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={styles.statusPanel}>
                        <h5 className={styles.statusPanelTitle}>Trạng thái nộp bài</h5>

                        {!isBlockedByDeadline && (
                            <div className={styles.actionButtonRow}>
                                <button
                                    className={styles.btnEditSubmission}
                                    onClick={() => handleEditSubmission(item.itemId, latestSub.submissionId)}
                                >
                                    <i className="bi bi-pencil-square"></i> Sửa bài nộp
                                </button>
                                <button
                                    className={styles.btnRemoveSubmission}
                                    onClick={() => handleRemoveSubmission(item.itemId, latestSub.submissionId)}
                                >
                                    <i className="bi bi-trash-fill"></i> Xóa bài nộp
                                </button>
                            </div>
                        )}

                        <div className={styles.statusTable}>
                            <div className={styles.statusTableRow}>
                                <div className={styles.statusTableCellLabel}>Submission status</div>
                                <div className={styles.statusTableCellValue}>
                                    <span className={styles.statusCellSubmitted}>Submitted for grading</span>
                                </div>
                            </div>
                            <div className={styles.statusTableRow}>
                                <div className={styles.statusTableCellLabel}>Grading status</div>
                                <div className={styles.statusTableCellValue}>
                                    {latestSub.status === 'Completed' ? (
                                        <span className={styles.statusCellGraded}>Graded (Band {latestSub.overallScore?.toFixed(1) || '--'})</span>
                                    ) : (
                                        <span className={styles.statusCellNotGraded}>Not graded</span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.statusTableRow}>
                                <div className={styles.statusTableCellLabel}>Last modified</div>
                                <div className={styles.statusTableCellValue}>
                                    {formatDateTime(latestSub.createdAt)}
                                </div>
                            </div>
                            <div className={styles.statusTableRow}>
                                <div className={styles.statusTableCellLabel}>File submissions</div>
                                <div className={styles.statusTableCellValue}>
                                    {latestSub.payloads && latestSub.payloads.filter(p => p.dataType === 'FILE_URL').map((p, idx) => (
                                        <a
                                            key={idx}
                                            href={p.downloadUrl || p.secureUrl || p.dataValue}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.submittedFileLink}
                                        >
                                            <i className="bi bi-file-earmark-text-fill text-primary"></i>
                                            {p.originalFileName || p.fileName || 'Bài nộp'}
                                        </a>
                                    ))}
                                </div>
                            </div>
                            {latestSub.feedbackPayloads && latestSub.feedbackPayloads.length > 0 && (
                                <div className={styles.statusTableRow}>
                                    <div className={styles.statusTableCellLabel}>File receive</div>
                                    <div className={styles.statusTableCellValue} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {latestSub.feedbackPayloads.map((p, idx) => (
                                            <a
                                                key={idx}
                                                href={p.secureUrl || p.downloadUrl || p.dataValue}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.submittedFileLink}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'normal', wordBreak: 'break-all' }}
                                                title="Bấm để tải file nhận xét từ giáo viên"
                                            >
                                                <i className="bi bi-file-earmark-arrow-down-fill text-success"></i>
                                                <span>{p.fileName || 'Tài liệu nhận xét'}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
