import React, { useState, useEffect } from 'react';
import {
    isPushSupported,
    subscribePush,
    unsubscribePush,
    getPushStatus,
    getPushFailureMessage
} from '../../../utils/pushNotification';
import { showToastSuccess, showToastError } from '../../../utils/toast';
import styles from '../StudentProfile.module.css';

export default function NotificationSettingsCard({
    isOpen = true,
    onToggle,
    pushStatus: externalPushStatus,
    onStatusChange
}) {
    const [loading, setLoading] = useState(false);
    const [localStatus, setLocalStatus] = useState(externalPushStatus || null);
    const [permission, setPermission] = useState('default');

    const supported = isPushSupported();

    useEffect(() => {
        if (externalPushStatus) {
            setLocalStatus(externalPushStatus);
        } else if (supported) {
            getPushStatus().then((status) => {
                setLocalStatus(status);
                if (onStatusChange) onStatusChange(status);
            });
        }
    }, [externalPushStatus, supported, onStatusChange]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, [localStatus]);

    const effectiveStatus = localStatus || externalPushStatus;
    const isBlocked = permission === 'denied';
    const isExpired = !!(effectiveStatus?.deviceExpired || effectiveStatus?.hasExpired);
    const isActive = !!(
        (effectiveStatus?.deviceActive || effectiveStatus?.hasActive) &&
        !isExpired &&
        !isBlocked
    );

    const handleBellClick = async () => {
        if (loading) return;

        if (!supported) {
            showToastError('Trình duyệt không hỗ trợ nhận thông báo.');
            return;
        }

        if (isBlocked) {
            showToastError('Trình duyệt đang chặn thông báo. Vui lòng cấp quyền trong cài đặt trình duyệt.');
            return;
        }

        const shouldEnable = !isActive;
        setLoading(true);

        try {
            if (shouldEnable) {
                const res = await subscribePush();
                if (res.success) {
                    showToastSuccess('Đã bật thông báo deadline!');
                    const updated = await getPushStatus();
                    setLocalStatus(updated);
                    if (onStatusChange) onStatusChange(updated);
                    setPermission(Notification.permission);
                } else if (res.permissionDenied) {
                    setPermission('denied');
                    showToastError('Bạn đã chặn quyền thông báo trên trình duyệt.');
                } else {
                    showToastError(getPushFailureMessage(res));
                }
            } else {
                const ok = await unsubscribePush();
                if (ok) {
                    showToastSuccess('Đã tắt thông báo deadline.');
                    const updated = await getPushStatus();
                    setLocalStatus(updated);
                    if (onStatusChange) onStatusChange(updated);
                } else {
                    showToastError('Không thể tắt thông báo. Vui lòng thử lại.');
                }
            }
        } catch (err) {
            console.error('Push toggle error:', err);
            showToastError('Đã xảy ra lỗi khi thay đổi thông báo.');
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        setLoading(true);
        try {
            const res = await subscribePush();
            if (res.success) {
                showToastSuccess('Đã kích hoạt lại thông báo!');
                const updated = await getPushStatus();
                setLocalStatus(updated);
                if (onStatusChange) onStatusChange(updated);
            } else {
                showToastError(getPushFailureMessage(res));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${styles.card} ${styles.settingsCard}`}>
            <div
                className={`${styles.cardHeaderToggle} ${isOpen ? styles.cardHeaderOpen : ''}`}
                onClick={onToggle}
                role={onToggle ? 'button' : undefined}
                tabIndex={onToggle ? 0 : undefined}
            >
                <div className={styles.cardHeading}>
                    <span className={`${styles.cardIcon} ${styles.amber}`}>
                        <i className="bi bi-bell-fill" />
                    </span>
                    <div>
                        <h2>Thông báo</h2>
                        <p>Nhắc nhở bài tập đến hạn</p>
                    </div>
                </div>
                {onToggle && <button
                    type="button"
                    className={`${styles.collapseBtn} ${isOpen ? styles.collapseBtnOpen : ''}`}
                    aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}
                >
                    <i className="bi bi-chevron-down" />
                </button>}
            </div>

            <div
                className={`${styles.collapseWrapper} ${
                    isOpen ? styles.collapseOpen : styles.collapseClosed
                }`}
            >
                <div className={styles.collapseInner}>
                    <div className={styles.notifCardInner}>
                        {/* Main Bell Action Row */}
                        <div className={styles.notifToggleRow}>
                            <div className={styles.notifToggleInfo}>
                                <strong className={styles.notifTitle}>
                                    Nhắc hạn nộp bài
                                </strong>
                                <p className={styles.notifDesc}>
                                    Tự động thông báo khi bài tập sắp đến hạn.
                                </p>
                            </div>

                            <button
                                type="button"
                                className={`${styles.bellActionBtn} ${
                                    isActive ? styles.bellActive : styles.bellInactive
                                } ${isBlocked ? styles.bellBlocked : ''}`}
                                onClick={handleBellClick}
                                disabled={loading || !supported}
                                title={
                                    isBlocked
                                        ? 'Trình duyệt đang chặn thông báo'
                                        : !supported
                                        ? 'Trình duyệt không hỗ trợ'
                                        : isActive
                                        ? 'Bấm để tắt thông báo'
                                        : 'Bấm để bật thông báo'
                                }
                            >
                                {loading ? (
                                    <i className={`bi bi-arrow-repeat ${styles.spinIcon}`} />
                                ) : isBlocked ? (
                                    <i className="bi bi-bell-slash" />
                                ) : isActive ? (
                                    <i className="bi bi-bell-fill" />
                                ) : (
                                    <i className="bi bi-bell" />
                                )}
                                <span>
                                    {loading
                                        ? 'Đang lưu...'
                                        : isBlocked
                                        ? 'Bị chặn'
                                        : isActive
                                        ? 'Đang bật'
                                        : 'Tắt'}
                                </span>
                            </button>
                        </div>

                        {/* Expired Action */}
                        {isExpired && !isBlocked && (
                            <div className={styles.notifAlertExpired}>
                                <span>Phiên thông báo đã hết hạn.</span>
                                <button
                                    type="button"
                                    className={styles.linkButton}
                                    onClick={handleRenew}
                                    disabled={loading}
                                >
                                    Gia hạn lại
                                </button>
                            </div>
                        )}

                        {/* Blocked Permission Alert */}
                        {isBlocked && (
                            <div className={styles.notifAlertBlock}>
                                <i className="bi bi-exclamation-circle" />
                                <span>Trình duyệt đang chặn thông báo. Vui lòng mở quyền thông báo trên trình duyệt.</span>
                            </div>
                        )}

                        {/* Unsupported Notice */}
                        {!supported && (
                            <div className={styles.notifAlertBlock}>
                                <i className="bi bi-exclamation-triangle" />
                                <span>Trình duyệt không hỗ trợ Web Push.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
