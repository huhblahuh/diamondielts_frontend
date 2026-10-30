import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function useSpeakingAvailability({ exerciseId = null, assignmentItemId = null }) {
    const scopeKey = assignmentItemId ? `assignment:${assignmentItemId}` : exerciseId ? `exercise:${exerciseId}` : null;
    const [snapshot, setSnapshot] = useState({ key: null, status: 'loading' });
    const requestVersion = useRef(0);
    const optimisticKey = useRef(null);
    const submitting = useRef(false);

    const refresh = useCallback(async () => {
        if (!scopeKey) return;
        const version = ++requestVersion.current;
        try {
            const params = assignmentItemId ? { assignmentItemId } : { exerciseId };
            const response = await axiosClient.get('/student/speaking/availability', { params });
            if (version !== requestVersion.current) return;
            if (!response.isProcessing && ['Completed', 'Failed', 'OffTopic'].includes(response.displayStatus))
                optimisticKey.current = null;
            setSnapshot({
                key: scopeKey,
                status: response.isProcessing || optimisticKey.current === scopeKey
                    ? 'processing' : response.canSubmit === false ? 'unavailable' : 'available',
                displayStatus: response.displayStatus || null,
                usedAttempts: response.usedAttempts,
                remainingAttempts: response.remainingAttempts,
            });
        } catch {
            if (version !== requestVersion.current) return;
            setSnapshot({ key: scopeKey,
                status: optimisticKey.current === scopeKey ? 'processing' : 'error' });
        }
    }, [scopeKey, assignmentItemId, exerciseId]);

    useEffect(() => {
        requestVersion.current += 1;
        optimisticKey.current = null;
        submitting.current = false;
        if (scopeKey) {
            setSnapshot({ key: scopeKey, status: 'loading' });
            void refresh();
        }
        return () => { requestVersion.current += 1; };
    }, [scopeKey, refresh]);

    useEffect(() => {
        if (!scopeKey) return undefined;
        const matches = detail => {
            if (!detail) return true;
            if (!detail.assignmentItemId && !detail.exerciseId) return true;
            if (assignmentItemId) return Number(detail.assignmentItemId) === Number(assignmentItemId);
            return Number(detail.exerciseId) === Number(exerciseId);
        };
        const onAvailability = event => {
            if (!matches(event.detail)) return;
            void refresh();
        };
        const onNotification = event => {
            if (!['SpeakingCompleted', 'SpeakingFailed', 'SpeakingOffTopic'].includes(event.detail?.type)) return;
            // Older failure notifications have no target identifiers; refresh the open exercise.
            if ((event.detail.exerciseId || event.detail.assignmentItemId) && !matches(event.detail)) return;
            optimisticKey.current = null;
            void refresh();
        };
        const onReconnect = () => { void refresh(); };
        window.addEventListener('diamond:speaking-availability-changed', onAvailability);
        window.addEventListener('diamond:notification-received', onNotification);
        window.addEventListener('diamond:notification-sync', onReconnect);
        return () => {
            window.removeEventListener('diamond:speaking-availability-changed', onAvailability);
            window.removeEventListener('diamond:notification-received', onNotification);
            window.removeEventListener('diamond:notification-sync', onReconnect);
        };
    }, [scopeKey, assignmentItemId, exerciseId, refresh]);

    const beginSubmit = useCallback(() => {
        if (submitting.current || snapshot.key !== scopeKey || snapshot.status !== 'available') return false;
        submitting.current = true;
        return true;
    }, [scopeKey, snapshot]);

    const submitted = useCallback(() => {
        submitting.current = false;
        optimisticKey.current = scopeKey;
        setSnapshot({ key: scopeKey, status: 'processing' });
        void refresh();
    }, [scopeKey, refresh]);

    const submitFailed = useCallback((conflict = false) => {
        submitting.current = false;
        optimisticKey.current = conflict ? scopeKey : null;
        setSnapshot({ key: scopeKey, status: conflict ? 'processing' : 'loading' });
        void refresh();
    }, [scopeKey, refresh]);

    return {
        status: snapshot.key === scopeKey ? snapshot.status : 'loading',
        displayStatus: snapshot.key === scopeKey ? snapshot.displayStatus : null,
        usedAttempts: snapshot.key === scopeKey ? snapshot.usedAttempts : null,
        remainingAttempts: snapshot.key === scopeKey ? snapshot.remainingAttempts : null,
        refresh,
        beginSubmit,
        submitted,
        submitFailed,
    };
}
