import React, { useState, useEffect } from 'react';
import {
    isPushSupported,
    subscribePush,
    getPushStatus,
    isBannerDismissed,
    dismissBanner
} from '../utils/pushNotification';
import { showToastSuccess, showToastError, showToastInfo } from '../utils/toast';
import styles from './PushNotificationBanner.module.css';

export default function PushNotificationBanner({ pushStatus, onStatusChange }) {
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState('default');

    useEffect(() => {
        setDismissed(isBannerDismissed());
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, [pushStatus]);

    if (!isPushSupported()) {
        return null;
    }

    // If already active and not expired, no need to show banner
    if (pushStatus?.hasActive && !pushStatus?.hasExpired) {
        return null;
    }

    // If dismissed by user for 3 days
    if (dismissed) {
        return null;
    }

    const isBlocked = permission === 'denied';
    const isExpired = pushStatus?.hasExpired;

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const res = await subscribePush();
            if (res.success) {
                showToastSuccess('Đã bật thông báo nhắc nhở deadline thành công!');
                if (onStatusChange) {
                    onStatusChange(await getPushStatus());
                }
            } else if (res.permissionDenied) {
                setPermission('denied');
                showToastError('Bạn đã từ chối cấp quyền thông báo.');
            } else {
                showToastError('Không thể đăng ký thông báo. Vui lòng thử lại sau.');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            showToastError('Đã xảy ra lỗi khi đăng ký thông báo.');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        dismissBanner(3);
        setDismissed(true);
        showToastInfo('Đã ẩn nhắc nhở thông báo. Chúng tôi sẽ nhắc lại sau 3 ngày.');
    };

    let variantClass = styles.bannerDefault;
    let icon = '🔔';
    let title = 'Bật thông báo nhắc nhở deadline';
    let description = 'Nhận thông báo tự động ngay cả khi bạn không mở web, giúp bạn không bỏ lỡ bài tập nào.';
    let actionBtnText = 'Bật ngay';

    if (isBlocked) {
        variantClass = styles.bannerBlocked;
        icon = '🚫';
        title = 'Thông báo trình duyệt đang bị chặn';
        description = 'Vui lòng nhấn vào biểu tượng ổ khóa bên trái thanh địa chỉ URL để cho phép thông báo.';
    } else if (isExpired) {
        variantClass = styles.bannerExpired;
        icon = '⚠️';
        title = 'Đăng ký thông báo đã hết hạn';
        description = 'Phiên đăng ký push trên thiết bị này đã hết hạn. Hãy đăng ký lại để tiếp tục nhận nhắc bài.';
        actionBtnText = 'Đăng ký lại';
    }

    return (
        <div className={styles.bannerContainer}>
            <div className={`${styles.bannerCard} ${variantClass}`}>
                <div className={styles.contentGroup}>
                    <div className={styles.iconWrapper}>{icon}</div>
                    <div className={styles.textGroup}>
                        <div className={styles.title}>{title}</div>
                        <div className={styles.description}>{description}</div>
                    </div>
                </div>
                <div className={styles.actionGroup}>
                    {!isBlocked && (
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={handleSubscribe}
                            disabled={loading}
                        >
                            {loading ? 'Đang xử lý...' : actionBtnText}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.btnDismiss}
                        onClick={handleDismiss}
                    >
                        Để sau
                    </button>
                </div>
            </div>
        </div>
    );
}
