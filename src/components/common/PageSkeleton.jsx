import React from 'react';
import styles from './PageSkeleton.module.css';

/**
 * PageSkeleton — hiện thị skeleton đẹp khi lazy load page mới
 * Giữ nguyên layout, chỉ animate phần content bên trong
 */
export default function PageSkeleton() {
    return (
        <div className={styles.page}>
            {/* Header skeleton */}
            <div className={styles.pageHeader}>
                <div className={`${styles.shimmer} ${styles.pageTitle}`} />
                <div className={`${styles.shimmer} ${styles.pageBadge}`} />
            </div>

            {/* Stats row */}
            <div className={styles.statsRow}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={styles.statCard}>
                        <div className={`${styles.shimmer} ${styles.statIcon}`} />
                        <div className={styles.statBody}>
                            <div className={`${styles.shimmer} ${styles.statValue}`} />
                            <div className={`${styles.shimmer} ${styles.statLabel}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content area */}
            <div className={styles.contentGrid}>
                {/* Left big block */}
                <div className={styles.mainBlock}>
                    <div className={`${styles.shimmer} ${styles.blockTitle}`} />
                    <div className={styles.cardList}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={styles.listCard}>
                                <div className={`${styles.shimmer} ${styles.cardAvatar}`} />
                                <div className={styles.cardContent}>
                                    <div className={`${styles.shimmer} ${styles.cardTitle}`} />
                                    <div className={`${styles.shimmer} ${styles.cardSub}`} />
                                </div>
                                <div className={`${styles.shimmer} ${styles.cardAction}`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right sidebar block */}
                <div className={styles.sideBlock}>
                    <div className={`${styles.shimmer} ${styles.blockTitle}`} />
                    <div className={`${styles.shimmer} ${styles.bigRect}`} />
                    <div className={styles.tagRow}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`${styles.shimmer} ${styles.tag}`} />
                        ))}
                    </div>
                    <div className={`${styles.shimmer} ${styles.medRect}`} />
                </div>
            </div>
        </div>
    );
}
