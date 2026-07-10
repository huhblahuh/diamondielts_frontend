import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StudentDashboard.module.css';
import dashboardService from '../../api/services/dashboard.service';
import axiosClient from '../../api/axiosClient';

function getStatusLabel(status) {
    if (status === 'Completed') return 'Đã chấm';
    if (status === 'Grading') return 'Đang chấm';
    return 'Chờ chấm';
}
function getStatusBadgeClass(status) {
    if (status === 'Completed') return styles.statusCompleted;
    if (status === 'Grading') return styles.statusGrading;
    return styles.statusPending;
}
function getScoreBadgeClass(score) {
    if (score >= 7.0) return styles.scoreGreen;
    if (score >= 5.0) return styles.scoreYellow;
    return styles.scoreRed;
}
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ─── Helper: Lời chào theo giờ ──────────────────────────────────────────────
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌤️ Chào buổi sáng';
    if (hour < 18) return '☀️ Chào buổi chiều';
    return '🌙 Chào buổi tối';
}

// ─── Helper: Avatar ký tự đầu tên ────────────────────────────────────────────
function getInitials(name = '') {
    return name.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase() || '?';
}

// ─── Helper: Tạo lưới đóng góp dạng động theo số lượng tuần ──────────────────
function buildHeatmapGrid(numWeeks = 12) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm ngày Thứ 2 của tuần hiện tại
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToMonday);

    // Đi ngược (numWeeks - 1) tuần nữa
    const startDay = new Date(thisMonday);
    startDay.setDate(thisMonday.getDate() - (numWeeks - 1) * 7);

    const days = [];
    for (let i = 0; i < numWeeks * 7; i++) {
        const d = new Date(startDay);
        d.setDate(startDay.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push({ dateStr: `${yyyy}-${mm}-${dd}`, dateObj: d });
    }
    return days;
}

// ─── Helper: Map heatmap data → lookup {date: count} ─────────────────────────
function buildHeatmapMap(activityHeatmap = []) {
    const map = {};
    activityHeatmap.forEach(({ date, count }) => { map[date] = count; });
    return map;
}

// ─── Helper: Màu ô heatmap ───────────────────────────────────────────────────
function getHeatColor(count) {
    if (!count || count === 0) return styles.heat0;
    if (count === 1) return styles.heat1;
    if (count <= 3) return styles.heat2;
    return styles.heat3;
}

// ─── Helper: Label tháng trên heatmap ────────────────────────────────────────
// Trả về [{colIndex, label}] — label chỉ xuất hiện khi bắt đầu tháng mới
function buildMonthLabels(gridDays) {
    const labels = [];
    let lastMonth = -1;
    gridDays.forEach(({ dateObj }, i) => {
        const col = Math.floor(i / 7); // mỗi cột = 1 tuần
        const month = dateObj.getMonth();
        if (month !== lastMonth) {
            const monthNames = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
            labels.push({ col, label: monthNames[month] });
            lastMonth = month;
        }
    });
    return labels;
}

// ─── Helper: Tính chuỗi ngày học liên tiếp ───────────────────────────────────
// Đếm ngược từ hôm nay. Nếu hôm nay chưa có activity, bắt đầu từ hôm qua.
function calcStreak(activityHeatmap = []) {
    if (!activityHeatmap || activityHeatmap.length === 0) return 0;

    const map = buildHeatmapMap(activityHeatmap);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fmt = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Nếu hôm nay chưa học, bắt đầu check từ hôm qua
    let cursor = new Date(today);
    if (!map[fmt(cursor)]) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (map[fmt(cursor)] > 0) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
        // Giới hạn tối đa 365 ngày để tránh vòng lặp vô hạn
        if (streak > 365) break;
    }
    return streak;
}

// ─── Sub-component: Streak Badge ─────────────────────────────────────────────
function StreakBadge({ streak }) {
    if (streak === 0) return null;
    return (
        <div className={styles.streakBadge}>
            <span className={styles.streakFlame}>🔥</span>
            <span className={styles.streakCount}>{streak}</span>
            <span className={styles.streakText}>ngày</span>
        </div>
    );
}


function StatCard({ icon, value, label, colorClass }) {
    return (
        <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${colorClass}`}>
                <i className={`bi ${icon}`}></i>
            </div>
            <div>
                <span className={styles.statVal}>{value}</span>
                <p className={styles.statLabel}>{label}</p>
            </div>
        </div>
    );
}

// ─── Sub-component: Deadline Card ────────────────────────────────────────────
function DeadlineCard({ deadline, onClick }) {
    const { title, className, daysLeft } = deadline;

    let urgencyClass = styles.urgencyGreen;
    let urgencyText = `Còn ${daysLeft} ngày`;
    if (daysLeft <= 0) {
        urgencyClass = styles.urgencyRed;
        urgencyText = 'Hết hạn hôm nay';
    } else if (daysLeft === 1) {
        urgencyClass = styles.urgencyRed;
        urgencyText = 'Còn 1 ngày';
    } else if (daysLeft <= 3) {
        urgencyClass = styles.urgencyYellow;
        urgencyText = `Còn ${daysLeft} ngày`;
    }

    return (
        <div className={styles.deadlineCard} onClick={onClick}>
            <div className={styles.deadlineInfo}>
                <span className={`${styles.urgencyBadge} ${urgencyClass}`}>{urgencyText}</span>
                <h4 className={styles.deadlineTitle}>{title}</h4>
                <p className={styles.deadlineClass}>
                    <i className="bi bi-mortarboard"></i> {className}
                </p>
            </div>
            <i className="bi bi-chevron-right"></i>
        </div>
    );
}

// ─── Sub-component: Activity Heatmap ─────────────────────────────────────────
// CELL_SIZE + GAP = 16px mỗi cột (khớp với CSS .heatCell + gap weeksRow)
const CELL = 13; // px
const GAP  = 3;  // px
const COL_W = CELL + GAP; // = 16

function ActivityHeatmap({ activityHeatmap }) {
    const wrapperRef = useRef(null); // đo trên inner wrapper (đã trừ padding card)
    const [weeksCount, setWeeksCount] = useState(24);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            // contentBoxSize cho kích thước nội dung, không bao gồm padding
            const fullWidth = entry.contentRect.width;
            // Trừ dayLabels column (≈28px) + 1 khoảng gap
            const available = fullWidth - 28 - GAP;
            const count = Math.max(4, Math.floor(available / COL_W));
            setWeeksCount(count);
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const gridDays = useMemo(() => buildHeatmapGrid(weeksCount), [weeksCount]);
    const heatMap = useMemo(() => buildHeatmapMap(activityHeatmap), [activityHeatmap]);
    const monthLabels = useMemo(() => buildMonthLabels(gridDays), [gridDays]);

    const DAY_LABELS = ['T2', '', 'T4', '', 'T6', '', 'CN'];

    // Nhóm theo cột (tuần)
    const weeks = [];
    for (let col = 0; col < weeksCount; col++) {
        weeks.push(gridDays.slice(col * 7, col * 7 + 7));
    }

    return (
        <div className={styles.heatmapCard}>
            <h3 className={styles.sectionTitle}>
                <i className="bi bi-activity"></i> Hoạt động luyện tập
            </h3>

            <div className={styles.heatmapWrapper} ref={wrapperRef}>
                {/* Label ngày trong tuần (cột trái) */}
                <div className={styles.dayLabels}>
                    {DAY_LABELS.map((label, i) => (
                        <span key={i} className={styles.dayLabel}>{label}</span>
                    ))}
                </div>

                {/* Grid chính */}
                <div className={styles.heatmapGrid}>
                    {/* Label tháng */}
                    <div className={styles.monthLabels} style={{ gridTemplateColumns: `repeat(${weeksCount}, ${COL_W}px)` }}>
                        {monthLabels.map(({ col, label }) => (
                            <span
                                key={col}
                                className={styles.monthLabel}
                                style={{ gridColumn: col + 1 }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Các cột tuần */}
                    <div className={styles.weeksRow}>
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className={styles.weekCol}>
                                {week.map(({ dateStr, dateObj }) => {
                                    const count = heatMap[dateStr] || 0;
                                    const formatted = dateObj.toLocaleDateString('vi-VN', {
                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                    });
                                    const tooltip = count > 0
                                        ? `${count} lần luyện tập — ${formatted}`
                                        : `Không có hoạt động — ${formatted}`;
                                    return (
                                        <div
                                            key={dateStr}
                                            className={`${styles.heatCell} ${getHeatColor(count)}`}
                                            title={tooltip}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chú thích */}
            <div className={styles.heatmapLegend}>
                <span className={styles.legendLabel}>Ít hơn</span>
                <div className={`${styles.legendCell} ${styles.heat0}`} />
                <div className={`${styles.legendCell} ${styles.heat1}`} />
                <div className={`${styles.legendCell} ${styles.heat2}`} />
                <div className={`${styles.legendCell} ${styles.heat3}`} />
                <span className={styles.legendLabel}>Nhiều hơn</span>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function StudentDashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(true);

    // Tính streak 1 lần, cache lại theo summary
    const streak = useMemo(() =>
        summary ? calcStreak(summary.activityHeatmap) : 0,
    [summary]);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setLoading(true);
                const data = await dashboardService.getSummary();
                setSummary(data);
            } catch (err) {
                console.error('Dashboard load error:', err);
                setError('Không thể tải dữ liệu dashboard.');
            } finally {
                setLoading(false);
            }
        };

        const fetchSubmissions = async () => {
            try {
                setLoadingSubmissions(true);
                const res = await axiosClient.get('/student/dashboard/submissions?page=1&pageSize=5');
                if (res) {
                    setRecentSubmissions(res.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch recent submissions:', err);
            } finally {
                setLoadingSubmissions(false);
            }
        };

        fetchSummary();
        fetchSubmissions();
    }, []);

    return (
        <div className={styles.container}>

            {/* ── Welcome Banner ── */}
            <div className={styles.welcomeBanner}>
                <div className={styles.welcomeLeft}>
                    <div className={styles.avatar}>
                        {!loading && summary && streak > 0 ? streak : 0}
                        {!loading && summary && streak > 0 && (
                            <span className={styles.avatarFlame}>🔥</span>
                        )}
                    </div>
                    <div>
                        <p className={styles.greeting}>{getGreeting()},</p>
                        <h1 className={styles.welcomeName}>{user.fullName || 'Học viên'}!</h1>
                        <p className={styles.welcomeSub}>Hôm nay bạn đã sẵn sàng luyện tập chưa?</p>
                    </div>
                </div>
            </div>

            {/* ── Stats Row ── */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon="bi-mortarboard-fill"
                    value={loading ? '—' : (summary?.totalClasses ?? 0)}
                    label="Lớp đang học"
                    colorClass={styles.purple}
                />
                <StatCard
                    icon="bi-calendar-event-fill"
                    value={loading ? '—' : (summary?.upcomingDeadlines?.length ?? 0)}
                    label="Deadline sắp tới"
                    colorClass={styles.orange}
                />
                <StatCard
                    icon="bi-mic-fill"
                    value={loading ? '—' : (summary?.totalSubmissions ?? 0)}
                    label="Lần luyện speaking"
                    colorClass={styles.blue}
                />
                {!loading && summary && streak > 0 && (
                    <StatCard
                        icon="bi-fire"
                        value={`${streak}🔥`}
                        label="Ngày học liên tiếp"
                        colorClass={styles.gold}
                    />
                )}
            </div>

            {/* ── Main 2-column layout ── */}
            <div className={styles.mainGrid}>

                {/* Cột trái: Heatmap */}
                <div className={styles.leftCol}>
                    {!loading && summary && (
                        <ActivityHeatmap activityHeatmap={summary.activityHeatmap} />
                    )}
                    {loading && <div className={styles.skeletonCard} />}
                </div>

                {/* Cột phải: Deadlines */}
                <div className={styles.rightCol}>
                    <div className={styles.deadlineCard_wrapper}>
                        <h3 className={styles.sectionTitle}>
                            <i className="bi bi-clock-history"></i> Deadline sắp tới
                        </h3>

                        {loading && (
                            <>
                                <div className={styles.skeletonItem} />
                                <div className={styles.skeletonItem} />
                                <div className={styles.skeletonItem} />
                            </>
                        )}

                        {error && (
                            <div className={styles.errorMsg}>
                                <i className="bi bi-exclamation-triangle"></i> {error}
                            </div>
                        )}

                        {!loading && !error && summary?.upcomingDeadlines?.length === 0 && (
                            <div className={styles.emptyState}>
                                <i className="bi bi-check2-circle"></i>
                                <p>Tuyệt! Không có deadline nào sắp tới.</p>
                            </div>
                        )}

                        {!loading && !error && summary?.upcomingDeadlines?.slice(0, 3).map(dl => (
                            <DeadlineCard
                                key={dl.assignmentId}
                                deadline={dl}
                                onClick={() => navigate(`/student/assignment/${dl.assignmentId}`)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Lịch sử làm bài gần đây ── */}
            <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                    <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                        <i className="bi bi-clock-history"></i> Lịch sử làm bài gần đây
                    </h3>
                    <button className={styles.viewAllBtn} onClick={() => navigate('/student/history')}>
                        Xem tất cả <i className="bi bi-arrow-right"></i>
                    </button>
                </div>

                {loadingSubmissions ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Đang đồng bộ lịch sử bài làm...
                    </div>
                ) : recentSubmissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontStyle: 'italic' }}>
                        Bạn chưa nộp bài tập nào. Hãy bắt đầu học nhé!
                    </div>
                ) : (
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
                                    <th>Điểm số</th>
                                    <th style={{ textAlign: 'right' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSubmissions.map((sub) => (
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
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chờ chấm</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className={styles.viewAllBtn} 
                                                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                                                onClick={() => navigate('/student/history')}
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
