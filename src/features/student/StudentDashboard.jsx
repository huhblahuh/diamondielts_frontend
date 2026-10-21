import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import dashboardService from '../../api/services/dashboard.service';
import HeroArtwork from '../../components/common/HeroArtwork';
import styles from './StudentDashboard.module.css';

const EMPTY_ACTIVITY = { fromDate: '', toDate: '', monthCount: 2, currentStreak: 0, longestStreak: 0, totalActiveDays: 0, totalSubmissions: 0, days: [] };
const QUICK_PARTS = [
    { part: 'Part 1', subtitle: 'Câu hỏi cá nhân', icon: 'bi-chat-dots-fill', tone: 'blue' },
    { part: 'Part 2', subtitle: 'Nói theo chủ đề', icon: 'bi-file-earmark-text-fill', tone: 'purple' },
    { part: 'Part 3', subtitle: 'Thảo luận nâng cao', icon: 'bi-people-fill', tone: 'orange' },
];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌤️ Chào buổi sáng';
    if (hour < 18) return '☀️ Chào buổi chiều';
    return '🌙 Chào buổi tối';
}

function dateKey(value) {
    const date = value instanceof Date ? value : new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getRecentDays(count = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (count - index - 1));
        return date;
    });
}

function formatReset(resetDate) {
    if (!resetDate) return 'Không tự động đặt lại';
    const diff = new Date(resetDate).getTime() - Date.now();
    if (diff <= 0) return 'Sắp được đặt lại';
    const hours = Math.ceil(diff / 3600000);
    return hours < 24 ? `Đặt lại sau ${hours} giờ` : `Đặt lại sau ${Math.ceil(hours / 24)} ngày`;
}

function deadlineLabel(daysLeft) {
    if (daysLeft <= 0) return 'Hết hạn hôm nay';
    if (daysLeft === 1) return 'Còn 1 ngày';
    return `Còn ${daysLeft} ngày`;
}

function DeadlineRow({ deadline, onOpen }) {
    return (
        <button type="button" className={styles.deadlineRow} onClick={() => onOpen(deadline)}>
            <span className={`${styles.deadlineDate} ${deadline.daysLeft <= 1 ? styles.deadlineUrgent : ''}`}><i className="bi bi-calendar2-check" /></span>
            <span className={styles.deadlineCopy}>
                <strong>{deadline.title}</strong>
                <small>{deadline.className || 'Bài tập được giao'} · {deadlineLabel(deadline.daysLeft)}</small>
            </span>
            <i className="bi bi-chevron-right" />
        </button>
    );
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { mySpeakingQuota, isQuotaLoading, openMyQuota } = useOutletContext() || {};
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [activity, setActivity] = useState(EMPTY_ACTIVITY);
    const [summary, setSummary] = useState(null);
    const [activityLoading, setActivityLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [activityError, setActivityError] = useState('');
    const [summaryError, setSummaryError] = useState('');
    const [requestVersion, setRequestVersion] = useState(0);
    const [deadlineSheetOpen, setDeadlineSheetOpen] = useState(false);
    const closeRef = useRef(null);

    useEffect(() => {
        const syncUser = (event) => setUser(event.detail || JSON.parse(localStorage.getItem('user') || '{}'));
        window.addEventListener('diamond:user-updated', syncUser);
        return () => window.removeEventListener('diamond:user-updated', syncUser);
    }, []);

    useEffect(() => {
        let active = true;
        setActivityLoading(true);
        setActivityError('');
        dashboardService.getActivity({ months: 2 })
            .then((data) => { if (active) setActivity(data || EMPTY_ACTIVITY); })
            .catch((error) => {
                if (active) {
                    setActivity(EMPTY_ACTIVITY);
                    setActivityError(error?.message || 'Không thể tải nhịp luyện tập.');
                }
            })
            .finally(() => { if (active) setActivityLoading(false); });
        return () => { active = false; };
    }, [requestVersion]);

    useEffect(() => {
        let active = true;
        setSummaryLoading(true);
        setSummaryError('');
        dashboardService.getSummary({ includeProgress: false })
            .then((data) => { if (active) setSummary(data); })
            .catch((error) => {
                if (active) {
                    setSummary(null);
                    setSummaryError(error?.message || 'Không thể tải deadline.');
                }
            })
            .finally(() => { if (active) setSummaryLoading(false); });
        return () => { active = false; };
    }, [requestVersion]);

    useEffect(() => {
        if (!deadlineSheetOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => { if (event.key === 'Escape') setDeadlineSheetOpen(false); };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        window.requestAnimationFrame(() => closeRef.current?.focus());
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [deadlineSheetOpen]);

    const activityByDate = useMemo(() => new Map((activity.days || []).map((day) => [dateKey(day.date), day.completedAttempts || 0])), [activity.days]);
    const recentDays = useMemo(() => getRecentDays(), []);
    const currentMonth = dateKey(new Date()).slice(0, 7);
    const monthlySubmissions = (activity.days || []).filter((day) => dateKey(day.date).startsWith(currentMonth)).reduce((total, day) => total + (day.completedAttempts || 0), 0);
    const deadlines = summary?.upcomingDeadlines || [];
    const nearestDeadline = deadlines[0];
    const quotaPercent = Math.min(100, Math.max(0, Number(mySpeakingQuota?.usagePercentage || 0)));

    const openAssignment = (deadline) => {
        setDeadlineSheetOpen(false);
        navigate(`/student/assignments/${deadline.assignmentId}`, { state: { classId: deadline.classId } });
    };

    return (
        <div className={styles.container}>
            <section className={styles.heroSection}>
                <div className={styles.heroCopy}>
                    <p>{getGreeting()},</p>
                    <h1>{user.fullName || 'Học viên'}!</h1>
                    <span>Theo dõi tiến độ và tiếp tục luyện tập.</span>
                </div>
                <HeroArtwork variant="home" className={styles.heroArtwork} />
            </section>

            {(activityError || summaryError) && (
                <div className={styles.errorBanner} role="alert">
                    <i className="bi bi-exclamation-circle" />
                    <span>{[activityError, summaryError].filter(Boolean).join(' ')}</span>
                    <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Thử lại</button>
                </div>
            )}

            <section className={styles.statsGrid} aria-label="Thống kê luyện tập">
                <article className={`${styles.statCard} ${styles.fireCard}`}><span className={styles.statIcon}><i className="bi bi-fire" /></span><div><strong>{activityLoading ? '—' : activity.currentStreak} <small>ngày</small></strong><p>Chuỗi hiện tại</p></div></article>
                <article className={`${styles.statCard} ${styles.crownCard}`}><span className={styles.statIcon}><i className="bi bi-award-fill" /></span><div><strong>{activityLoading ? '—' : activity.longestStreak} <small>ngày</small></strong><p>Chuỗi dài nhất</p></div></article>
                <article className={`${styles.statCard} ${styles.submitCard}`}><span className={styles.statIcon}><i className="bi bi-file-earmark-check-fill" /></span><div><strong>{activityLoading ? '—' : monthlySubmissions}</strong><p>Lượt nộp trong tháng</p></div></article>
            </section>

            <button type="button" className={styles.quotaStrip} onClick={openMyQuota} disabled={isQuotaLoading}>
                <span className={styles.quotaIcon}><i className="bi bi-mic-fill" /></span>
                <span className={styles.quotaMain}>
                    <span className={styles.quotaTitle}><strong>Kim cương Speaking</strong><b>{isQuotaLoading ? 'Đang tải…' : mySpeakingQuota ? `Còn ${Number(mySpeakingQuota.remaining).toLocaleString('vi-VN')}/${Number(mySpeakingQuota.limit).toLocaleString('vi-VN')} kim cương` : 'Chưa được cấp'}</b></span>
                    <span className={styles.quotaTrack}><i style={{ width: `${quotaPercent}%` }} /></span>
                    <small>{mySpeakingQuota ? formatReset(mySpeakingQuota.resetDate) : 'Chạm để xem chi tiết hạn mức'}</small>
                </span>
                <i className="bi bi-chevron-right" />
            </button>

            <div className={styles.primaryGrid}>
                <section className={styles.practiceCard}>
                    <div className={styles.practiceContent}>
                        <span className={styles.eyebrow}>IELTS Speaking</span><h2>Luyện tập</h2>
                        <p>Chọn chủ đề phù hợp và luyện nói theo tốc độ của bạn.</p>
                        <button type="button" onClick={() => navigate('/student/practice')}>Bắt đầu luyện tập <i className="bi bi-arrow-right" /></button>
                    </div>
                    <div className={styles.practiceVisual} aria-hidden="true"><i className="bi bi-chat-quote-fill" /><span><i className="bi bi-mic-fill" /></span></div>
                </section>

                <section className={styles.deadlineCard} aria-busy={summaryLoading}>
                    <header><div><span className={styles.eyebrow}>{summaryLoading ? 'Đang tải deadline' : `${deadlines.length} bài cần hoàn thành`}</span><h2>Deadline sắp tới</h2></div>{deadlines.length > 1 && <button type="button" onClick={() => setDeadlineSheetOpen(true)}>Xem tất cả</button>}</header>
                    {summaryLoading ? <div className={styles.cardSkeleton} role="status">Đang tải deadline…</div> : nearestDeadline ? <DeadlineRow deadline={nearestDeadline} onOpen={openAssignment} /> : <div className={styles.emptyDeadline}><i className="bi bi-check2-circle" /><span><strong>Bạn đã hoàn thành!</strong><small>Hiện không có deadline sắp tới.</small></span></div>}
                </section>
            </div>

            <section className={styles.rhythmCard} aria-busy={activityLoading}>
                <header><h2>Nhịp luyện tập</h2><button type="button" onClick={() => navigate('/student/dashboard/progress')}>Xem tất cả <i className="bi bi-chevron-right" /></button></header>
                <div className={styles.weekGrid}>
                    {recentDays.map((date) => {
                        const count = activityByDate.get(dateKey(date)) || 0;
                        const isToday = dateKey(date) === dateKey(new Date());
                        return <div key={dateKey(date)} className={`${styles.dayCard} ${isToday ? styles.today : ''}`}><span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date).replace('Th ', 'T')}</span><strong>{date.getDate()}</strong><i className={count > 0 ? 'bi bi-check-circle-fill' : 'bi bi-circle'} aria-label={count > 0 ? `${count} lượt hoàn thành` : 'Chưa luyện tập'} /></div>;
                    })}
                </div>
            </section>

            <section className={styles.quickCard}>
                <header><h2>Luyện tập nhanh</h2><button type="button" onClick={() => navigate('/student/practice')}>Xem tất cả <i className="bi bi-chevron-right" /></button></header>
                <div className={styles.quickGrid}>{QUICK_PARTS.map((item) => <button type="button" key={item.part} className={`${styles.quickItem} ${styles[item.tone]}`} onClick={() => navigate(`/student/practice?part=${encodeURIComponent(item.part)}`)}><span><i className={`bi ${item.icon}`} /></span><strong>{item.part}</strong><small>{item.subtitle}</small></button>)}</div>
            </section>

            {deadlineSheetOpen && createPortal(
                <div className={styles.sheetBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDeadlineSheetOpen(false); }}>
                    <section className={styles.deadlineSheet} role="dialog" aria-modal="true" aria-labelledby="deadline-sheet-title">
                        <div className={styles.sheetHandle} />
                        <header><div><span>{deadlines.length} bài tập</span><h2 id="deadline-sheet-title">Deadline sắp tới</h2></div><button ref={closeRef} type="button" onClick={() => setDeadlineSheetOpen(false)} aria-label="Đóng"><i className="bi bi-x-lg" /></button></header>
                        <div className={styles.sheetList}>{deadlines.map((deadline) => <DeadlineRow key={deadline.assignmentId} deadline={deadline} onOpen={openAssignment} />)}</div>
                    </section>
                </div>,
                document.body,
            )}
        </div>
    );
}
