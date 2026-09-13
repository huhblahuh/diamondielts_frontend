import React, { useState, useEffect, useMemo, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import styles from './SubmissionHistoryPage.module.css';
import AttemptDetailView from '../../features/student/AttemptDetailView';
import Pagination from '../../components/Pagination';
import HeroArtwork from '../../components/common/HeroArtwork';

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
    const [isPaginationVisible, setIsPaginationVisible] = useState(false);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // all, today, 7days, 30days
    const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
    const dateDropdownRef = useRef(null);
    const listContainerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const paginationHideTimerRef = useRef(null);

    // Sorting state
    const [sortField, setSortField] = useState('date'); // 'date' | 'attempt'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

    useEffect(() => {
        fetchHistory();
    }, [currentPage, selectedSkill]);

    const keepPaginationVisible = () => {
        if (totalPages <= 1) return;
        setIsPaginationVisible(true);
        window.clearTimeout(paginationHideTimerRef.current);
        paginationHideTimerRef.current = window.setTimeout(() => {
            setIsPaginationVisible(false);
        }, 1000);
    };

    useEffect(() => {
        let scrollParent = listContainerRef.current?.parentElement;
        while (scrollParent && scrollParent !== document.body) {
            const overflowY = window.getComputedStyle(scrollParent).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') break;
            scrollParent = scrollParent.parentElement;
        }

        if (!scrollParent || scrollParent === document.body) return undefined;
        scrollContainerRef.current = scrollParent;
        const handleScroll = () => keepPaginationVisible();
        scrollParent.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            scrollParent.removeEventListener('scroll', handleScroll);
            window.clearTimeout(paginationHideTimerRef.current);
        };
    }, [totalPages]);

    // Close date dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
                setIsDateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        setCurrentPage(1);
    };

    const handleToggleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleViewDetail = async (submissionId) => {
        setLoadingDetail(true);
        try {
            const detail = await axiosClient.get(`/student/submissions/${submissionId}`);
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
        const d = new Date(dateStr);
        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${time} ${date}`;
    };

    const formatMobileDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatMobileTime = (dateStr) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('vi-VN', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    };

    const getRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        if (diffMs < 0) return 'Vừa xong';
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay < 30) return `${diffDay} ngày trước`;
        const diffMonth = Math.floor(diffDay / 30);
        if (diffMonth < 12) return `${diffMonth} tháng trước`;
        return `${Math.floor(diffDay / 365)} năm trước`;
    };

    const getScoreBadgeClass = (score) => {
        if (score === null || score === undefined) return '';
        if (score >= 6.0) return styles.scoreHigh;
        return styles.scoreMed;
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

    const getDateFilterLabel = () => {
        switch (dateFilter) {
            case 'today': return 'Hôm nay';
            case '7days': return '7 ngày qua';
            case '30days': return '30 ngày qua';
            default: return 'Chọn khoảng thời gian';
        }
    };

    // Client-side filtering & sorting for interactive response
    const displaySubmissions = useMemo(() => {
        let result = [...submissions];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter(sub =>
                (sub.title && sub.title.toLowerCase().includes(term)) ||
                (sub.skillType && sub.skillType.toLowerCase().includes(term)) ||
                (sub.status && sub.status.toLowerCase().includes(term)) ||
                (`lần ${sub.attemptNumber}`.toLowerCase().includes(term))
            );
        }

        if (dateFilter !== 'all') {
            const now = new Date();
            result = result.filter(sub => {
                if (!sub.createdAt) return true;
                const subDate = new Date(sub.createdAt);
                const diffDays = (now - subDate) / (1000 * 60 * 60 * 24);
                if (dateFilter === 'today') return diffDays <= 1;
                if (dateFilter === '7days') return diffDays <= 7;
                if (dateFilter === '30days') return diffDays <= 30;
                return true;
            });
        }

        result.sort((a, b) => {
            if (sortField === 'date') {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (sortField === 'attempt') {
                const attA = a.attemptNumber || 0;
                const attB = b.attemptNumber || 0;
                return sortOrder === 'asc' ? attA - attB : attB - attA;
            }
            return 0;
        });

        return result;
    }, [submissions, searchTerm, dateFilter, sortField, sortOrder]);

    // Detail view if opened
    if (selectedSubmission) {
        const audioPayload = selectedSubmission.payloads?.find(
            p => p.dataType === 'AUDIO_URL' || p.dataType === 'FILE_URL'
        );
        const audioUrl = audioPayload?.secureUrl;

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

        return (
            <div className={styles.container}>
                <div className={styles.detailHeader}>
                    <div>
                        <h3 className={styles.detailTitle}>Chi Tiết Bài Nộp</h3>
                        <p className={styles.detailSubtitle}>Thông tin chi tiết về lượt làm bài của bạn</p>
                    </div>
                    <button className={styles.btnBack} onClick={() => setSelectedSubmission(null)}>
                        <i className="bi bi-arrow-left"></i> Quay lại lịch sử
                    </button>
                </div>

                <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                            Lượt nộp #{selectedSubmission.attemptNumber || 1}
                        </h4>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass(selectedSubmission.status)}`}>
                            <i className="bi bi-check-circle-fill"></i>
                            {getStatusLabel(selectedSubmission.status)}
                        </span>
                    </div>

                    <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>File ghi âm / tài liệu bài nộp:</h5>
                        {audioUrl ? (
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                <i className="bi bi-music-note-beamed" style={{ fontSize: '2rem', color: '#2563eb' }}></i>
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
        { key: '', label: 'Tất cả', icon: 'bi bi-grid-fill' },
        { key: 'SPEAKING', label: 'Speaking', icon: 'bi bi-mic' },
        { key: 'FILE_SUBMISSION', label: 'Nộp file', icon: 'bi bi-file-earmark-text' }
    ];

    const fromCount = displaySubmissions.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const toCount = displaySubmissions.length > 0 ? (currentPage - 1) * PAGE_SIZE + displaySubmissions.length : 0;
    const displayTotalCount = totalCount > 0 ? totalCount : displaySubmissions.length;

    return (
        <div className={styles.container} ref={listContainerRef}>
            {/* Hero Banner with 3D Audio Graphic */}
            <div className={styles.heroBanner}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>Lịch Sử Nộp Bài</h1>
                    <p className={styles.heroSubtitle}>
                        Xem lại điểm số, transcript và nghe lại các file ghi âm bài nói bạn đã nộp
                    </p>
                </div>

                {/* 3D Audio Document Graphic */}
                <div className={styles.heroGraphicWrapper}>
                    <HeroArtwork variant="history" className={styles.historyArtwork} />
                </div>
            </div>

            {/* Main Content Card Container */}
            <div className={styles.mainCard}>
                {/* Control & Filter Row */}
                <div className={styles.filterRow}>
                    {/* Left: Skill Filter Tabs */}
                    <div className={styles.filterTabs}>
                        {skills.map((s) => {
                            const isActive = selectedSkill === s.key;
                            return (
                                <button
                                    key={s.key}
                                    className={`${styles.tabButton} ${isActive ? styles.tabActive : ''}`}
                                    onClick={() => handleSkillTabChange(s.key)}
                                >
                                    <i className={s.icon}></i>
                                    <span>{s.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Search Input & Date Filter Dropdown */}
                    <div className={styles.searchDateGroup}>
                        {/* Search Input */}
                        <div className={styles.searchWrapper}>
                            <i className={`bi bi-search ${styles.searchIcon}`}></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Tìm theo tiêu đề, kỹ năng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className={styles.clearSearchBtn}
                                    onClick={() => setSearchTerm('')}
                                    title="Xóa tìm kiếm"
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            )}
                        </div>

                        {/* Date Filter Dropdown */}
                        <div className={styles.dateDropdownWrapper} ref={dateDropdownRef}>
                            <button
                                className={`${styles.dateDropdownBtn} ${(dateFilter !== 'all' || selectedSkill) ? styles.dateActive : ''}`}
                                onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                            >
                                <i className={`bi bi-calendar3 ${styles.dateCalendarIcon}`}></i>
                                <i className={`bi bi-funnel ${styles.dateFilterIcon}`}></i>
                                <span className={styles.dateLabel}>{getDateFilterLabel()}</span>
                                <i className={`bi bi-chevron-down ${styles.dateChevron} ${isDateMenuOpen ? styles.chevronOpen : ''}`}></i>
                            </button>

                            {isDateMenuOpen && (
                                <div className={styles.dateMenu}>
                                    <div className={styles.mobileOnlyFilterGroup}>
                                        <p className={styles.filterMenuHeading}>Loại bài</p>
                                        {skills.map((skill) => (
                                            <button
                                                key={skill.key || 'all'}
                                                className={`${styles.dateMenuItem} ${selectedSkill === skill.key ? styles.dateMenuItemActive : ''}`}
                                                onClick={() => {
                                                    handleSkillTabChange(skill.key);
                                                    setIsDateMenuOpen(false);
                                                }}
                                            >
                                                <span><i className={skill.icon}></i>{skill.label}</span>
                                                {selectedSkill === skill.key && <i className="bi bi-check2"></i>}
                                            </button>
                                        ))}
                                        <div className={styles.filterMenuDivider}></div>
                                        <p className={styles.filterMenuHeading}>Thời gian</p>
                                    </div>
                                    <button
                                        className={`${styles.dateMenuItem} ${dateFilter === 'all' ? styles.dateMenuItemActive : ''}`}
                                        onClick={() => { setDateFilter('all'); setIsDateMenuOpen(false); }}
                                    >
                                        Tất cả thời gian
                                    </button>
                                    <button
                                        className={`${styles.dateMenuItem} ${dateFilter === 'today' ? styles.dateMenuItemActive : ''}`}
                                        onClick={() => { setDateFilter('today'); setIsDateMenuOpen(false); }}
                                    >
                                        Hôm nay
                                    </button>
                                    <button
                                        className={`${styles.dateMenuItem} ${dateFilter === '7days' ? styles.dateMenuItemActive : ''}`}
                                        onClick={() => { setDateFilter('7days'); setIsDateMenuOpen(false); }}
                                    >
                                        7 ngày qua
                                    </button>
                                    <button
                                        className={`${styles.dateMenuItem} ${dateFilter === '30days' ? styles.dateMenuItemActive : ''}`}
                                        onClick={() => { setDateFilter('30days'); setIsDateMenuOpen(false); }}
                                    >
                                        30 ngày qua
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area: Table (Desktop) / Cards (Mobile) */}
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Đang tải lịch sử bài làm...</p>
                    </div>
                ) : displaySubmissions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconCircle}>
                            <i className="bi bi-clock-history"></i>
                        </div>
                        <h4>Không tìm thấy bài nộp nào</h4>
                        <p>Không có bài nộp nào phù hợp với bộ lọc hiện tại của bạn.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th
                                            className={styles.sortableTh}
                                            onClick={() => handleToggleSort('date')}
                                            title="Sắp xếp theo ngày nộp"
                                        >
                                            Ngày nộp <i className="bi bi-arrow-down-up"></i>
                                        </th>
                                        <th>Tiêu đề / Đề bài</th>
                                        <th>Kỹ năng</th>
                                        <th
                                            className={styles.sortableTh}
                                            onClick={() => handleToggleSort('attempt')}
                                            title="Sắp xếp theo lượt làm"
                                        >
                                            Lượt làm <i className="bi bi-arrow-down-up"></i>
                                        </th>
                                        <th>Trạng thái</th>
                                        <th>Điểm</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displaySubmissions.map((sub, index) => {
                                        const rowNum = (currentPage - 1) * PAGE_SIZE + index + 1;
                                        const isSpeaking = (sub.skillType || 'SPEAKING').toUpperCase() === 'SPEAKING';
                                        return (
                                            <tr key={sub.submissionId}>
                                                {/* # Column */}
                                                <td className={styles.colIndex}>#{rowNum}</td>

                                                {/* Date Column */}
                                                <td className={styles.colDate}>
                                                    <div className={styles.datePrimary}>{formatDate(sub.createdAt)}</div>
                                                    <div className={styles.dateRelative}>{getRelativeTime(sub.createdAt)}</div>
                                                </td>

                                                {/* Title Column */}
                                                <td className={styles.colTitle}>
                                                    <span title={sub.title}>{sub.title}</span>
                                                </td>

                                                {/* Skill Column */}
                                                <td className={styles.colSkill}>
                                                    {isSpeaking ? (
                                                        <span className={styles.skillSpeaking}>
                                                            <i className="bi bi-mic-fill"></i> SPEAKING
                                                        </span>
                                                    ) : (
                                                        <span className={styles.skillFile}>
                                                            <i className="bi bi-file-earmark-text"></i> NỘP FILE
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Attempt Column */}
                                                <td className={styles.colAttempt}>
                                                    Lần {sub.attemptNumber}
                                                </td>

                                                {/* Status Column */}
                                                <td className={styles.colStatus}>
                                                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(sub.status)}`}>
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        {getStatusLabel(sub.status)}
                                                    </span>
                                                </td>

                                                {/* Score Column */}
                                                <td className={styles.colScore}>
                                                    {sub.score !== null && sub.score !== undefined ? (
                                                        <span className={`${styles.scoreBadge} ${getScoreBadgeClass(sub.score)}`}>
                                                            {sub.score.toFixed(1)} / 9.0
                                                        </span>
                                                    ) : (
                                                        <span className={styles.scoreEmpty}>---</span>
                                                    )}
                                                </td>

                                                {/* Action Column */}
                                                <td className={styles.colAction}>
                                                    <button
                                                        className={styles.btnView}
                                                        onClick={() => handleViewDetail(sub.submissionId)}
                                                        disabled={loadingDetail}
                                                    >
                                                        <i className="bi bi-eye"></i> Xem kết quả
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View (< 768px) */}
                        <div className={styles.mobileList}>
                            {displaySubmissions.map((sub) => {
                                const isSpeaking = (sub.skillType || 'SPEAKING').toUpperCase() === 'SPEAKING';
                                return (
                                    <div
                                        key={sub.submissionId}
                                        className={styles.mobileCard}
                                        onClick={() => handleViewDetail(sub.submissionId)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {/* Left Avatar Mic Circle */}
                                        <div className={styles.mobileAvatar}>
                                            <i className={isSpeaking ? "bi bi-mic-fill" : "bi bi-file-earmark-text"}></i>
                                        </div>

                                        {/* Center Info */}
                                        <div className={styles.mobileInfo}>
                                            <div className={styles.mobileCardTitle}>{sub.title}</div>

                                            <div className={styles.mobileCardTags}>
                                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(sub.status)}`}>
                                                    <i className="bi bi-check-circle-fill"></i>
                                                    {getStatusLabel(sub.status)}
                                                </span>
                                            </div>

                                            <div className={styles.mobileMeta}>
                                                <span><i className="bi bi-calendar3"></i>{formatMobileDate(sub.createdAt)}</span>
                                                <span><i className="bi bi-clock"></i>{formatMobileTime(sub.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Right Score & Chevron */}
                                        <div className={styles.mobileRight}>
                                            {sub.score !== null && sub.score !== undefined ? (
                                                <span className={`${styles.scoreBadge} ${getScoreBadgeClass(sub.score)}`}>
                                                    {sub.score.toFixed(1)} / 9.0
                                                </span>
                                            ) : (
                                                <span className={styles.scoreEmpty}>---</span>
                                            )}
                                            <i className={`bi bi-chevron-right ${styles.mobileChevron}`}></i>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Bar */}
                        <div className={styles.paginationBar}>
                            {/* Left Text */}
                            <div className={styles.paginationCount}>
                                Hiển thị <strong>{fromCount}–{toCount}</strong> của <strong>{displayTotalCount}</strong> bài nộp
                            </div>

                            {/* Center Buttons */}
                            <div className={styles.paginationControls}>
                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    title="Trang đầu"
                                >
                                    «
                                </button>
                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    title="Trang trước"
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                    // Show first, last, current, and adjacent pages
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                className={`${styles.pageNumberBtn} ${currentPage === page ? styles.pageNumberActive : ''}`}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        );
                                    }
                                    if (
                                        (page === currentPage - 2 && page > 1) ||
                                        (page === currentPage + 2 && page < totalPages)
                                    ) {
                                        return <span key={page} className={styles.paginationEllipsis}>…</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    title="Trang sau"
                                >
                                    ›
                                </button>
                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    title="Trang cuối"
                                >
                                    »
                                </button>
                            </div>

                            {/* Right Info */}
                            <div className={styles.paginationPageInfo}>
                                Trang <strong>{currentPage} / {totalPages}</strong>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className={`${styles.mobilePaginationWrapper} ${isPaginationVisible ? styles.mobilePaginationVisible : ''}`}>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    maxVisible={3}
                                    floatingOnMobile
                                    onInteraction={keepPaginationVisible}
                                    onPageChange={(page) => {
                                        setCurrentPage(page);
                                        keepPaginationVisible();
                                        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
