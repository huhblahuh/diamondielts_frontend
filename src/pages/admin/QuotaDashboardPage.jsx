import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ArcElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import Swal from 'sweetalert2';
import quotaDashboardService from '../../api/services/quotaDashboard.service';
import styles from './QuotaDashboardPage.module.css';

ChartJS.register(
    ArcElement,
    CategoryScale,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
);

const numberFormatter = new Intl.NumberFormat('vi-VN');

function toDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatVietnameseDate(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

function parseVietnameseDate(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        return null;
    }

    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateTyping(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function VietnameseDateInput({
    name,
    value,
    min,
    max,
    onChange,
}) {
    const [displayValue, setDisplayValue] = useState(
        formatVietnameseDate(value),
    );
    const [error, setError] = useState('');

    useEffect(() => {
        setDisplayValue(formatVietnameseDate(value));
    }, [value]);

    const commit = () => {
        const parsed = parseVietnameseDate(displayValue);
        if (!parsed) {
            setError('Nhập ngày theo định dạng dd/mm/yyyy');
            setDisplayValue(formatVietnameseDate(value));
            return;
        }
        if (min && parsed < min) {
            setError(`Không được trước ${formatVietnameseDate(min)}`);
            setDisplayValue(formatVietnameseDate(value));
            return;
        }
        if (max && parsed > max) {
            setError(`Không được sau ${formatVietnameseDate(max)}`);
            setDisplayValue(formatVietnameseDate(value));
            return;
        }

        setError('');
        if (parsed !== value) {
            onChange({ target: { name, value: parsed } });
        }
    };

    return (
        <div className={styles.dateField}>
            <div className={styles.dateInputControl}>
                <input
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => {
                        setDisplayValue(formatDateTyping(event.target.value));
                        setError('');
                    }}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
                <div className={styles.calendarButton} title="Chọn ngày từ lịch">
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    <input
                        className={styles.nativeDatePicker}
                        type="date"
                        value={value}
                        min={min}
                        max={max}
                        aria-label="Chọn ngày từ lịch"
                        onChange={(event) => {
                            if (!event.target.value) return;
                            setError('');
                            onChange({
                                target: {
                                    name,
                                    value: event.target.value,
                                },
                            });
                        }}
                    />
                </div>
            </div>
            {error && <small className={styles.dateError}>{error}</small>}
        </div>
    );
}

function initialDates() {
    const today = new Date();
    return {
        from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toDateInput(today),
    };
}

function getErrorMessage(error, fallback) {
    return error?.response?.data?.message || fallback;
}

export default function QuotaDashboardPage() {
    const dates = useMemo(initialDates, []);
    const [classes, setClasses] = useState([]);
    const [filters, setFilters] = useState({
        classId: '',
        from: dates.from,
        to: dates.to,
        groupBy: 'day',
    });
    const [overview, setOverview] = useState(null);
    const [quotas, setQuotas] = useState([]);
    const [quotaDrafts, setQuotaDrafts] = useState({});
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [bulkLimit, setBulkLimit] = useState('10');
    const [quotaSearch, setQuotaSearch] = useState('');
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingQuotas, setLoadingQuotas] = useState(false);
    const [saving, setSaving] = useState(false);
    const overviewRequestId = useRef(0);

    const loadOverview = useCallback(async (nextFilters) => {
        const requestId = ++overviewRequestId.current;
        setLoadingOverview(true);
        try {
            const data = await quotaDashboardService.getOverview(nextFilters);
            if (requestId === overviewRequestId.current) {
                setOverview(data);
            }
        } catch (error) {
            if (requestId === overviewRequestId.current) {
                Swal.fire(
                    'Không thể tải dashboard',
                    getErrorMessage(error, 'Vui lòng thử lại sau.'),
                    'error',
                );
            }
        } finally {
            if (requestId === overviewRequestId.current) {
                setLoadingOverview(false);
            }
        }
    }, []);

    const loadQuotas = useCallback(async (classId, search = '') => {
        if (!classId) {
            setQuotas([]);
            setQuotaDrafts({});
            return;
        }
        setLoadingQuotas(true);
        try {
            const data = await quotaDashboardService.getFreeSpeakingQuotas(
                classId,
                search,
            );
            setQuotas(data);
            setQuotaDrafts(
                Object.fromEntries(data.map((item) => [item.userId, item.limit])),
            );
            setSelectedStudents([]);
        } catch (error) {
            Swal.fire(
                'Không thể tải quota',
                getErrorMessage(error, 'Vui lòng thử lại sau.'),
                'error',
            );
        } finally {
            setLoadingQuotas(false);
        }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            try {
                const classData = await quotaDashboardService.getClasses();
                setClasses(classData);
            } catch (error) {
                Swal.fire(
                    'Không thể tải danh sách lớp',
                    getErrorMessage(error, 'Vui lòng thử lại sau.'),
                    'error',
                );
            }
        };
        initialize();
    }, []);

    useEffect(() => {
        if (!filters.from || !filters.to || filters.to < filters.from) {
            setLoadingOverview(false);
            return undefined;
        }

        const debounceTimer = window.setTimeout(() => {
            loadOverview(filters);
        }, 250);

        return () => window.clearTimeout(debounceTimer);
    }, [filters, loadOverview]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters((current) => {
            if (name === 'from' && value > current.to) return current;
            if (name === 'to' && value < current.from) return current;
            return { ...current, [name]: value };
        });
        if (name === 'classId') {
            loadQuotas(value);
        }
    };

    const updateQuota = async (payload, successMessage) => {
        if (!filters.classId) return;
        setSaving(true);
        try {
            const result = await quotaDashboardService.updateFreeSpeakingQuotas(
                filters.classId,
                payload,
            );
            await Promise.all([
                loadQuotas(filters.classId, quotaSearch),
                loadOverview(filters),
            ]);
            Swal.fire({
                icon: 'success',
                title: successMessage,
                text: `Đã cập nhật ${result.updatedUsers} học viên.`,
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire(
                'Cập nhật thất bại',
                getErrorMessage(error, 'Không thể cập nhật quota.'),
                'error',
            );
        } finally {
            setSaving(false);
        }
    };

    const applyBulkLimit = () => {
        const limit = Number(bulkLimit);
        if (!Number.isFinite(limit) || limit < 0) {
            Swal.fire('Limit không hợp lệ', 'Limit phải là số không âm.', 'warning');
            return;
        }
        updateQuota(
            {
                mode: 'set',
                limit,
                studentIds: selectedStudents.length > 0
                    ? selectedStudents
                    : null,
                reason: 'Cập nhật từ Admin Quota Dashboard',
            },
            selectedStudents.length > 0
                ? 'Đã cập nhật nhóm đã chọn'
                : 'Đã cập nhật toàn bộ lớp',
        );
    };

    const saveStudentQuota = (studentId) => {
        const limit = Number(quotaDrafts[studentId]);
        if (!Number.isFinite(limit) || limit < 0) {
            Swal.fire('Limit không hợp lệ', 'Limit phải là số không âm.', 'warning');
            return;
        }
        updateQuota(
            {
                mode: 'set',
                limit,
                studentIds: [studentId],
                reason: 'Điều chỉnh quota cá nhân từ Admin Dashboard',
            },
            'Đã lưu quota cá nhân',
        );
    };

    const resetStudentUsage = (studentId) => {
        updateQuota(
            {
                mode: 'resetUsed',
                studentIds: [studentId],
                reason: 'Reset lượt đã sử dụng từ Admin Dashboard',
            },
            'Đã reset lượt sử dụng',
        );
    };

    const toggleStudent = (userId) => {
        setSelectedStudents((current) =>
            current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId],
        );
    };

    const toggleAll = () => {
        setSelectedStudents((current) =>
            current.length === quotas.length
                ? []
                : quotas.map((item) => item.userId),
        );
    };

    const partChartData = {
        labels: overview?.gptTokensByPart?.map((item) => item.label) || [],
        datasets: [{
            data: overview?.gptTokensByPart?.map((item) => item.tokens) || [],
            backgroundColor: ['#005BFF', '#7B3FF2', '#F7B731', '#A8B6CC'],
            borderWidth: 0,
            hoverOffset: 8,
        }],
    };

    const tokenTrendData = {
        labels: overview?.trend?.map((item) => item.label) || [],
        datasets: [{
            label: 'GPT token',
            data: overview?.trend?.map((item) => item.gptTokens) || [],
            borderColor: '#005BFF',
            backgroundColor: 'rgba(0, 91, 255, 0.12)',
            pointBackgroundColor: '#005BFF',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
        }],
    };

    const submissionTrendData = {
        labels: overview?.trend?.map((item) => item.label) || [],
        datasets: [{
            label: 'Lượt nộp',
            data: overview?.trend?.map((item) => item.submissions) || [],
            borderColor: '#EAA00B',
            backgroundColor: 'rgba(247, 183, 49, 0.14)',
            pointBackgroundColor: '#EAA00B',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
        }],
    };

    const azureSpeechTrendData = {
        labels: overview?.trend?.map((item) => item.label) || [],
        datasets: [{
            label: 'Azure Speech (giây)',
            data: overview?.trend?.map((item) => item.azureSpeechSeconds) || [],
            borderColor: '#7B3FF2',
            backgroundColor: 'rgba(123, 63, 242, 0.12)',
            pointBackgroundColor: '#7B3FF2',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, boxWidth: 8, padding: 18 },
            },
            tooltip: {
                callbacks: {
                    label: (context) =>
                        ` ${context.label}: ${numberFormatter.format(context.raw)}`,
                },
            },
        },
    };

    const tokenTrendOptions = {
        ...chartOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { grid: { display: false } },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(19, 33, 60, 0.06)' },
                ticks: {
                    callback: (value) => numberFormatter.format(value),
                },
            },
        },
    };

    const submissionTrendOptions = {
        ...chartOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { grid: { display: false } },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(19, 33, 60, 0.06)' },
                ticks: { precision: 0 },
            },
        },
    };

    const azureSpeechTrendOptions = {
        ...chartOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { grid: { display: false } },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(19, 33, 60, 0.06)' },
                ticks: {
                    callback: (value) =>
                        `${numberFormatter.format(value)} giây`,
                },
            },
        },
    };

    const quotaLabel = selectedStudents.length > 0
        ? `${selectedStudents.length} học viên đã chọn`
        : 'Áp dụng toàn bộ lớp';

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.eyebrow}>ADMIN CONTROL CENTER</span>
                    <h1>Quota & Resource Intelligence</h1>
                    <p>
                        Theo dõi chi phí Speaking, phân tích token theo từng Part
                        và điều phối lượt luyện theo lớp.
                    </p>
                </div>
                <div className={styles.heroBadge}>
                    <i className="bi bi-shield-lock-fill" />
                    Chỉ dành cho Admin
                </div>
            </section>

            <section className={styles.filters}>
                <label>
                    <span>Lớp học</span>
                    <select
                        name="classId"
                        value={filters.classId}
                        onChange={handleFilterChange}
                    >
                        <option value="">Tất cả học viên</option>
                        {classes.map((item) => (
                            <option key={item.classId} value={item.classId}>
                                {item.className} · {item.studentCount} HV
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>Từ ngày</span>
                    <VietnameseDateInput
                        name="from"
                        value={filters.from}
                        max={filters.to}
                        onChange={handleFilterChange}
                    />
                </label>
                <label>
                    <span>Đến ngày</span>
                    <VietnameseDateInput
                        name="to"
                        value={filters.to}
                        min={filters.from}
                        onChange={handleFilterChange}
                    />
                </label>
                <label>
                    <span>Nhóm dữ liệu</span>
                    <select
                        name="groupBy"
                        value={filters.groupBy}
                        onChange={handleFilterChange}
                    >
                        <option value="day">Theo ngày</option>
                        <option value="month">Theo tháng</option>
                    </select>
                </label>
            </section>

            {loadingOverview ? (
                <div className={styles.loadingState}>Đang tổng hợp dữ liệu…</div>
            ) : (
                <>
                    <section className={styles.metrics}>
                        <MetricCard
                            icon="bi-stars"
                            label="GPT token"
                            value={numberFormatter.format(overview?.totalGptTokens || 0)}
                            detail={`Xu hướng theo ${filters.groupBy === 'day' ? 'ngày' : 'tháng'}`}
                            tone="blue"
                        />
                        <MetricCard
                            icon="bi-mic-fill"
                            label="Lượt nộp Speaking"
                            value={numberFormatter.format(overview?.totalSubmissions || 0)}
                            detail={`Xu hướng theo ${filters.groupBy === 'day' ? 'ngày' : 'tháng'}`}
                            tone="purple"
                        />
                    </section>

                    <section className={styles.chartRow}>
                        <article className={styles.chartCard}>
                            <div className={styles.cardHeading}>
                                <div>
                                    <span>PHÂN BỔ TOKEN</span>
                                    <h2>GPT token theo Speaking Part</h2>
                                </div>
                                <i className="bi bi-pie-chart-fill" />
                            </div>
                            <div className={styles.doughnutWrap}>
                                {(overview?.totalGptTokens || 0) > 0 ? (
                                    <Doughnut
                                        data={partChartData}
                                        options={chartOptions}
                                    />
                                ) : (
                                    <EmptyChart text="Chưa có token trong khoảng đã chọn" />
                                )}
                            </div>
                        </article>

                        <article className={styles.chartCard}>
                            <div className={styles.cardHeading}>
                                <div>
                                    <span>XU HƯỚNG NỘP BÀI</span>
                                    <h2>Lượt nộp theo {filters.groupBy === 'day' ? 'ngày' : 'tháng'}</h2>
                                </div>
                                <i className="bi bi-graph-up-arrow" />
                            </div>
                            <div className={styles.trendWrap}>
                                <Line
                                    data={submissionTrendData}
                                    options={submissionTrendOptions}
                                />
                            </div>
                        </article>
                    </section>

                    <section className={styles.chartRow}>
                        <article className={styles.chartCard}>
                            <div className={styles.cardHeading}>
                                <div>
                                    <span>AZURE SPEECH</span>
                                    <h2>Số giây sử dụng theo {filters.groupBy === 'day' ? 'ngày' : 'tháng'}</h2>
                                </div>
                                <i className="bi bi-soundwave" />
                            </div>
                            <div className={styles.trendWrap}>
                                <Line
                                    data={azureSpeechTrendData}
                                    options={azureSpeechTrendOptions}
                                />
                            </div>
                        </article>

                        <article className={styles.chartCard}>
                            <div className={styles.cardHeading}>
                                <div>
                                    <span>XU HƯỚNG TOKEN</span>
                                    <h2>GPT token theo {filters.groupBy === 'day' ? 'ngày' : 'tháng'}</h2>
                                </div>
                                <i className="bi bi-graph-up" />
                            </div>
                            <div className={styles.trendWrap}>
                                <Line data={tokenTrendData} options={tokenTrendOptions} />
                            </div>
                        </article>
                    </section>
                </>
            )}

            <section className={styles.quotaCard}>
                <div className={styles.quotaHeader}>
                    <div>
                        <span className={styles.sectionLabel}>FREE SPEAKING LIMIT</span>
                        <h2>Điều phối lượt luyện theo lớp</h2>
                        <p>
                            Quota vẫn thuộc từng học viên; lớp chỉ là phạm vi thao tác hàng loạt.
                        </p>
                    </div>
                    {filters.classId && (
                        <div className={styles.bulkControls}>
                            <div>
                                <small>{quotaLabel}</small>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={bulkLimit}
                                    onChange={(event) => setBulkLimit(event.target.value)}
                                    aria-label="Limit áp dụng hàng loạt"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={applyBulkLimit}
                                disabled={saving}
                            >
                                <i className="bi bi-lightning-charge-fill" />
                                Áp dụng limit
                            </button>
                        </div>
                    )}
                </div>

                {!filters.classId ? (
                    <div className={styles.classPrompt}>
                        <i className="bi bi-people-fill" />
                        <h3>Chọn một lớp để quản lý quota</h3>
                        <p>Bảng học viên và công cụ cập nhật hàng loạt sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.tableTools}>
                            <div className={styles.searchBox}>
                                <i className="bi bi-search" />
                                <input
                                    value={quotaSearch}
                                    onChange={(event) => setQuotaSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            loadQuotas(filters.classId, quotaSearch);
                                        }
                                    }}
                                    placeholder="Tìm học viên hoặc email"
                                />
                            </div>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => loadQuotas(filters.classId, quotaSearch)}
                            >
                                Tìm kiếm
                            </button>
                        </div>

                        <div className={styles.tableWrap}>
                            {loadingQuotas ? (
                                <div className={styles.loadingState}>Đang tải danh sách quota…</div>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        quotas.length > 0
                                                        && selectedStudents.length === quotas.length
                                                    }
                                                    onChange={toggleAll}
                                                    aria-label="Chọn tất cả học viên"
                                                />
                                            </th>
                                            <th>Học viên</th>
                                            <th>Tiến độ sử dụng</th>
                                            <th>Còn lại</th>
                                            <th>Limit</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotas.map((item) => (
                                            <tr key={item.userId}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(item.userId)}
                                                        onChange={() => toggleStudent(item.userId)}
                                                        aria-label={`Chọn ${item.fullName}`}
                                                    />
                                                </td>
                                                <td>
                                                    <div className={styles.studentCell}>
                                                        <div>{item.fullName.charAt(0).toUpperCase()}</div>
                                                        <span>
                                                            <strong>{item.fullName}</strong>
                                                            <small>{item.email}</small>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.progressMeta}>
                                                        <span>{numberFormatter.format(item.used)} / {numberFormatter.format(item.limit)}</span>
                                                        <strong>{item.usagePercentage}%</strong>
                                                    </div>
                                                    <div className={styles.progressTrack}>
                                                        <span
                                                            className={item.isExhausted ? styles.progressDanger : ''}
                                                            style={{ width: `${Math.min(100, item.usagePercentage)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.remainingBadge} ${item.isExhausted ? styles.exhausted : ''}`}>
                                                        {numberFormatter.format(item.remaining)} lượt
                                                    </span>
                                                </td>
                                                <td>
                                                    <input
                                                        className={styles.limitInput}
                                                        type="number"
                                                        min="0"
                                                        value={quotaDrafts[item.userId] ?? 0}
                                                        onChange={(event) => setQuotaDrafts((current) => ({
                                                            ...current,
                                                            [item.userId]: event.target.value,
                                                        }))}
                                                    />
                                                </td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button
                                                            type="button"
                                                            title="Lưu limit"
                                                            onClick={() => saveStudentQuota(item.userId)}
                                                            disabled={saving}
                                                        >
                                                            <i className="bi bi-check2" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Reset lượt đã dùng"
                                                            onClick={() => resetStudentUsage(item.userId)}
                                                            disabled={saving}
                                                        >
                                                            <i className="bi bi-arrow-counterclockwise" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function MetricCard({ icon, label, value, detail, tone }) {
    return (
        <article className={`${styles.metricCard} ${styles[tone]}`}>
            <div className={styles.metricIcon}><i className={`bi ${icon}`} /></div>
            <div>
                <span>{label}</span>
                <strong>{value}</strong>
                {detail && <small>{detail}</small>}
            </div>
        </article>
    );
}

function EmptyChart({ text }) {
    return (
        <div className={styles.emptyChart}>
            <i className="bi bi-bar-chart" />
            <span>{text}</span>
        </div>
    );
}
