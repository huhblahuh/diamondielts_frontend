import React from 'react';
import styles from './AssignmentDetailPage.module.css';
import { formatDueDate, getRemainingDaysText } from './assignmentDetailUtils';

export default function AssignmentDetailHero({ assignment, isOverdue, completedItemsCount, totalItems, progressPercent, onBack }) {
    return (
        <section className={styles.hero}>
            <div className={styles.heroMain}>
                <div className={styles.heroCopy}>
                    <h1>{assignment.title}</h1>
                    <div className={styles.metaRow}>
                        <div className={`${styles.meta} ${isOverdue ? styles.metaOverdue : styles.metaDue}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <path d="M16 3v4M8 3v4M3 10h18" />
                            </svg>
                            Hạn nộp: {formatDueDate(assignment.dueDate)}
                        </div>
                        <div className={styles.meta}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                            </svg>
                            {getRemainingDaysText(assignment.dueDate)}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className={styles.backButton}
                    onClick={onBack}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Quay lại bài tập
                </button>
            </div>

            <div className={styles.heroBottom}>
                <div className={styles.teacherNote}>
                    <div className={styles.noteIcon}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 10v6M12 7h.01" />
                        </svg>
                    </div>
                    <div>
                        <strong>Hướng dẫn từ giáo viên</strong>
                        {assignment.description ? (
                            <div
                                className={styles.teacherNoteContent}
                                dangerouslySetInnerHTML={{ __html: assignment.description }}
                            />
                        ) : (
                            <p>Hoàn thành từng câu và xem lại điểm trước khi nộp bài cuối cùng.</p>
                        )}
                    </div>
                </div>

                <div className={styles.progressCard}>
                    <div
                        className={styles.progressRing}
                        style={{
                            background: `conic-gradient(var(--purple) ${progressPercent}%, #eaeef6 0)`
                        }}
                    >
                        <span>{completedItemsCount}/{totalItems}</span>
                    </div>
                    <div className={styles.progressCopy}>
                        <small>Tiến độ bài tập</small>
                        <strong>Đã hoàn thành {completedItemsCount} trên {totalItems} hạng mục</strong>
                    </div>
                    <strong className={styles.progressPercent}>{progressPercent}%</strong>
                </div>
            </div>
        </section>
    );
}
