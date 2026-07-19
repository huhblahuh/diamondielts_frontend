import React from 'react';
import styles from './StudentAssignmentModal.module.css';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';

export default function SpeakingSubmissionItem({
    item,
    index,
    itemHistory,
    setActiveSpeakingItemId,
    setSpeakingResults,
    formatDateTime
}) {
    const parsedContent = item.contentJson ? JSON.parse(item.contentJson) : {};

    return (
        <div className={styles.itemCard}>
            {/* Tiêu đề & Loại bài tập */}
            <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                    <h4>Hạng mục {index + 1}: {parsedContent.title || parsedContent.part || 'Bài tập Speaking AI'}</h4>
                    <div 
                        className={styles.itemDesc} 
                        dangerouslySetInnerHTML={{ 
                            __html: parsedContent.description || parsedContent.prompt || 'Nhấn nút bên dưới để vào phòng thu âm và làm câu hỏi phát âm AI.' 
                        }} 
                    />

                    <div className={item.maxAttempts && itemHistory.length >= item.maxAttempts ? styles.attemptLimitBadgeError : styles.attemptLimitBadge}>
                        <i className="bi bi-info-circle"></i> Số lần nộp: <strong>{itemHistory.length}</strong>
                        {item.maxAttempts ? (
                            <span> / Tối đa <strong>{item.maxAttempts}</strong> lần</span>
                        ) : (
                            <span> (Không giới hạn)</span>
                        )}
                    </div>
                </div>
                <span className={styles.speakingBadge}>
                    <i className="bi bi-mic-fill"></i> AI Speaking
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

            {/* Nút bắt đầu làm bài nói Speaking */}
            <div className={styles.speakingStartArea}>
                <button
                    className={styles.btnStartSpeaking}
                    onClick={async () => {
                        try {
                            const checkData = await axiosClient.get(`/student/PracticeSpeaking/check-attempts/${item.itemId}`);
                            if (checkData.isLimitReached) {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Giới hạn số lần nộp bài',
                                    text: `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần) cho phần này.`,
                                    confirmButtonColor: '#ef4444'
                                });
                                return;
                            }
                            setActiveSpeakingItemId(item.itemId);
                            setSpeakingResults(prev => ({ ...prev, [item.itemId]: null }));
                        } catch (err) {
                            console.error(err);
                            Swal.fire('Lỗi', 'Không thể kiểm tra giới hạn nộp bài. Vui lòng thử lại sau.', 'error');
                        }
                    }}
                >
                    <i className="bi bi-mic-fill"></i> Làm bài
                </button>
            </div>

            {/* Lịch sử bài làm đã nộp */}
            {itemHistory.length > 0 && (
                <div className={styles.historyArea}>
                    <p className={styles.historyTitle}>
                        <i className="bi bi-clock-history"></i> Lịch sử bài làm đã nộp ({itemHistory.length})
                    </p>
                    {itemHistory.map((att) => (
                        <div key={att.submissionId} className={styles.historyItem}>
                            <div className={styles.historyLeft}>
                                <span className={styles.attemptNum}>Lần nộp #{att.attemptNumber}</span>
                                <span className={styles.submitTime}>
                                    <i className="bi bi-clock"></i> Đã nộp vào: {formatDateTime(att.createdAt)}
                                </span>
                            </div>
                            <span className={styles.statusBadgeSubmitted}>
                                Band {att.overallScore?.toFixed(1) || '--'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
