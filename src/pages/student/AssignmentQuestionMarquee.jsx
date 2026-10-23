import React from 'react';
import styles from './AssignmentDetailPage.module.css';

export const QuestionMarquee = ({ text }) => {
    return (
        <div className={styles.question} title={text}>
            <span className={styles.questionStatic}>{text}</span>
        </div>
    );
};
