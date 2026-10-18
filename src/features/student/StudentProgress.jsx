import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../../api/services/dashboard.service';
import ScoreProgressChart from '../dashboard/components/ScoreProgressChart';
import styles from './StudentDashboard.module.css';

function toDateInput(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function getRange(days = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    return { fromDate: toDateInput(from), toDate: toDateInput(to) };
}

export default function StudentProgress() {
    const navigate = useNavigate();
    const initialRange = useMemo(() => getRange(), []);
    const [draftRange, setDraftRange] = useState(initialRange);
    const [appliedRange, setAppliedRange] = useState(initialRange);
    const [requestVersion, setRequestVersion] = useState(0);
    const [activePreset, setActivePreset] = useState(30);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const requestRef = useRef({ key: '', promise: null });

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        const requestKey = `${appliedRange.fromDate}:${appliedRange.toDate}:${requestVersion}`;
        if (requestRef.current.key !== requestKey) {
            requestRef.current = { key: requestKey, promise: dashboardService.getSummary(appliedRange) };
        }
        requestRef.current.promise
            .then((data) => { if (active) setSummary(data); })
            .catch((requestError) => {
                if (active) {
                    setSummary(null);
                    setError(requestError?.message || 'Không thể tải dữ liệu tiến độ.');
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [appliedRange, requestVersion]);

    const rangeIsValid = draftRange.fromDate && draftRange.toDate && draftRange.fromDate <= draftRange.toDate;
    const selectPreset = (days) => {
        setDraftRange(getRange(days));
        setActivePreset(days);
    };
    const applyRange = () => {
        if (!rangeIsValid) {
            setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
            return;
        }
        setAppliedRange({ ...draftRange });
        setRequestVersion((current) => current + 1);
    };

    const dateFilter = (
        <div className={styles.chartFilters} aria-label="Lọc biểu đồ theo thời gian">
            <div className={styles.presets}>
                {[7, 30, 90].map((days) => (
                    <button type="button" key={days} aria-pressed={activePreset === days} className={activePreset === days ? styles.activePreset : ''} onClick={() => selectPreset(days)}>
                        {days} ngày
                    </button>
                ))}
            </div>
            <div className={styles.customDateWrapper}>
                <div className={styles.dateRange}>
                    <label>
                        <span>Từ</span>
                        <input type="date" value={draftRange.fromDate} max={draftRange.toDate} onChange={(event) => {
                            setDraftRange((current) => ({ ...current, fromDate: event.target.value }));
                            setActivePreset(null);
                        }} />
                    </label>
                    <span className={styles.dateSeparator}>–</span>
                    <label>
                        <span>Đến</span>
                        <input type="date" value={draftRange.toDate} min={draftRange.fromDate} onChange={(event) => {
                            setDraftRange((current) => ({ ...current, toDate: event.target.value }));
                            setActivePreset(null);
                        }} />
                    </label>
                </div>
                <button type="button" className={styles.applyButton} disabled={!rangeIsValid || loading} onClick={applyRange}>Áp dụng</button>
            </div>
        </div>
    );

    return (
        <div className={`${styles.container} ${styles.progressPage}`}>
            <div className={styles.progressPageHeader}>
                <button type="button" onClick={() => navigate('/student/dashboard')} aria-label="Quay lại dashboard">
                    <i className="bi bi-arrow-left" aria-hidden="true" />
                </button>
                <div>
                    <span className={styles.eyebrow}>Tiến độ học tập</span>
                    <h1>Biểu đồ điểm Speaking</h1>
                    <p>Theo dõi sự thay đổi điểm số qua từng ngày luyện tập.</p>
                </div>
            </div>
            {error && <div className={styles.errorBanner} role="alert"><i className="bi bi-exclamation-circle" /><span>{error}</span></div>}
            {loading ? (
                <div className={styles.skeletonChart} role="status">Đang tổng hợp điểm…</div>
            ) : (
                <ScoreProgressChart
                    className={styles.studentProgressCard}
                    compact
                    points={summary?.progress || []}
                    headerActions={dateFilter}
                    title="Xu hướng điểm"
                    subtitle="Điểm trung bình theo ngày"
                />
            )}
        </div>
    );
}
