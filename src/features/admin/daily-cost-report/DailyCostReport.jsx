import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import dailyCostReportService from '../../../api/services/dailyCostReport.service';
import { buildCostProjection, costChartOptions } from './dailyCostChart';
import styles from './DailyCostReport.module.css';

ChartJS.register(
    CategoryScale,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
);

const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
});

function formatShortDate(value) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
}

export default function DailyCostReport({ from, to, classId }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const requestId = useRef(0);

    const loadReport = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        setLoading(true);
        setError('');
        try {
            const data = await dailyCostReportService.getRange({ from, to, classId });
            if (currentRequestId === requestId.current) setReport(data);
        } catch (requestError) {
            if (currentRequestId === requestId.current) {
                setError(requestError?.message || 'Không thể tải báo cáo chi phí.');
            }
        } finally {
            if (currentRequestId === requestId.current) setLoading(false);
        }
    }, [classId, from, to]);

    useEffect(() => {
        loadReport();
        return () => { requestId.current += 1; };
    }, [loadReport]);

    const projection = useMemo(
        () => buildCostProjection(report, from, to),
        [report, from, to],
    );

    return (
        <section className={styles.card} aria-labelledby="daily-cost-title">
            <div className={styles.header}>
                <div>
                    <span>DAILY COST REPORT</span>
                    <h2 id="daily-cost-title">Mức sử dụng và dự báo chi phí</h2>
                    <p>Dự báo dùng mức tiêu thụ trung bình của các ngày đã chốt trong khoảng chọn.</p>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div>
                    <span>Đã tiêu thụ</span>
                    <strong>{usdFormatter.format(projection.actualTotal)}</strong>
                    <small>{projection.finalizedDays} ngày đã chốt</small>
                </div>
                <div>
                    <span>Trung bình/ngày</span>
                    <strong>{usdFormatter.format(projection.averageDaily)}</strong>
                    <small>Tính trên ngày đã chốt</small>
                </div>
                <div>
                    <span>Dự báo cuối timeframe</span>
                    <strong>{usdFormatter.format(projection.projectedTotal)}</strong>
                    <small>Đến {formatShortDate(to)}</small>
                </div>
            </div>

            {loading && <div className={styles.state}>Đang tải Daily Cost Report…</div>}
            {!loading && error && (
                <div className={`${styles.state} ${styles.error}`}>
                    <span>{error}</span>
                    <button type="button" onClick={loadReport}>Thử lại</button>
                </div>
            )}
            {!loading && !error && projection.finalizedDays === 0 && (
                <div className={styles.state}>Chưa có ngày nào được scheduled service chốt trong khoảng này.</div>
            )}
            {!loading && !error && projection.finalizedDays > 0 && (
                <div className={styles.chartWrap}>
                    <Line data={projection.chartData} options={costChartOptions} />
                </div>
            )}
        </section>
    );
}
