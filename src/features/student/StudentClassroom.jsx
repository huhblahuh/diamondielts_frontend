import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './StudentClassroom.module.css';
import Swal from 'sweetalert2';
import Pagination from '../../components/Pagination';
import HeroArtwork from '../../components/common/HeroArtwork';
import PageSkeleton from '../../components/common/PageSkeleton';
import { parseAssignmentDueDate } from '../../utils/assignmentDate';

export default function StudentClassroom() {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const paginationHideTimerRef = useRef(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [deadlines, setDeadlines] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingDeadlines, setLoadingDeadlines] = useState(false);

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'overdue'
    const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'none'
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [isPaginationVisible, setIsPaginationVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;

    const handleSelectClass = (cls) => {
        setSelectedClass(cls);
        setCurrentPage(1);
        setSearchTerm('');
        setStatusFilter('all');
        setTimeFilter('all');
        if (cls?.classId) {
            localStorage.setItem('student_selected_class_id', cls.classId);
        }
    };

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                const data = await axiosClient.get('/student/classroom');
                const classList = data || [];
                setClasses(classList);

                if (classList.length > 0) {
                    const targetClassId = location.state?.classId || Number(localStorage.getItem('student_selected_class_id'));
                    const targetClass = classList.find(c => c.classId === targetClassId) || classList[0];
                    setSelectedClass(targetClass);
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Lỗi', 'Không thể tải danh sách lớp học', 'error');
            } finally {
                setLoadingClasses(false);
            }
        };
        fetchClasses();
    }, [location.state?.classId]);

    useEffect(() => {
        if (!selectedClass) return;
        const fetchDeadlines = async () => {
            try {
                setLoadingDeadlines(true);
                const data = await axiosClient.get(`/student/assignment/class/${selectedClass.classId}`);
                setDeadlines(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingDeadlines(false);
            }
        };
        fetchDeadlines();
    }, [selectedClass]);

    const formatDateTime = (isoStr) => {
        if (!isoStr) return "Không thời hạn";
        const d = parseAssignmentDueDate(isoStr);
        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${time} · ${date}`;
    };

    const getStatusInfo = (dueDate) => {
        if (!dueDate) return { text: 'Không thời hạn', type: 'neutral' };
        const now = Date.now();
        const diff = parseAssignmentDueDate(dueDate).getTime() - now;
        if (diff <= 0) return { text: 'Đã quá hạn', type: 'overdue' };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days === 0) return { text: hours > 0 ? `Còn ${hours} giờ` : 'Hết hạn hôm nay', type: 'urgent' };
        if (days <= 3) return { text: `Còn ${days} ngày`, type: 'urgent' };
        return { text: `Còn ${days} ngày`, type: 'open' };
    };

    // Filter counts
    const overdueCount = useMemo(() => {
        return deadlines.filter(dl => dl.dueDate && parseAssignmentDueDate(dl.dueDate) < new Date()).length;
    }, [deadlines]);
    const openCount = deadlines.length - overdueCount;

    // Filtered deadlines
    const filteredDeadlines = useMemo(() => {
        return deadlines.filter(dl => {
            const isOverdue = dl.dueDate && parseAssignmentDueDate(dl.dueDate) < new Date();
            if (statusFilter === 'open' && isOverdue) return false;
            if (statusFilter === 'overdue' && !isOverdue) return false;
            if (timeFilter !== 'all') {
                if (timeFilter === 'none') return !dl.dueDate;
                if (!dl.dueDate) return false;

                const now = new Date();
                const dueDate = parseAssignmentDueDate(dl.dueDate);
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endOfToday = new Date(startOfToday);
                endOfToday.setDate(endOfToday.getDate() + 1);

                if (timeFilter === 'today' && (dueDate < startOfToday || dueDate >= endOfToday)) return false;
                if (timeFilter === 'week') {
                    const endOfWeek = new Date(now);
                    endOfWeek.setDate(endOfWeek.getDate() + 7);
                    if (dueDate < now || dueDate > endOfWeek) return false;
                }
                if (timeFilter === 'month') {
                    const endOfMonth = new Date(now);
                    endOfMonth.setDate(endOfMonth.getDate() + 30);
                    if (dueDate < now || dueDate > endOfMonth) return false;
                }
            }
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchTitle = (dl.title || '').toLowerCase().includes(term);
                if (!matchTitle) return false;
            }
            return true;
        });
    }, [deadlines, statusFilter, timeFilter, searchTerm]);

    const totalPages = Math.ceil(filteredDeadlines.length / PAGE_SIZE) || 1;
    const paginatedDeadlines = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredDeadlines.slice(start, start + PAGE_SIZE);
    }, [filteredDeadlines, currentPage]);

    const keepPaginationVisible = () => {
        if (totalPages <= 1) return;
        setIsPaginationVisible(true);
        window.clearTimeout(paginationHideTimerRef.current);
        paginationHideTimerRef.current = window.setTimeout(() => {
            setIsPaginationVisible(false);
        }, 1000);
    };

    useEffect(() => {
        let scrollParent = containerRef.current?.parentElement;
        while (scrollParent && scrollParent !== document.body) {
            const overflowY = window.getComputedStyle(scrollParent).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') break;
            scrollParent = scrollParent.parentElement;
        }

        if (!scrollParent || scrollParent === document.body) return undefined;
        scrollContainerRef.current = scrollParent;

        const revealPagination = () => {
            keepPaginationVisible();
        };

        scrollParent.addEventListener('scroll', revealPagination, { passive: true });
        return () => {
            scrollParent.removeEventListener('scroll', revealPagination);
            window.clearTimeout(paginationHideTimerRef.current);
        };
    }, [totalPages]);

    if (loadingClasses) {
        return <PageSkeleton variant="classrooms" />;
    }

    if (classes.length === 0) {
        return (
            <div className={`${styles.container} ${styles.emptyState}`}>
                <div className={styles.emptyContainer}>
                    <div className={styles.emptyIcon}>
                        <i className="bi bi-mortarboard"></i>
                    </div>
                    <h3>Chưa tham gia lớp học nào</h3>
                    <p>Bạn chưa được thêm vào bất kỳ lớp học nào. Vui lòng liên hệ giáo viên để được thêm vào lớp.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
                {/* ── Class Header with Bar Selection ── */}
                <div className={styles.classHeader}>
                    <div className={styles.classHeaderTop}>
                        <div className={styles.headerInfo}>
                            <div className={`${styles.classNameSelector} ${classes.length > 1 ? styles.classNameSelectorInteractive : ''}`}>
                                <h1 className={styles.classNameTitle}>{selectedClass?.className || ''}</h1>
                                {classes.length > 1 && (
                                    <select
                                        className={styles.classNameSelect}
                                        value={selectedClass?.classId || ''}
                                        onChange={(e) => {
                                            const found = classes.find(c => c.classId === Number(e.target.value));
                                            if (found) handleSelectClass(found);
                                        }}
                                        aria-label="Chọn lớp học"
                                    >
                                        {classes.map(cls => (
                                            <option key={cls.classId} value={cls.classId}>
                                                {cls.className}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className={styles.classTagline}>Danh sách lớp học và bài tập của bạn.</p>
                        </div>
                        <HeroArtwork variant="assignment" className={styles.heroArtwork} />
                    </div>
                </div>

            <div className={styles.content}>
                {/* ── Toolbar: Search & Filter Tabs ── */}
                <div className={styles.toolbar}>
                    <div className={styles.filterTabs} role="tablist" aria-label="Lọc bài tập">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === 'all'}
                            className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.filterBtnActive : ''}`}
                            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                        >
                            Tất cả <span className={styles.filterCount}>{deadlines.length}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === 'open'}
                            className={`${styles.filterBtn} ${statusFilter === 'open' ? styles.filterBtnActive : ''}`}
                            onClick={() => { setStatusFilter('open'); setCurrentPage(1); }}
                        >
                            Đang mở <span className={styles.filterCount}>{openCount}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === 'overdue'}
                            className={`${styles.filterBtn} ${statusFilter === 'overdue' ? styles.filterBtnActive : ''}`}
                            onClick={() => { setStatusFilter('overdue'); setCurrentPage(1); }}
                        >
                            Quá hạn <span className={styles.filterCount}>{overdueCount}</span>
                        </button>
                    </div>

                    <div className={styles.mobileSearchRow}>
                        <div className={styles.searchBox}>
                            <i className={`bi bi-search ${styles.searchIcon}`}></i>
                            <input
                                type="text"
                                placeholder="Tìm theo tên bài tập..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className={styles.searchInput}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className={styles.clearSearchBtn}
                                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                    aria-label="Xóa tìm kiếm"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            className={`${styles.mobileFilterTrigger} ${(statusFilter !== 'all' || timeFilter !== 'all') ? styles.mobileFilterTriggerActive : ''}`}
                            onClick={() => setIsMobileFilterOpen(open => !open)}
                            aria-label="Lọc bài tập"
                            aria-expanded={isMobileFilterOpen}
                        >
                            <i className="bi bi-funnel"></i>
                            {(statusFilter !== 'all' || timeFilter !== 'all') && <span className={styles.mobileFilterDot}></span>}
                        </button>
                        {isMobileFilterOpen && (
                            <div className={styles.mobileFilterMenu} role="menu">
                                <p className={styles.mobileFilterHeading}>Trạng thái</p>
                                {[
                                    ['all', 'Tất cả', deadlines.length],
                                    ['open', 'Đang mở', openCount],
                                    ['overdue', 'Quá hạn', overdueCount]
                                ].map(([value, label, count]) => (
                                    <button
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={statusFilter === value}
                                        key={value}
                                        onClick={() => {
                                            setStatusFilter(value);
                                            setCurrentPage(1);
                                            setIsMobileFilterOpen(false);
                                        }}
                                    >
                                        <span>{label}</span>
                                        <strong>{count}</strong>
                                        {statusFilter === value && <i className="bi bi-check2"></i>}
                                    </button>
                                ))}
                                <div className={styles.mobileFilterDivider}></div>
                                <p className={styles.mobileFilterHeading}>Thời hạn</p>
                                {[
                                    ['all', 'Tất cả thời gian'],
                                    ['today', 'Hôm nay'],
                                    ['week', '7 ngày tới'],
                                    ['month', '30 ngày tới'],
                                    ['none', 'Không thời hạn']
                                ].map(([value, label]) => (
                                    <button
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={timeFilter === value}
                                        key={value}
                                        onClick={() => {
                                            setTimeFilter(value);
                                            setCurrentPage(1);
                                            setIsMobileFilterOpen(false);
                                        }}
                                    >
                                        <span>{label}</span>
                                        <span></span>
                                        {timeFilter === value && <i className="bi bi-check2"></i>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Assignment Section & Grid ── */}
                <div className={styles.deadlineSection}>
                    {loadingDeadlines ? (
                        <div className={styles.loadingDeadlines}>
                            <div className={styles.loadingSpinner}></div>
                            <span>Đang cập nhật danh sách bài tập...</span>
                        </div>
                    ) : filteredDeadlines.length === 0 ? (
                        <div className={styles.emptyDeadlines}>
                            <div className={styles.emptyDeadlinesIcon}>
                                <i className={searchTerm || statusFilter !== 'all' || timeFilter !== 'all' ? 'bi bi-search' : 'bi bi-check2-circle'}></i>
                            </div>
                            <h4>
                                {searchTerm || statusFilter !== 'all' || timeFilter !== 'all'
                                    ? 'Không tìm thấy bài tập nào'
                                    : 'Lớp học hiện không có bài tập nào'}
                            </h4>
                            <p>
                                {searchTerm || statusFilter !== 'all' || timeFilter !== 'all'
                                    ? 'Vui lòng thử thay đổi từ khóa hoặc bộ lọc trạng thái.'
                                    : 'Bạn đã hoàn thành tất cả nhiệm vụ được giao.'}
                            </p>
                            {(searchTerm || statusFilter !== 'all' || timeFilter !== 'all') && (
                                <button
                                    type="button"
                                    className={styles.btnResetFilter}
                                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTimeFilter('all'); setCurrentPage(1); }}
                                >
                                    Xem tất cả bài tập
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className={styles.deadlineGrid}>
                                {paginatedDeadlines.map(dl => {
                                    const status = getStatusInfo(dl.dueDate);
                                    const isOverdue = status.type === 'overdue';

                                    return (
                                        <div
                                            key={dl.assignmentId}
                                            className={`${styles.dlCard} ${isOverdue ? styles.cardOverdue : ''}`}
                                            onClick={() => navigate(`/student/assignments/${dl.assignmentId}`, { state: { classId: selectedClass?.classId } })}
                                        >
                                            <div className={styles.cardHeader}>
                                                <span className={`${styles.statusBadge} ${styles['status_' + status.type]}`}>
                                                    <i className={isOverdue ? 'bi bi-exclamation-circle' : 'bi bi-clock'}></i>
                                                    {status.text}
                                                </span>
                                                <span className={styles.itemCountBadge}>
                                                    <i className="bi bi-layers-fill"></i>
                                                    {dl.itemCount || 0} mục
                                                </span>
                                            </div>

                                            <div className={styles.cardBody}>
                                                <h3 className={styles.dlTitle} title={dl.title}>
                                                    {dl.title}
                                                </h3>
                                                <div className={styles.dlMeta}>
                                                    <i className="bi bi-calendar-event"></i>
                                                    <span>Hạn nộp: <strong>{formatDateTime(dl.dueDate)}</strong></span>
                                                </div>
                                            </div>

                                            <div className={styles.cardFooter}>
                                                <button
                                                    type="button"
                                                    className={`${styles.btnDo} ${isOverdue ? styles.btnReview : styles.btnStart}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/student/assignments/${dl.assignmentId}`, { state: { classId: selectedClass?.classId } });
                                                    }}
                                                >
                                                    <span>{isOverdue ? 'Xem lại bài' : 'Bắt đầu làm'}</span>
                                                    <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className={`${styles.paginationWrapper} ${isPaginationVisible ? styles.paginationWrapperVisible : ''}`}>
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
        </div>
    );
}
