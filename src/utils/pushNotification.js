import axiosClient from '../api/axiosClient';

const DISMISS_STORAGE_KEY = 'push_banner_dismissed_until';

/**
 * Converts a URL-safe Base64 string to a Uint8Array for pushManager.subscribe.
 */
export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Check if Web Push and Service Workers are supported in the current browser.
 */
export function isPushSupported() {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Register the Service Worker.
 */
export async function registerServiceWorker() {
    if (!isPushSupported()) return null;

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        return registration;
    } catch (err) {
        console.error('Service Worker registration failed:', err);
        return null;
    }
}

/**
 * Fetch VAPID public key from backend.
 */
export async function getVapidPublicKey() {
    try {
        const data = await axiosClient.get('/config/vapid-public-key');
        return data?.publicKey || '';
    } catch (err) {
        console.error('Failed to get VAPID public key:', err);
        return '';
    }
}

/**
 * Fetch push subscription status for currently logged in student.
 */
export async function getPushStatus() {
    if (!isPushSupported()) {
        return { hasActive: false, hasExpired: false, supported: false };
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = registration
            ? await registration.pushManager.getSubscription()
            : null;
        const res = await axiosClient.get('/student/push-subscription/status', {
            params: subscription?.endpoint
                ? { endpoint: subscription.endpoint }
                : undefined
        });
        const deviceActive = !!res?.deviceActive;
        const deviceExpired = !!res?.deviceExpired;
        return {
            deviceActive,
            deviceExpired,
            accountDeviceCount: Number(res?.accountDeviceCount || 0),
            // Compatibility aliases used by the current banner/dashboard UI.
            hasActive: deviceActive,
            hasExpired: deviceExpired,
            supported: true
        };
    } catch (err) {
        console.error('Failed to fetch push status:', err);
        return { hasActive: false, hasExpired: false, supported: true };
    }
}

async function saveSubscription(subscription) {
    const subJson = subscription.toJSON();
    await axiosClient.post('/student/push-subscription', {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || ''
        }
    });
}

/**
 * Associate an existing browser subscription with the currently signed-in user.
 * The backend transfers ownership when the same browser was used by another account.
 */
export async function syncExistingPushSubscription() {
    if (!isPushSupported() || Notification.permission !== 'granted') {
        return { synced: false, reason: 'not_subscribed' };
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) {
            return { synced: false, reason: 'registration_failed' };
        }
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            return { synced: false, reason: 'not_subscribed' };
        }

        await saveSubscription(subscription);
        return { synced: true };
    } catch (err) {
        console.error('Failed to synchronize push subscription:', err);
        return { synced: false, error: err };
    }
}

/**
 * Request notification permission, register subscription with browser & backend.
 */
export async function subscribePush() {
    if (!isPushSupported()) {
        return { success: false, reason: 'unsupported' };
    }

    if (Notification.permission === 'denied') {
        return { success: false, permissionDenied: true };
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, permissionDenied: permission === 'denied' };
        }

        const registration = await registerServiceWorker();
        if (!registration) {
            return { success: false, reason: 'registration_failed' };
        }

        const publicKey = await getVapidPublicKey();
        if (!publicKey) {
            return { success: false, reason: 'missing_key' };
        }

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const convertedVapidKey = urlBase64ToUint8Array(publicKey);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        await saveSubscription(subscription);

        clearDismissedBanner();
        return { success: true };
    } catch (err) {
        console.error('Failed to subscribe to push notifications:', err);
        const reason = err?.name === 'AbortError' &&
            err?.message?.includes('push service error')
            ? 'push_service_error'
            : 'subscription_failed';
        return { success: false, reason, error: err };
    }
}

export function getPushFailureMessage(result) {
    if (result?.reason === 'push_service_error') {
        return 'Trình duyệt không đăng ký được với dịch vụ push. Hãy thử mạng hoặc trình duyệt khác.';
    }
    if (result?.reason === 'registration_failed') {
        return 'Không thể khởi tạo thông báo trên trình duyệt. Hãy tải lại trang và thử lại.';
    }
    if (result?.reason === 'missing_key') {
        return 'Máy chủ chưa cung cấp khóa để bật thông báo.';
    }
    return 'Không thể bật thông báo. Vui lòng thử lại.';
}

/**
 * Remove only the current account association. The browser permission and local
 * subscription remain available for a later account to claim safely.
 */
export async function detachPushSubscription() {
    if (!isPushSupported()) return true;

    let subscription = null;
    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        subscription = registration
            ? await registration.pushManager.getSubscription()
            : null;

        if (subscription) {
            await axiosClient.delete('/student/push-subscription', {
                params: { endpoint: subscription.endpoint }
            });
        }
        return true;
    } catch (err) {
        console.error('Failed to detach push subscription:', err);

        // Failing closed is safer on a shared device: invalidate the local
        // endpoint so notifications for the previous account cannot arrive.
        if (subscription) {
            try {
                await subscription.unsubscribe();
            } catch (unsubscribeError) {
                console.error('Failed to invalidate local push subscription:', unsubscribeError);
            }
        }
        return false;
    }
}

/**
 * Unsubscribe from push notifications locally and in backend.
 */
export async function unsubscribePush() {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();
            await axiosClient.delete(`/student/push-subscription?endpoint=${encodeURIComponent(endpoint)}`);
        }
        return true;
    } catch (err) {
        console.error('Failed to unsubscribe push:', err);
        return false;
    }
}

/**
 * Dismiss banner helper (stored in localStorage with expiry).
 */
export function isBannerDismissed() {
    try {
        const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (!dismissedUntil) return false;
        return Date.now() < parseInt(dismissedUntil, 10);
    } catch {
        return false;
    }
}

export function dismissBanner(days = 3) {
    try {
        const expiryTime = Date.now() + days * 24 * 60 * 60 * 1000;
        localStorage.setItem(DISMISS_STORAGE_KEY, expiryTime.toString());
    } catch (e) {
        console.error('Failed to save dismiss state:', e);
    }
}

export function clearDismissedBanner() {
    try {
        localStorage.removeItem(DISMISS_STORAGE_KEY);
    } catch (e) {
        console.error('Failed to clear dismiss state:', e);
    }
}
