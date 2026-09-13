import React from 'react';
import { formatScore, scoreLabel } from '../scoreDashboard';
import styles from '../../classroom/Dashboard.module.css';

export default function ScoreOverviewCard({ overall, criteria, attemptCount = 0 }) {
    return (
        <article className={`${styles.card} ${styles.scoreCard}`}>
            <div className={styles.scoreTop}>
                <div>
                    <h2 className={styles.eyebrow}>Điểm tổng thể</h2>
                    <strong className={styles.bigScore}>{formatScore(overall)}<span>/ 9.0</span></strong>
                    <p className={styles.attemptCount}>{attemptCount} lượt có điểm Overall</p>
                </div>
                <div
                    className={styles.scoreRing}
                    style={{ '--score-angle': `${Math.max(0, Math.min(9, overall || 0)) / 9 * 360}deg` }}
                >
                    <div><strong>{formatScore(overall)}</strong><span>/ 9.0</span></div>
                </div>
            </div>
            <div className={styles.scoreDivider} />
            <div className={styles.criteriaGrid}>
                {criteria.map((item) => (
                    <div className={styles.criterion} key={item.key}>
                        <span title={item.label}>{item.short || item.label}</span>
                        <strong>{formatScore(item.value)}</strong>
                        <small>{scoreLabel(item.value)}</small>
                    </div>
                ))}
            </div>
        </article>
    );
}
