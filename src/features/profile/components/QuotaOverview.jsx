import React, { useEffect, useState } from 'react';
import styles from '../StudentProfile.module.css';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function QuotaOverview({ speakingQuota }) {
    const remaining = Number(speakingQuota?.remaining || 0);
    const limit = Number(speakingQuota?.limit || 0);
    // remainingPercent: phần còn lại (chưa dùng) → vẽ cung màu sáng
    const remainingPct = limit > 0 ? Math.min(1, remaining / limit) : 0;
    const targetDashOffset = CIRCUMFERENCE * (1 - remainingPct);

    // Bắt đầu từ offset CIRCUMFERENCE (vòng tròn trống) rồi animate đến target
    const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedOffset(targetDashOffset);
        }, 120);
        return () => clearTimeout(timer);
    }, [targetDashOffset]);

    if (!limit) {
        return (
            <div className={styles.heroQuotaMini}>
                <div className={styles.heroQuotaRingWrap}>
                    <svg viewBox="0 0 100 100" className={styles.heroQuotaRing}>
                        <circle cx="50" cy="50" r={RADIUS} className={styles.heroQuotaTrack} />
                    </svg>
                    <div className={styles.heroQuotaCenter}>
                        <span className={styles.heroQuotaNumBig}>—</span>
                    </div>
                </div>
                <p className={styles.heroQuotaLabel}>Chưa cấp diamond</p>
            </div>
        );
    }

    return (
        <div className={styles.heroQuotaMini} aria-label="Diamond luyện Speaking">
            <div className={styles.heroQuotaRingWrap}>
                <svg viewBox="0 0 100 100" className={styles.heroQuotaRing}>
                    <circle cx="50" cy="50" r={RADIUS} className={styles.heroQuotaTrack} />
                    <circle
                        cx="50" cy="50" r={RADIUS}
                        className={styles.heroQuotaArc}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={animatedOffset}
                    />
                </svg>
                <div className={styles.heroQuotaCenter}>
                    <span className={styles.heroQuotaNumBig}>{remaining}</span>
                    <span className={styles.heroQuotaNumSlash}>/{limit}</span>
                </div>
            </div>
            <p className={styles.heroQuotaLabel}>Diamond còn lại tháng này</p>
        </div>
    );
}

