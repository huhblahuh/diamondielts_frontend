import { isPushSupported, subscribePush } from './pushNotification';

export async function getMissingBrowserPermissions(role) {
    let microphone = false;
    if (window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
        try {
            const status = await navigator.permissions.query({ name: 'microphone' });
            microphone = status.state === 'prompt';
        } catch {
            // Some browsers do not expose microphone through Permissions.query.
            // getUserMedia will reuse a saved decision without showing another prompt.
            microphone = true;
        }
    }

    const notifications = 'Notification' in window
        && Notification.permission === 'default'
        && (role !== 'Student' || isPushSupported());

    return { microphone, notifications, role };
}

export async function requestMissingBrowserPermissions(missing) {
    // Start both requests directly from the same click. Browsers may require
    // user activation for the notification permission prompt.
    const microphoneRequest = missing.microphone
        ? navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                stream.getTracks().forEach((track) => track.stop());
                return true;
            })
        : Promise.resolve(true);
    const notificationRequest = missing.notifications
        ? (missing.role === 'Student'
            ? subscribePush()
            : Notification.requestPermission().then((permission) => ({
                success: permission === 'granted',
            })))
        : Promise.resolve({ success: true });

    const [microphone, notifications] = await Promise.allSettled([
        microphoneRequest,
        notificationRequest,
    ]);
    return {
        microphoneGranted: microphone.status === 'fulfilled',
        notifications: notifications.status === 'fulfilled'
            ? notifications.value
            : { success: false },
    };
}
