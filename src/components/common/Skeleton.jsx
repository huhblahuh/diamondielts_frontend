import React from 'react';
import styles from './Skeleton.module.css';

export default function Skeleton({ type = 'text', count = 1 }) {
    const renderSkeletonElement = (key) => {
        switch (type) {
            case 'title':
                return <div key={key} className={styles.title} />;
            case 'circle':
                return <div key={key} className={styles.circle} style={{ width: '48px', height: '48px' }} />;
            case 'rect':
                return <div key={key} className={styles.rect} />;
            case 'classroom':
                return (
                    <div key={key} className={styles.classroomCard}>
                        <div className={styles.flexRow}>
                            <div className={styles.circle} style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
                            <div className={styles.flexGrow} />
                            <div className={styles.circle} style={{ width: '24px', height: '24px' }} />
                            <div className={styles.circle} style={{ width: '24px', height: '24px' }} />
                        </div>
                        <div className={styles.title} style={{ width: '80%', height: '20px', margin: '8px 0' }} />
                        <div className={styles.flexRow}>
                            <div className={styles.text} style={{ width: '40%', height: '14px', margin: 0 }} />
                            <div className={styles.flexGrow} />
                            <div className={styles.text} style={{ width: '25%', height: '14px', margin: 0 }} />
                        </div>
                        <div className={styles.rect} style={{ height: '6px', borderRadius: '3px' }} />
                    </div>
                );
            case 'assignment-detail':
                return (
                    <div key={key} className={styles.assignmentDetail}>
                        <div className={styles.title} style={{ width: '40%', height: '32px' }} />
                        <div className={styles.flexRow}>
                            <div className={styles.circle} style={{ width: '120px', height: '32px', borderRadius: '16px' }} />
                            <div className={styles.circle} style={{ width: '100px', height: '32px', borderRadius: '16px' }} />
                        </div>
                        <hr style={{ borderColor: '#f1f5f9', margin: '8px 0' }} />
                        <div className={styles.text} style={{ width: '100%' }} />
                        <div className={styles.text} style={{ width: '90%' }} />
                        <div className={styles.text} style={{ width: '95%' }} />
                        <div className={styles.text} style={{ width: '60%' }} />
                        <div className={styles.rect} style={{ height: '200px', marginTop: '1rem' }} />
                    </div>
                );
            case 'form':
                return (
                    <div key={key} className={styles.formLayout}>
                        <div className={styles.title} style={{ width: '30%', height: '24px' }} />
                        <div className={styles.rect} style={{ height: '45px' }} />
                        <div className={styles.title} style={{ width: '25%', height: '24px' }} />
                        <div className={styles.rect} style={{ height: '120px' }} />
                        <div className={styles.flexRow}>
                            <div className={styles.rect} style={{ height: '40px', width: '120px' }} />
                            <div className={styles.rect} style={{ height: '40px', width: '120px' }} />
                        </div>
                    </div>
                );
            case 'text':
            default:
                return <div key={key} className={styles.text} />;
        }
    };

    if (type === 'classroom') {
        return (
            <div className={styles.classroomGrid}>
                {Array.from({ length: count }).map((_, idx) => renderSkeletonElement(idx))}
            </div>
        );
    }

    return (
        <>
            {Array.from({ length: count }).map((_, idx) => renderSkeletonElement(idx))}
        </>
    );
}
