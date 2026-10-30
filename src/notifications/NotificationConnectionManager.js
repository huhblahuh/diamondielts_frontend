import * as signalR from '@microsoft/signalr';
import axiosClient from '../api/axiosClient';

const hubUrl = `${axiosClient.defaults.baseURL.replace(/\/api\/?$/, '')}/hubs/notifications`;
const EVENT_POLICY = Object.freeze({
    SUBMISSION_PHASE_CHANGED: 'ACTION',
    SUBMISSION_COMPLETED: 'BOTH',
    SUBMISSION_FAILED: 'BOTH',
    SUBMISSION_OFF_TOPIC: 'BOTH',
    DEADLINE_REMINDER: 'NOTIFICATION',
});

class NotificationConnectionManager {
    connection = null;
    retryTimer = null;
    retryCount = 0;
    stopped = true;
    starting = false;
    generation = 0;

    start() {
        if (this.connection || !localStorage.getItem('token')) return;
        this.generation += 1;
        this.stopped = false;
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, { accessTokenFactory: () => localStorage.getItem('token') || '' })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .build();
        this.connection.on('NotificationReceived', notification => {
            const target = new URL(notification.targetUrl || '/', window.location.origin);
            const detail = {
                ...notification,
                submissionId: notification.submissionId || Number(target.searchParams.get('id')) || null,
                exerciseId: Number(target.searchParams.get('exerciseId')) || null,
                assignmentItemId: Number(target.searchParams.get('assignmentItemId')) || null,
            };
            window.dispatchEvent(new CustomEvent('diamond:notification-received', { detail }));
        });
        this.connection.on('SpeakingAvailabilityChanged', detail => {
            if (detail?.displayStatus) return;
            window.dispatchEvent(new CustomEvent('diamond:speaking-availability-changed', { detail }));
        });
        this.connection.on('SubmissionEvent', event => {
            const policy = EVENT_POLICY[event?.eventName];
            if (policy !== 'ACTION' && policy !== 'BOTH') return;
            window.dispatchEvent(new CustomEvent('diamond:speaking-availability-changed', { detail: event }));
            window.dispatchEvent(new CustomEvent('diamond:speaking-history-refresh', { detail: event }));
            // BOTH notifications arrive through NotificationReceived with a persisted ID.
        });
        this.connection.onreconnected(() => this.sync());
        this.connection.onclose(error => {
            if (!this.stopped && !this.isAuthError(error)) this.scheduleRetry();
        });
        void this.connect();
    }

    async connect() {
        if (this.stopped || this.starting || !this.connection) return;
        if (this.connection.state !== signalR.HubConnectionState.Disconnected) return;
        const connection = this.connection;
        const generation = this.generation;
        this.starting = true;
        try {
            await connection.start();
            if (this.stopped || this.generation !== generation) return;
            this.retryCount = 0;
            this.sync();
        } catch (error) {
            if (this.generation === generation && !this.isAuthError(error)) this.scheduleRetry();
        } finally {
            if (this.generation === generation) this.starting = false;
        }
    }

    isAuthError(error) {
        return !localStorage.getItem('token') || /\b(401|403)\b|unauthorized|forbidden/i.test(String(error));
    }

    scheduleRetry() {
        if (this.retryTimer || this.stopped) return;
        const delay = Math.min(30000, 1000 * (2 ** Math.min(this.retryCount++, 5)));
        this.retryTimer = window.setTimeout(() => {
            this.retryTimer = null;
            void this.connect();
        }, delay);
    }

    sync() {
        window.dispatchEvent(new Event('diamond:notification-sync'));
        window.dispatchEvent(new Event('diamond:speaking-history-refresh'));
    }

    stop() {
        this.generation += 1;
        this.stopped = true;
        this.starting = false;
        if (this.retryTimer) window.clearTimeout(this.retryTimer);
        this.retryTimer = null;
        const connection = this.connection;
        this.connection = null;
        if (connection) void connection.stop().catch(error =>
            console.error('Could not stop notification connection', error));
    }
}

export const notificationConnectionManager = new NotificationConnectionManager();
