import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import styles from './SubmissionHistoryPage.module.css';
import Pagination from '../../components/Pagination';
import AttemptDetailView from '../../features/student/AttemptDetailView';

const PAGE_SIZE = 10;

export default function SubmissionHistoryPage() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedSkill, setSelectedSkill] = useState(''); // '' means All
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchHistory();
    }, [currentPage, selectedSkill]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const skillQuery = selectedSkill ? `&skill=${selectedSkill}` : '';
            const res = await axiosClient.get(`/student/dashboard/submissions?page=${currentPage}&pageSize=${PAGE_SIZE}${skillQuery}`);
            if (res) {
                setSubmissions(res.data || []);
                setTotalCount(res.totalCount || 0);
                setTotalPages(res.totalPages || 1);
            }
        } catch (err) {
            console.error('Fetch submission history error:', err);
            Swal.fire('Lỗi', 'Không thể tải lịch sử nộp bài.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSkillTabChange = (skill) => {
        setSelectedSkill(skill);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleViewDetail = async (submissionId) => {
        setLoadingDetail(true);
        try {
            const detail = await axiosClient.get(`/student/PracticeSpeaking/${submissionId}`);
            setSelectedSubmission(detail);
        } catch (err) {
            console.error('Fetch submission detail error:', err);
            Swal.fire('Lỗi', 'Không thể tải chi tiết bài làm.', 'error');
        } finally {
            setLoadingDetail(false);
        }
    };

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

    const getScoreBadgeClass = (score) => {
        if (score === null || score === undefined) return '';
        if (score >= 6.5) return styles.scoreHigh;
        if (score >= 5.0) return styles.scoreMed;
        return styles.scoreLow;
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Completed': return styles.statusCompleted;
            case 'Grading': return styles.statusGrading;
            default: return styles.statusPending;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Completed': return 'Đã chấm';
            case 'Grading': return 'Đang chấm';
            default: return 'Đã nộp';
        }
    };

    // If detail view is open
    if (selectedSubmission) {
        const audioPayload = selectedSubmission.payloads?.find(
            p => p.dataType === 'AUDIO_URL' || p.dataType === 'FILE_URL'
        );
        const audioUrl = audioPayload?.secureUrl;

        // If completed and has AI feedback results
        if (selectedSubmission.status === 'Completed' && selectedSubmission.feedback) {
            const enrichedFeedback = {
                ...selectedSubmission.feedback,
                audioBlobUrl: selectedSubmission.feedback.audioBlobUrl || audioUrl
            };

            return (
                <div className={styles.container}>
                    <div className={styles.detailWrapper}>
                        <AttemptDetailView 
                            results={enrichedFeedback} 
                            onBack={() => setSelectedSubmission(null)} 
                        />
                    </div>
                </div>
            );
        }

        // Simpler details view for Pending / Grading or incomplete submissions
        return (
            <div className={styles.container}>
                <div className={styles.header} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3>Chi Tiết Bài Nộp</h3>
                        <p>Thông tin chi tiết về lượt làm bài của bạn</p>
                    </div>
                    <button className={styles.btnView} onClick={() => setSelectedSubmission(null)} style={{ background: '#ffffff', color: '#4f46e5' }}>
                        <i className="bi bi-arrow-left"></i> Quay lại lịch sử
                    </button>
                </div>

                <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                            Lượt nộp #{selectedSubmission.attemptNumber || 1}
                        </h4>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass(selectedSubmission.status)}`}>
                            {getStatusLabel(selectedSubmission.status)}
                        </span>
                    </div>

                    <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>File ghi âm / tài liệu bài nộp:</h5>
                        {audioUrl ? (
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                <i className="bi bi-music-note-beamed" style={{ fontSize: '2rem', color: '#6366f1' }}></i>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {audioPayload.fileName || 'speaking_submission.webm'}
                                </span>
                                <audio src={audioUrl} controls style={{ width: '100%', maxWidth: '500px' }} />
                            </div>
                        ) : (
                            <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>
                                Không tìm thấy file âm thanh đính kèm trong bài nộp này.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const skills = [
        { key: '', label: 'Tất cả' },
        { key: 'SPEAKING', label: 'Speaking' },
        { key: 'WRITING', label: 'Writing' },
        { key: 'READING', label: 'Reading' },
        { key: 'LISTENING', label: 'Listening' }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Lịch Sử Nộp Bài</h3>
                <p>Xem lại điểm số, transcript và nghe lại các file ghi âm bài nói bạn đã nộp</p>
            </div>

            <div className={styles.card}>
                {/* Skill Filter Tabs */}
                <div className={styles.filterTabs}>
                    {skills.map((s) => (
                        <button
                            key={s.key}
                            className={`${styles.tabButton} ${selectedSkill === s.key ? styles.tabButtonActive : ''}`}
                            onClick={() => handleSkillTabChange(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Đang đồng bộ lịch sử bài làm...
                    </div>
                ) : submissions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <i className="bi bi-clock-history"></i>
                        <p>Không tìm thấy bài nộp nào phù hợp.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Mã</th>
                                        <th>Ngày nộp</th>
                                        <th>Tiêu đề / Đề bài</th>
                                        <th>Kỹ năng</th>
                                        <th>Lượt làm</th>
                                        <th>Trạng thái</th>
                                        <th>Điểm</th>
                                        <th style={{ textAlign: 'right' }}>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((sub) => (
                                        <tr key={sub.submissionId}>
                                            <td style={{ fontWeight: 600, color: '#64748b' }}>#{sub.submissionId}</td>
                                            <td>{formatDate(sub.createdAt)}</td>
                                            <td style={{ fontWeight: 600, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.title}>
                                                {sub.title}
                                            </td>
                                            <td>
                                                <span className={`${styles.skillBadge} ${styles['badge' + sub.skillType?.toUpperCase()] || ''}`}>
                                                    {sub.skillType || 'SPEAKING'}
                                                </span>
                                            </td>
                                            <td>Lần {sub.attemptNumber}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(sub.status)}`}>
                                                    {getStatusLabel(sub.status)}
                                                </span>
                                            </td>
                                            <td>
                                                {sub.score !== null && sub.score !== undefined ? (
                                                    <span className={`${styles.scoreBadge} ${getScoreBadgeClass(sub.score)}`}>
                                                        {sub.score.toFixed(1)} / 9.0
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>---</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className={styles.btnView} 
                                                    onClick={() => handleViewDetail(sub.submissionId)}
                                                    disabled={loadingDetail}
                                                >
                                                    <i className="bi bi-eye"></i> Xem kết quả
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
