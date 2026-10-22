import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SpeakingPractice from '../../features/student/SpeakingPractice';
import styles from './AssignmentSpeakingModal.module.css';

export default function AssignmentSpeakingModal({ assignmentId, itemId, assignment, itemDetail, initialSubmissionId, onClose }) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousFocus = document.activeElement;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleKeyDown = event => {
            if (event.key === 'Escape') {
                onCloseRef.current();
            } else if (event.key === 'Tab') {
                const focusable = dialogRef.current?.querySelectorAll(
                    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (!focusable?.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus?.();
        };
    }, []);

    return createPortal(
        <div className={styles.backdrop}>
            <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="assignment-speaking-title">
                <header className={styles.header}>
                    <h2 id="assignment-speaking-title">{assignment?.title || 'Bài nói'}</h2>
                    <button ref={closeButtonRef} type="button" className={styles.close} onClick={onClose} aria-label="Đóng bài nói">
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </header>
                <div className={styles.content}>
                    <SpeakingPractice
                        isAssignmentMode={true}
                        embedded={true}
                        assignmentId={assignmentId}
                        assignmentItemId={itemId}
                        assignment={assignment}
                        assignmentItemDetail={itemDetail}
                        initialSubmissionId={initialSubmissionId}
                        onBack={onClose}
                    />
                </div>
            </section>
        </div>,
        document.body
    );
}
