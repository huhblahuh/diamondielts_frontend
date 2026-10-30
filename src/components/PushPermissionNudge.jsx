import React, { useEffect, useState } from 'react';
import { getPushStatus, isPushSupported, subscribePush } from '../utils/pushNotification';
import styles from './PushPermissionNudge.module.css';

const ENTER_DELAY_MS = 900;
const VISIBLE_MS = 6500;
const EXIT_MS = 300;

export default function PushPermissionNudge({ pushStatus, onStatusChange }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isPushSupported() || Notification.permission !== 'default') return undefined;
        if (!pushStatus || (pushStatus.hasActive && !pushStatus.hasExpired)) return undefined;

        let exitTimer;
        const showTimer = window.setTimeout(() => setVisible(true), ENTER_DELAY_MS);
        const hideTimer = window.setTimeout(() => {
            setExiting(true);
            exitTimer = window.setTimeout(() => setVisible(false), EXIT_MS);
        }, ENTER_DELAY_MS + VISIBLE_MS);

        return () => {
            window.clearTimeout(showTimer);
            window.clearTimeout(hideTimer);
            window.clearTimeout(exitTimer);
        };
    }, [pushStatus]);

    const dismiss = () => {
        setExiting(true);
        window.setTimeout(() => setVisible(false), EXIT_MS);
    };

    const enableNotifications = async () => {
        setLoading(true);
        try {
            const result = await subscribePush();
            if (result.success) {
                onStatusChange?.(await getPushStatus());
                dismiss();
            }
        } catch (error) {
            console.error('Failed to enable push notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <aside
            className={`${styles.nudge} ${exiting ? styles.exit : styles.enter}`}
            role="status"
            aria-live="polite"
        >
            <span className={styles.icon} aria-hidden="true">🔔</span>
            <span className={styles.message}>Hãy bật thông báo để được nhắc nhở bài tập</span>
            <button
                type="button"
                className={styles.enableButton}
                onClick={enableNotifications}
                disabled={loading}
            >
                {loading ? 'Đang bật…' : 'Bật'}
            </button>
            <button
                type="button"
                className={styles.closeButton}
                onClick={dismiss}
                aria-label="Đóng nhắc nhở"
            >
                ×
            </button>
        </aside>
    );
}
