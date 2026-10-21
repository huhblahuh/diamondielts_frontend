import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import profileService from '../../../api/services/profile.service';
import ScoreProgressChart from '../../dashboard/components/ScoreProgressChart';
import styles from './StudentProfileModal.module.css';

const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonth = (month, amount) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const shifted = new Date(year, monthNumber - 1 + amount, 1);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

const initials = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return words.length > 1 ? `${words[0][0]}${words.at(-1)[0]}`.toUpperCase() : (words[0] || '?').slice(0, 2).toUpperCase();
};

const activityLevel = (count) => count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;

export default function StudentProfileModal({ student, onClose }) {
    const [month, setMonth] = useState(currentMonth);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        if (!student) return undefined;
        let active = true;
        setLoading(true);
        setError('');
        setData(null);
        profileService.getStudentProfile(student.studentId, { month }).then((result) => {
            if (active) setData(result);
        }).catch(() => {
            if (active) setError('Không thể tải hồ sơ học viên. Vui lòng thử lại.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [student?.studentId, month, requestVersion]);

    useEffect(() => {
        if (!student) return undefined;
        const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [student, onClose]);

    const days = data?.activity?.days || [];
    const leadingDays = useMemo(() => {
        if (!days.length) return 0;
        return (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7;
    }, [days]);

    if (!student) return null;

    const profile = data?.profile;
    return createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Hồ sơ học viên ${student.fullName}`}>
                <header className={styles.header}>
                    <div>
                        <span className={styles.eyebrow}>Hồ sơ học viên</span>
                        <h2>{profile?.fullName || student.fullName}</h2>
                    </div>
                    <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng hồ sơ">×</button>
                </header>

                <div className={styles.body}>
                    <div className={styles.topRow}>
                        <div className={styles.profileCard}>
                            <span className={styles.avatar} aria-hidden="true">
                                {initials(profile?.fullName || student.fullName)}
                                {profile?.avatarUrl && <img src={profile.avatarUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                            </span>
                            <div className={styles.profileInfo}>
                                <strong>{profile?.fullName || student.fullName}</strong>
                                {profile?.email && <span>{profile.email}</span>}
                                {profile?.username && <span>@{profile.username}</span>}
                            </div>
                            <div className={styles.overall}>
                                <span>Điểm Speaking TB</span>
                                <strong>{data?.overallScore == null ? '—' : `${data.overallScore} / 9`}</strong>
                                <small>{data?.scoredAttemptCount ?? 0} lượt được chấm</small>
                            </div>
                        </div>
                        <div className={styles.monthFilter}>
                            <div><strong>Tháng thống kê</strong><span>Biểu đồ điểm và heatmap</span></div>
                            <div className={styles.monthControls}>
                                <button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))} aria-label="Tháng trước">‹</button>
                                <input type="month" value={month} max={currentMonth()} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} aria-label="Chọn tháng thống kê" />
                                <button type="button" onClick={() => setMonth((value) => shiftMonth(value, 1))} disabled={month >= currentMonth()} aria-label="Tháng sau">›</button>
                            </div>
                        </div>
                    </div>
                    {loading && <p className={styles.message} role="status">Đang tải hồ sơ và tiến độ học tập…</p>}
                    {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Thử lại</button></div>}
                    {!loading && !error && data && <>
                        <div className={styles.insightsGrid}>
                            <section className={styles.chartArea} aria-label="Biểu đồ điểm Speaking">
                                <div className={styles.sectionTop}>
                                    <div><h3>Biểu đồ điểm Speaking</h3><p>Điểm trung bình theo ngày luyện tập</p></div>
                                </div>
                                <ScoreProgressChart points={data.progress || []} compact title="Biểu đồ điểm Speaking" hideHeading className={styles.chart} />
                            </section>
                            <section className={styles.activityArea} aria-label="Tần suất luyện tập">
                                <div className={styles.sectionTop}>
                                    <div><h3>Tần suất luyện tập</h3><p>Số bài Speaking hoàn thành mỗi ngày</p></div>
                                </div>
                                <div className={styles.activitySummary}>
                                    <span><strong>{data.activity.totalSubmissions}</strong> lượt trong tháng</span>
                                    <span><strong>{data.activity.currentStreak}</strong> ngày liên tiếp cuối kỳ</span>
                                    <span><strong>{data.activity.longestStreak}</strong> ngày liên tiếp dài nhất</span>
                                </div>
                                <div className={styles.heatmapScroll}>
                                    <div className={styles.weekdays} aria-hidden="true">
                                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <span key={label}>{label}</span>)}
                                    </div>
                                    <div className={styles.heatmap} role="img" aria-label={`Heatmap từ ${data.activity.fromDate} đến ${data.activity.toDate}: ${data.activity.totalSubmissions} lượt hoàn thành`}>
                                        {Array.from({ length: leadingDays }, (_, index) => <span key={`blank-${index}`} className={styles.emptyCell} />)}
                                        {days.map((day) => <span key={day.date} className={`${styles.day} ${styles[`level${activityLevel(day.completedAttempts)}`]}`} title={`${day.date}: ${day.completedAttempts} lượt hoàn thành`}>{Number(day.date.slice(-2))}</span>)}
                                    </div>
                                </div>
                                <div className={styles.legend}><span>Ít</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`${styles.day} ${styles[`level${level}`]}`} />)}<span>Nhiều</span></div>
                            </section>
                        </div>
                    </>}
                </div>
            </section>
        </div>,
        document.body
    );
}
