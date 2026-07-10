import React, { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import Swal from 'sweetalert2';
import styles from './StudentDetailsModal.module.css';
import Pagination from '../../../components/Pagination';

const PAGE_SIZE = 10;

function SubTable({ submissions, subPage, setSubPage, formatDate, styles, onViewSubmission }) {
    const totalSubPages = Math.max(1, Math.ceil(submissions.length / PAGE_SIZE));
    const safePage = Math.min(subPage, totalSubPages);
    const pagedSubs = submissions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tiêu đề bài tập</th>
                            <th>Kỹ năng</th>
                            <th>Ngày nộp</th>
                            <th>Điểm</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'right' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagedSubs.map((sub) => (
                            <tr key={sub.submissionId}>
                                <td style={{ fontWeight: 600 }}>{sub.assignmentTitle}</td>
                                <td>
                                    <span className={`${styles.typeBadge} ${
                                        sub.itemType === 'SPEAKING' ? styles.typeSpeaking :
                                        sub.itemType === 'WRITING' ? styles.typeWriting : styles.typeOther
                                    }`}>
                                        {sub.itemType}
                                    </span>
                                </td>
                                <td>{formatDate(sub.submittedAt)}</td>
                                <td>
                                    {sub.score !== null ? (
                                        <span className={styles.scoreBadge}>{sub.score} / 9.0</span>
                                    ) : (
                                        <span className={styles.noScoreBadge}>Chưa chấm</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${
                                        sub.status === 'Evaluated' || sub.status === 'Completed'
                                            ? styles.statusCompleted : styles.statusPending
                                    }`}>
                                        {sub.status === 'Evaluated' ? 'Đã chấm AI' :
                                         sub.status === 'Submitted' ? 'Chờ chấm' : sub.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className={styles.btnViewReview}
                                        onClick={() => onViewSubmission(sub.assignmentId, sub.assignmentItemId)}
                                    >
                                        <i className="bi bi-search"></i> Xem chi tiết
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination
                currentPage={safePage}
                totalPages={totalSubPages}
                onPageChange={setSubPage}
            />
        </>
    );
}

export default function StudentDetailsModal({ show, onClose, classId, studentId, studentName, onViewSubmission }) {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);
    const [subPage, setSubPage] = useState(1);

    useEffect(() => {
        const fetchStudentDetails = async () => {
            if (!show || !classId || !studentId) return;
            try {
                setLoading(true);
                const data = await axiosClient.get(`/teacher/classroom/${classId}/student/${studentId}/details`);
                setDetails(data);
            } catch (err) {
                console.error("Error loading student class details:", err);
                Swal.fire('Lỗi', 'Không thể nạp dữ liệu chi tiết học viên từ máy chủ', 'error');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        fetchStudentDetails();
    }, [show, classId, studentId]);

    if (!show) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h4><i className="bi bi-person-badge-fill"></i> Chi Tiết Học Viên: {studentName || details?.profile?.fullName}</h4>
                    <button className={styles.btnCloseModal} onClick={onClose}>&times;</button>
                </div>

                <div className={styles.modalBody}>
                    {loading || !details ? (
                        <div className={styles.loader}>
                            <div className="spinner-border text-primary" role="status" style={{ marginBottom: '1rem' }}></div>
                            <p>Đang tải thông số học viên...</p>
                        </div>
                    ) : (
                        <>
                            {/* Profile Info */}
                            <div className={styles.profileSection}>
                                <div className={styles.studentMeta}>
                                    <h3>{details.profile.fullName}</h3>
                                    <p><i className="bi bi-envelope"></i> {details.profile.email}</p>
                                </div>
                                <div className={styles.studentMeta} style={{ textAlign: 'right' }}>
                                    <p>Ngày gia nhập lớp: <strong>{new Date(details.profile.joinDate).toLocaleDateString('vi-VN')}</strong></p>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Bài đã nộp</span>
                                    <span className={styles.statVal}>
                                        {details.stats.submittedItemsCount} / {details.stats.totalAssignmentItems}
                                    </span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Tỷ lệ hoàn thành</span>
                                    <span className={styles.statVal} style={{ color: '#10b981' }}>
                                        {details.stats.totalAssignmentItems > 0 
                                            ? Math.round((details.stats.submittedItemsCount / details.stats.totalAssignmentItems) * 100)
                                            : 0}%
                                    </span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Điểm trung bình (GPA)</span>
                                    <span className={styles.statValAvg}>
                                        {details.stats.avgScore > 0 ? `${details.stats.avgScore} / 9.0` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Submissions Section */}
                            <h5 className={styles.sectionTitle}>
                                <i className="bi bi-journal-text"></i> Danh Sách Bài Tập Đã Nộp
                            </h5>
                            
                            {details.submissions.length === 0 ? (
                                <div className={styles.emptyState}>Học viên chưa nộp bài tập nào trong lớp học này.</div>
                            ) : (
                                <SubTable
                                    submissions={details.submissions}
                                    subPage={subPage}
                                    setSubPage={setSubPage}
                                    formatDate={formatDate}
                                    styles={styles}
                                    onViewSubmission={onViewSubmission}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnClose} onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
}
