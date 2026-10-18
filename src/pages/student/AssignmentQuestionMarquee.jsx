import React, { useEffect, useRef, useState } from 'react';
import styles from './AssignmentDetailPage.module.css';

export const QuestionMarquee = ({ text }) => {
    const elRef = useRef(null);
    const [isOverflow, setIsOverflow] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (elRef.current) {
                const isOver = elRef.current.scrollWidth > elRef.current.clientWidth + 1;
                setIsOverflow(isOver);
            }
        };

        checkOverflow();

        let ro = null;
        if (typeof ResizeObserver !== 'undefined' && elRef.current) {
            ro = new ResizeObserver(checkOverflow);
            ro.observe(elRef.current);
        }
        return () => ro?.disconnect();
    }, [text]);

    const duration = Math.max(6, Math.round((text || '').length * 0.12));

    return (
        <div
            ref={elRef}
            className={`${styles.question} ${isOverflow ? styles.questionOverflow : ''}`}
            title={text}
            style={{ '--marquee-duration': `${duration}s` }}
        >
            <span className={styles.questionStatic}>{text}</span>
            {isOverflow && (
                <div className={styles.marqueeTrack}>
                    <span className={styles.marqueeContent}>{text}</span>
                    <span className={styles.marqueeDivider}>&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span className={styles.marqueeContent}>{text}</span>
                    <span className={styles.marqueeDivider}>&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;</span>
                </div>
            )}
        </div>
    );
};
