import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import styles from './Dashboard.module.css';
import Pagination from '../../components/Pagination';
import AttemptDetailView from '../student/AttemptDetailView';
import { displayCourseName } from '../../utils/displayText';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ChartTitle,
    Tooltip,
    Legend,
    Filler
);

const PAGE_SIZE = 10;

export default function Dashboard() {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [subPage, setSubPage] = useState(1);
    
    // Detailed submission view state
    const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeTab, setActiveTab] = useState('submissions');

    const [dashboardData, setDashboardData] = useState({
        metrics: {
            totalStudents: 0,
            totalExercises: 0,
            submissionRate: 0,
            avgScore: 0
        },
        recentSubmissions: [],
        students: [],
        submissionsTrend: []
    });

    const fetchClasses = async () => {
        try {
            const data = await axiosClient.get('/teacher/classroom');
            setClasses(data || []);
            if (data && data.length > 0) {
                setSelectedClassId(data[0].classId);
            } else {
                setLoadingData(false);
            }
        } catch (e) {
            console.error("Fetch classes error: ", e);
            setLoadingData(false);
        }
    };

    const fetchDashboardData = async (classId) => {
        if (!classId) return;
        setLoadingData(true);
        try {
            const data = await axiosClient.get(`/teacher/classroom/${classId}/dashboard`);
            setDashboardData(data || {
                metrics: { totalStudents: 0, totalExercises: 0, submissionRate: 0, avgScore: 0 },
                recentSubmissions: [],
                students: [],
                submissionsTrend: []
            });
            setSubPage(1); // Reset page on class change
        } catch (e) {
            console.error("Fetch dashboard data error: ", e);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu bảng điều khiển.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchDashboardData(selectedClassId);
        }
    }, [selectedClassId]);

    const formatTime = (isoString) => {
        if (!isoString) return '---';
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const handleViewSubmission = async (sub) => {
        setLoadingDetail(true);
        try {
            const detail = await axiosClient.get(`/teacher/classroom/submission/${sub.submissionId}`);
            setSelectedSubmissionDetail(detail);
        } catch (err) {
            console.error('Fetch submission detail error:', err);
            Swal.fire('Lỗi', 'Không thể tải chi tiết bài làm.', 'error');
        } finally {
            setLoadingDetail(false);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Completed': return 'Đã chấm';
            case 'Grading': return 'Đang chấm';
            default: return 'Đã nộp';
        }
    };

    // Client-side pagination calculations
    const recentSubmissions = dashboardData.recentSubmissions || [];
    const subsTotalPages = Math.max(1, Math.ceil(recentSubmissions.length / PAGE_SIZE));
    const subsSafePage = Math.min(subPage, subsTotalPages);
    const pagedSubmissions = recentSubmissions.slice(
        (subsSafePage - 1) * PAGE_SIZE, subsSafePage * PAGE_SIZE
    );

    const renderStudentSkeletons = () => {
        return Array(4).fill(0).map((_, idx) => (
            <div key={idx} className={`${styles.studentCard} ${styles.skeletonCard}`}>
                <div className={styles.studentCardHeader}>
                    <div className={`${styles.largeAvatar} ${styles.skeletonAvatar}`} style={{ background: '#e2e8f0' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className={styles.skeleton} style={{ width: '60%', height: '14px' }}></div>
                        <div className={styles.skeleton} style={{ width: '80%', height: '10px' }}></div>
                    </div>
                </div>
                <div className={styles.studentStats} style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
                    <div className={styles.studentStatItem}>
                        <div className={styles.skeleton} style={{ width: '45%', height: '18px', marginBottom: '4px' }}></div>
                        <div className={styles.skeleton} style={{ width: '70%', height: '10px' }}></div>
                    </div>
                    <div className={styles.studentStatItem}>
                        <div className={styles.skeleton} style={{ width: '45%', height: '18px', marginBottom: '4px' }}></div>
                        <div className={styles.skeleton} style={{ width: '70%', height: '10px' }}></div>
                    </div>
                </div>
            </div>
        ));
    };

    const renderTableSkeletons = () => {
        return Array(5).fill(0).map((_, idx) => (
            <tr key={idx}>
                <td className={styles.timeCell}><div className={styles.skeleton} style={{ width: '100px', height: '14px' }}></div></td>
                <td>
                    <div className={styles.studentCol}>
                        <div className={`${styles.avatar} ${styles.skeletonAvatar}`} style={{ background: '#e2e8f0' }}></div>
                        <div className={styles.skeleton} style={{ width: '120px', height: '14px' }}></div>
                    </div>
                </td>
                <td><div className={styles.skeleton} style={{ width: '200px', height: '14px' }}></div></td>
                <td><div className={styles.skeleton} style={{ width: '60px', height: '22px', borderRadius: '20px' }}></div></td>
                <td style={{ textAlign: 'right' }}>
                    <div className={styles.skeleton} style={{ width: '100px', height: '28px', borderRadius: '6px' }}></div>
                </td>
            </tr>
        ));
    };

    // Render detailed submission view if selected
    if (selectedSubmissionDetail) {
        const audioPayload = selectedSubmissionDetail.payloads?.find(
            p => p.dataType === 'AUDIO_URL' || p.dataType === 'FILE_URL'
        );
        const audioUrl = audioPayload?.secureUrl;

        // If completed and has AI feedback results
        if (selectedSubmissionDetail.status === 'Completed' && selectedSubmissionDetail.feedback) {
            const enrichedFeedback = {
                ...selectedSubmissionDetail.feedback,
                audioBlobUrl: selectedSubmissionDetail.feedback.audioBlobUrl || audioUrl
            };

            return (
                <div className={styles.container}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                Bài nộp của: <strong>{selectedSubmissionDetail.studentName}</strong> (Lần {selectedSubmissionDetail.attemptNumber})
                            </span>
                            <button className={styles.btnView} onClick={() => setSelectedSubmissionDetail(null)} style={{ background: '#f1f5f9', color: '#475569' }}>
                                <i className="bi bi-arrow-left"></i> Quay lại Dashboard
                            </button>
                        </div>
                        <AttemptDetailView 
                            results={enrichedFeedback} 
                            onBack={() => setSelectedSubmissionDetail(null)} 
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
                        <p>Thông tin bài làm của học viên <strong>{selectedSubmissionDetail.studentName}</strong></p>
                    </div>
                    <button className={styles.btnView} onClick={() => setSelectedSubmissionDetail(null)} style={{ background: '#ffffff', color: '#6366f1', border: '1px solid #e2e8f0' }}>
                        <i className="bi bi-arrow-left"></i> Quay lại Dashboard
                    </button>
                </div>

                <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'stretch' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                            Lượt nộp #{selectedSubmissionDetail.attemptNumber || 1}
                        </h4>
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0284c7', fontWeight: 600 }}>
                            {getStatusLabel(selectedSubmissionDetail.status)}
                        </span>
                    </div>

                    <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.9rem' }}>Bản thu âm của học viên:</h5>
                        {audioUrl ? (
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                <i className="bi bi-mic-fill" style={{ fontSize: '2rem', color: '#6366f1' }}></i>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {audioPayload.fileName || 'speaking_submission.webm'}
                                </span>
                                <audio src={audioUrl} controls style={{ width: '100%', maxWidth: '500px' }} />
                            </div>
                        ) : (
                            <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                                Không tìm thấy file âm thanh đính kèm.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header section */}
            <div className={styles.header}>
                <div>
                    <h3>Tổng quan Lớp học</h3>
                    <p>Theo dõi danh sách học viên, tiến độ hoàn thành và lịch sử bài nộp của lớp</p>
                </div>
                <div className={styles.filters}>
                    <select 
                        className={styles.select}
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                        {classes.length === 0 ? (
                            <option value="">Không có lớp học</option>
                        ) : (
                            classes.map(cls => (
                                <option key={cls.classId} value={cls.classId}>
                                    {cls.className}{displayCourseName(cls.courseName) ? ` (${displayCourseName(cls.courseName)})` : ''}
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.iconBox} style={{backgroundColor: '#ede9fe', color: '#6366f1'}}>
                        <i className="bi bi-people-fill"></i>
                    </div>
                    <div>
                        <div className={styles.statVal}>
                            {loadingData ? (
                                <div className={styles.skeleton} style={{ width: '40px', height: '28px' }}></div>
                            ) : (
                                dashboardData.metrics.totalStudents
                            )}
                        </div>
                        <div className={styles.statLabel}>Học viên đăng ký</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.iconBox} style={{backgroundColor: '#e0f2fe', color: '#0284c7'}}>
                        <i className="bi bi-journal-check"></i>
                    </div>
                    <div>
                        <div className={styles.statVal}>
                            {loadingData ? (
                                <div className={styles.skeleton} style={{ width: '40px', height: '28px' }}></div>
                            ) : (
                                dashboardData.metrics.totalExercises
                            )}
                        </div>
                        <div className={styles.statLabel}>Số deadline hiện tại</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.iconBox} style={{backgroundColor: '#fef3c7', color: '#d97706'}}>
                        <i className="bi bi-percent"></i>
                    </div>
                    <div>
                        <div className={styles.statVal}>
                            {loadingData ? (
                                <div className={styles.skeleton} style={{ width: '55px', height: '28px' }}></div>
                            ) : (
                                `${dashboardData.metrics.submissionRate}%`
                            )}
                        </div>
                        <div className={styles.statLabel}>Tỷ lệ nộp bài</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.iconBox} style={{backgroundColor: '#dcfce7', color: '#16a34a'}}>
                        <i className="bi bi-award-fill"></i>
                    </div>
                    <div>
                        <div className={styles.statVal}>
                            {loadingData ? (
                                <div className={styles.skeleton} style={{ width: '45px', height: '28px' }}></div>
                            ) : (
                                dashboardData.metrics.avgScore > 0 ? dashboardData.metrics.avgScore.toFixed(1) : '---'
                            )}
                        </div>
                        <div className={styles.statLabel}>Điểm trung bình lớp</div>
                    </div>
                </div>
            </div>

            {/* Submissions Trend Chart Panel */}
            <div className={styles.chartPanel} style={{ marginTop: '0.75rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="bi bi-graph-up" style={{ color: '#6366f1' }}></i>
                    Xu hướng nộp bài (trong tháng này)
                </h4>
                <div style={{ height: '220px', position: 'relative' }}>
                    {loadingData ? (
                        <div className={styles.skeleton} style={{ width: '100%', height: '100%', borderRadius: '12px' }}></div>
                    ) : (
                        <Line 
                            data={{
                                labels: (dashboardData.submissionsTrend || []).map(t => t.date),
                                datasets: [
                                    {
                                        label: 'Số lượng bài nộp',
                                        data: (dashboardData.submissionsTrend || []).map(t => t.count),
                                        borderColor: '#6366f1',
                                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                        tension: 0.35,
                                        fill: true,
                                        pointBackgroundColor: '#6366f1',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 2,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    }
                                ]
                            }} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: '#1e293b',
                                        titleColor: '#ffffff',
                                        bodyColor: '#ffffff',
                                        padding: 10,
                                        cornerRadius: 8,
                                        displayColors: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: { precision: 0, color: '#64748b' },
                                        grid: { color: '#f1f5f9' }
                                    },
                                    x: {
                                        ticks: { color: '#64748b' },
                                        grid: { display: false }
                                    }
                                }
                            }} 
                        />
                    )}
                </div>
            </div>

            {/* Tab Navigation to prevent layout shifts and improve structure */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0px', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                <button 
                    onClick={() => setActiveTab('submissions')}
                    style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'submissions' ? '3px solid #6366f1' : '3px solid transparent',
                        color: activeTab === 'submissions' ? '#6366f1' : '#64748b',
                        padding: '0.75rem 1.25rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <i className="bi bi-clock-history"></i>
                    Bài nộp gần đây
                </button>
                <button 
                    onClick={() => setActiveTab('students')}
                    style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'students' ? '3px solid #6366f1' : '3px solid transparent',
                        color: activeTab === 'students' ? '#6366f1' : '#64748b',
                        padding: '0.75rem 1.25rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <i className="bi bi-mortarboard-fill"></i>
                    Thông số Học viên ({loadingData ? '...' : (dashboardData.students?.length || 0)})
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'students' && (
                <div className={styles.studentsGridPanel}>
                    <div className={styles.panelHead} style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            <i className="bi bi-mortarboard-fill" style={{ marginRight: '0.4rem', color: '#6366f1' }}></i>
                            Thông số Học viên trong lớp ({loadingData ? '...' : (dashboardData.students?.length || 0)})
                        </h4>
                    </div>
                    {loadingData ? (
                        <div className={styles.studentsGrid}>
                            {renderStudentSkeletons()}
                        </div>
                    ) : dashboardData.students?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Chưa có học viên nào tham gia lớp này.
                        </div>
                    ) : (
                        <div className={styles.studentsGrid}>
                            {dashboardData.students?.map(st => (
                                <div key={st.studentId} className={styles.studentCard}>
                                    <div className={styles.studentCardHeader}>
                                        <div className={styles.largeAvatar}>
                                            {st.studentName.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <h5 className={styles.studentName} title={st.studentName}>{st.studentName}</h5>
                                            <p className={styles.studentEmail} title={st.studentEmail}>{st.studentEmail}</p>
                                        </div>
                                    </div>
                                    <div className={styles.studentStats}>
                                        <div className={styles.studentStatItem}>
                                            <span className={styles.studentStatVal}>{st.submissionsCount}</span>
                                            <span className={styles.studentStatLabel}>Bài đã nộp</span>
                                        </div>
                                        <div className={styles.studentStatItem}>
                                            <span className={styles.studentStatVal} style={{ color: st.avgScore >= 6.5 ? '#16a34a' : (st.avgScore >= 5.0 ? '#d97706' : '#dc2626') }}>
                                                {st.avgScore > 0 ? st.avgScore.toFixed(1) : '---'}
                                            </span>
                                            <span className={styles.studentStatLabel}>Điểm TB</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'submissions' && (
                <div className={styles.tablePanel}>
                    <div className={styles.panelHead}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            <i className="bi bi-clock-history" style={{ marginRight: '0.4rem', color: '#6366f1' }}></i>
                            Bài nộp gần đây trong lớp
                        </h4>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Học viên</th>
                                    <th>Bài tập</th>
                                    <th>Điểm</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingData ? (
                                    renderTableSkeletons()
                                ) : recentSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{textAlign: 'center', padding: '2.5rem', color: '#64748b', fontStyle: 'italic'}}>
                                            Chưa có bài nộp nào trong lớp học này.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedSubmissions.map(sub => (
                                        <tr key={sub.submissionId}>
                                            <td className={styles.timeCell}>{formatTime(sub.createdAt)}</td>
                                            <td>
                                                <div className={styles.studentCol}>
                                                    <div className={styles.avatar}>
                                                        {sub.studentName.charAt(0).toUpperCase()}
                                                    </div>
                                                    {sub.studentName}
                                                </div>
                                            </td>
                                            <td>
                                                {sub.assignmentTitle} 
                                                {sub.itemType && (
                                                    <span style={{fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', marginLeft: '0.5rem', fontWeight: 600}}>
                                                        {sub.itemType.toUpperCase() === 'SPEAKING' || sub.itemType.toUpperCase() === 'AI_SPEAKING' ? 'Speaking' : 'File'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {sub.score != null ? (
                                                    <span className={sub.score >= 6.5 ? styles.badgeGood : styles.badgeMed}>
                                                        {sub.score.toFixed(1)} / 9.0
                                                    </span>
                                                ) : (
                                                    <span className={styles.badgeNull}>
                                                        {sub.status === 'Completed' ? 'Đã chấm (0đ)' : sub.status === 'Grading' ? 'Đang chấm' : 'Chưa chấm'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className={styles.btnView} 
                                                    onClick={() => handleViewSubmission(sub)}
                                                    disabled={loadingDetail}
                                                >
                                                    <i className="bi bi-search"></i> Xem bài nộp
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={subsSafePage}
                        totalPages={subsTotalPages}
                        onPageChange={setSubPage}
                    />
                </div>
            )}

        </div>
    );
}
