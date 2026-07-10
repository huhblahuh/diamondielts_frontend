import React from 'react';
import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ text = 'Đang tải dữ liệu', fullscreen = false }) {
    const spinnerContent = (
        <>
            <div className={styles.spinnerRing}>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <p className={styles.loadingText}>{text}</p>
        </>
    );

    if (fullscreen) {
        return (
            <div className={styles.overlay}>
                <div className={styles.container}>
                    {spinnerContent}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.inlineContainer}>
            {spinnerContent}
        </div>
    );
}
