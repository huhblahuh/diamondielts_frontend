import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    CategoryScale, Chart as ChartJS, Legend, LinearScale,
    LineElement, PointElement, Tooltip,
} from 'chart.js';
import { formatScore, SCORE_ITEMS } from '../scoreDashboard';
import styles from '../../classroom/Dashboard.module.css';

ChartJS.register(
    CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip,
);

const MAX_PROGRESS_POINTS = 30;
const OVERALL_COLOR = '#1b2d75';

function sampleProgressPoints(points, limit = MAX_PROGRESS_POINTS) {
    if (points.length <= limit) return points;

    const lastIndex = points.length - 1;
    return Array.from({ length: limit }, (_, index) => (
        points[Math.round(index * lastIndex / (limit - 1))]
    ));
}

const formatDate = (value, withYear = false) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', ...(withYear ? { year: 'numeric' } : {}),
}).format(new Date(value.includes?.('T') ? value : `${value}T00:00:00`));

export default function ScoreProgressChart({ points = [], scopeLabel, headerActions, title = 'Biểu đồ điểm trung bình', subtitle = 'Điểm trung bình mỗi ngày', className = '', compact = false, hideHeading = false }) {
    const [visibleSkills, setVisibleSkills] = useState({});
    const progress = useMemo(() => sampleProgressPoints(points), [points]);
    const hasOverall = progress.some((point) => Number.isFinite(point.overallScore));
    const scoreItems = SCORE_ITEMS.map((item) => {
        const available = progress.some((point) => Number.isFinite(point[item.key]));
        return { ...item, available, visible: visibleSkills[item.key] ?? available };
    });
    const hasProgress = hasOverall || scoreItems.some((item) => item.available);
    const periodLabel = (point) => point.from.slice(0, 10) === point.to.slice(0, 10)
        ? formatDate(point.from)
        : `${formatDate(point.from)}–${formatDate(point.to)}`;

    const data = useMemo(() => ({
        labels: progress.map((item) => [periodLabel(item), `${item.attemptCount || 0} lượt`]),
        datasets: [
            ...scoreItems.filter((item) => item.visible).map((item) => ({
                type: 'line', label: item.short || item.label,
                data: progress.map((point) => point[item.key] ?? null),
                backgroundColor: item.color, borderColor: item.color,
                borderWidth: 2, borderDash: item.dash,
                pointStyle: item.pointStyle, pointRadius: 4,
                pointHoverRadius: 6, tension: 0, spanGaps: false,
                skipNull: true, order: 1,
            })),
            { type: 'line', label: 'Overall', data: progress.map((item) => item.overallScore ?? null), borderColor: OVERALL_COLOR, backgroundColor: '#fff', borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderColor: OVERALL_COLOR, pointBorderWidth: 2, tension: 0, spanGaps: false, order: 0 },
        ],
    }), [progress, scoreItems]);

    const options = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatScore(context.raw)}` } } }, scales: { x: { offset: true, grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', autoSkip: false, maxRotation: 0, padding: 12, font: { size: 11 } } }, y: { beginAtZero: true, max: 9, ticks: { stepSize: 1, color: '#64748b' }, grid: { color: '#edf1f6' }, border: { display: false } } } };

    return <article className={`${styles.card} ${styles.progressCard} ${compact ? styles.compactProgressCard : ''} ${className}`}>
        {(!hideHeading || headerActions || scopeLabel) && <div className={styles.progressHeader}>
            {!hideHeading && <div className={styles.sectionHeading}><h2>{title}</h2><p>{subtitle}</p></div>}
            {headerActions || (scopeLabel ? <span className={styles.scopePill}>{scopeLabel}</span> : null)}
        </div>}
        <div className={styles.skillToggles} role="group" aria-label="Bật hoặc tắt các đường tiêu chí">
            <span className={styles.overallLegend}><i />Overall</span>
            {scoreItems.map((item) => <label className={`${styles.skillToggle} ${item.visible ? styles.skillToggleActive : ''}`} style={{ '--toggle-color': item.color }} key={item.key} title={item.available ? `Bật/tắt ${item.label}` : `${item.label}: chưa có điểm`}><input type="checkbox" checked={item.visible} disabled={!item.available} onChange={() => setVisibleSkills((current) => ({ ...current, [item.key]: !item.visible }))} /><span className={styles.legendDot} /><span>{item.short || item.label}</span></label>)}
        </div>
        {hasProgress ? <div className={styles.chartScroll} tabIndex={0} role="region" aria-label={title}><div className={styles.chartWrap} style={{ minWidth: `${Math.max(280, progress.length * 72)}px` }}><Line data={data} options={options} /></div></div> : <div className={styles.emptyState}><i className="bi bi-bar-chart-line" /><span>Chưa có bài Speaking được chấm.</span></div>}
    </article>;
}
