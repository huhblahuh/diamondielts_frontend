// Diamond IELTS Web Push Service Worker
self.addEventListener('push', event => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {
            title: 'Diamond IELTS',
            body: event.data ? event.data.text() : 'Bạn có thông báo nhắc nhở bài tập.'
        };
    }

    const title = data.title || 'Diamond IELTS';
    const options = {
        body: data.body || 'Bạn có thông báo nhắc nhở hạn nộp bài tập.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.assignmentId ? `assignment-${data.assignmentId}` : 'deadline-reminder',
        renotify: true,
        data: {
            url: data.url || '/student/classroom',
            assignmentId: data.assignmentId
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/student/classroom';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

self.addEventListener('pushsubscriptionchange', event => {
    event.waitUntil((async () => {
        try {
            const oldOptions = event.oldSubscription?.options;
            if (oldOptions?.applicationServerKey) {
                await self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: oldOptions.applicationServerKey
                });
            }
        } catch (error) {
            console.error('Failed to renew push subscription:', error);
        }

        const windowClients = await clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });
        windowClients.forEach(client => {
            client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
        });
    })());
});
