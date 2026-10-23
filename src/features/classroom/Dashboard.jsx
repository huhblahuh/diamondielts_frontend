import React, { useEffect, useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    ArcElement, CategoryScale, Chart as ChartJS, Legend,
    LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import teacherDashboardService from '../../api/services/teacherDashboard.service';
import ScoreOverviewCard from '../dashboard/components/ScoreOverviewCard';
import ScoreProgressChart from '../dashboard/components/ScoreProgressChart';
import { formatScore, SCORE_ITEMS } from '../dashboard/scoreDashboard';
import styles from './Dashboard.module.css';
import PageSkeleton from '../../components/common/PageSkeleton';

ChartJS.register(
    ArcElement, CategoryScale, Legend,
    LinearScale, LineElement, PointElement, Tooltip,
);

const BAND_COLORS = ['#fbf7ee', '#cfd6ee', '#cfd6ee', '#6f80c4', '#2a3f94', '#1b2d75', '#199bb1'];

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

function formatDate(value, withYear = false) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', ...(withYear ? { year: 'numeric' } : {}),
    }).format(new Date(value.includes?.('T') ? value : `${value}T00:00:00`));
}

function LoadingState() {
    return <PageSkeleton variant="charts" />;
}

export default function Dashboard() {
    const initialRange = useMemo(() => getRange(), []);
    const [classes, setClasses] = useState([]);
    const [scope, setScope] = useState({ type: 'Overall', id: null });
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [fromDate, setFromDate] = useState(initialRange.fromDate);
    const [toDate, setToDate] = useState(initialRange.toDate);
    const [activePreset, setActivePreset] = useState(30);
    const [analytics, setAnalytics] = useState(null);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [scopeError, setScopeError] = useState('');

    useEffect(() => {
        let active = true;
        teacherDashboardService.getClasses()
            .then((data) => active && setClasses(Array.isArray(data) ? data : []))
            .catch(() => active && setScopeError('Không thể tải danh sách lớp học.'))
            .finally(() => active && setLoadingClasses(false));
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!fromDate || !toDate || fromDate > toDate) {
            setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
            setAnalytics(null);
            setLoading(false);
            return undefined;
        }
        let active = true;
        setLoading(true);
        setError('');
        teacherDashboardService.getAnalytics({ type: scope.type, id: scope.id, fromDate, toDate })
            .then((data) => active && setAnalytics(data))
            .catch((requestError) => {
                if (active) {
                    setAnalytics(null);
                    setError(requestError?.message || 'Không thể tải dữ liệu phân tích.');
                }
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [scope, fromDate, toDate]);

    useEffect(() => {
        if (selectedClassId === null) return undefined;
        let active = true;
        setLoadingStudents(true);
        setStudents([]);
        setScopeError('');
        teacherDashboardService.getClassDetail(selectedClassId)
            .then((detail) => {
                if (active) setStudents((detail?.members || []).filter((member) => member.role === 'Student'));
            })
            .catch((requestError) => {
                if (active) setScopeError(requestError?.message || 'Không thể tải danh sách học sinh.');
            })
            .finally(() => active && setLoadingStudents(false));
        return () => { active = false; };
    }, [selectedClassId]);

    const selectedClass = classes.find((item) => item.classId === selectedClassId);
    const overall = analytics?.overallScore;
    const bandDistribution = analytics?.bandDistribution || [];
    const hasDistribution = bandDistribution.length > 0;
    const distributionCount = bandDistribution.reduce((total, item) => total + item.count, 0);
    const progress = (analytics?.progress || []).filter((point) => (
        Number.isFinite(point.overallScore)
        || SCORE_ITEMS.some((item) => Number.isFinite(point[item.key]))
    ));
    const scoreItems = SCORE_ITEMS.map((item) => ({
        ...item,
        value: analytics?.[item.key] ?? null,
    }));

    const distributionData = {
        labels: bandDistribution.map((item) => `Band ${formatScore(item.bandScore)}`),
        datasets: [{
            data: bandDistribution.map((item) => item.percentage),
            backgroundColor: bandDistribution.map((_, index) => BAND_COLORS[index % BAND_COLORS.length]),
            borderWidth: 0,
            hoverOffset: 5,
        }],
    };

    const applyPreset = (days) => {
        const range = getRange(days);
        setFromDate(range.fromDate);
        setToDate(range.toDate);
        setActivePreset(days);
    };

    const openClasses = () => {
        setScope({ type: 'Overall', id: null });
        setSelectedStudent(null);
        setSelectedClassId(null);
        setScopeError('');
    };

    const openStudents = (classItem) => {
        setSelectedClassId(classItem.classId);
        setSelectedStudent(null);
        setScope({ type: 'Class', id: classItem.classId });
    };

    const selectStudent = (student) => {
        setSelectedStudent(student);
        setScope({ type: 'Student', id: student.userId });
    };

    const scopeLabel = scope.type === 'Overall'
        ? 'Tất cả lớp'
        : scope.type === 'Student'
            ? selectedStudent?.fullName || 'Học sinh đã chọn'
            : selectedClass?.className || 'Lớp đã chọn';

    return (
        <div className={styles.analyticsPage}>


            <section className={`${styles.card} ${styles.scopeToolbar}`} aria-label="Bộ lọc dashboard">
                <div className={styles.toolbarTop}>
                    <div className={styles.scopeHeading}><i className="bi bi-sliders" aria-hidden="true" /><div><h2>Bộ lọc phân tích</h2><span>Áp dụng cho toàn bộ dashboard</span></div></div>
                    {selectedClassId !== null && (
                    <div className={styles.studentFilter}>
                        <select id="dashboard-student" value={selectedStudent?.userId ?? ''} disabled={loadingStudents || !!scopeError} onChange={(event) => {
                            const student = students.find((item) => String(item.userId) === event.target.value);
                            if (student) selectStudent(student);
                            else { setSelectedStudent(null); setScope({ type: 'Class', id: selectedClassId }); }
                        }}>
                            <option value="">{loadingStudents ? 'Đang tải học sinh…' : 'Tất cả học sinh'}</option>
                            {students.map((student) => <option key={student.userId} value={student.userId}>{student.fullName} · {student.email}</option>)}
                        </select>
                    </div>
                )}
                {scopeError && <p className={styles.scopeError} role="alert">{scopeError}</p>}
                    <div className={styles.dateControls}>
                        <div className={styles.presets} aria-label="Chọn nhanh khoảng thời gian">
                            {[7, 30, 90].map((days) => <button type="button" key={days} aria-pressed={activePreset === days} className={activePreset === days ? styles.activePreset : ''} onClick={() => applyPreset(days)}>{days} ngày</button>)}
                        </div>
                        <div className={styles.dateRange}>
                            <i className="bi bi-calendar3" aria-hidden="true" />
                            <label className={styles.dateField}><span>Từ</span><input type="date" value={fromDate} max={toDate} onChange={(event) => { setFromDate(event.target.value); setActivePreset(null); }} /></label>
                            <span className={styles.dateSeparator}>–</span>
                            <label className={styles.dateField}><span>Đến</span><input type="date" value={toDate} min={fromDate} onChange={(event) => { setToDate(event.target.value); setActivePreset(null); }} /></label>
                        </div>
                    </div>
                </div>
                <div className={styles.scopeRow}>
                    <span className={styles.filterLabel}>Phạm vi</span>
                    <div className={styles.classList} aria-label="Chọn lớp học">
                        <button type="button" className={`${styles.classItem} ${scope.type === 'Overall' ? styles.activeClass : ''}`} aria-pressed={scope.type === 'Overall'} onClick={openClasses}><i className="bi bi-grid" />Tất cả lớp</button>
                        {loadingClasses && <span className={styles.scopeStatus} role="status">Đang tải lớp học…</span>}
                        {!loadingClasses && classes.map((item) => (
                            <button type="button" key={item.classId} className={`${styles.classItem} ${selectedClassId === item.classId ? styles.activeClass : ''}`} aria-pressed={selectedClassId === item.classId} onClick={() => openStudents(item)} title={`${item.className} · ${item.studentCount || 0} học sinh`}>
                                <span>{item.className}</span><small>{item.studentCount || 0}</small>
                            </button>
                        ))}
                        {!loadingClasses && classes.length === 0 && <span className={styles.scopeStatus}>Chưa có lớp học nào.</span>}
                    </div>
                </div>

            </section>
            {error && <div className={styles.errorBanner} role="alert"><i className="bi bi-exclamation-circle" /><span>{error}</span></div>}

            <div className={styles.dashboardGrid}>
                <div className={styles.mainColumn} aria-busy={loading}>
                    {loading ? <LoadingState /> : (
                        <div className={styles.summaryGrid}>
                            <ScoreOverviewCard
                                overall={overall}
                                criteria={scoreItems}
                                attemptCount={distributionCount}
                            />

                            <article className={`${styles.card} ${styles.distributionCard}`}>
                                <h2 className={styles.cardEyebrow}>Phân bổ band điểm</h2>
                                {hasDistribution ? <div className={styles.distributionBody}>
                                    <div className={styles.doughnutWrap}>
                                        <Doughnut data={distributionData} options={{ responsive: true, maintainAspectRatio: false, cutout: '67%', animation: { duration: 600, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw}%` } } } }} />
                                        <div className={styles.doughnutCenter}><strong>{distributionCount}</strong><span>lượt chấm</span></div>
                                    </div>
                                    <div className={styles.legendList}>{bandDistribution.map((item, index) => <div className={styles.legendItem} key={item.bandScore}><span style={{ background: BAND_COLORS[index % BAND_COLORS.length] }} /><span>Band {formatScore(item.bandScore)}</span><strong>{item.percentage}%</strong><small>{item.count} lượt</small></div>)}</div>
                                </div> : <div className={styles.emptyState}><i className="bi bi-pie-chart" /><span>Chưa có phân bổ band điểm trong khoảng này.</span></div>}
                            </article>
                        </div>
                    )}

                    {!loading && (
                        <ScoreProgressChart
                            points={progress}
                            scopeLabel={scopeLabel}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
