import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import styles from './NotificationCenter.module.css';

export default function NotificationCenter({ variant = 'icon' }) {
    const navigate = useNavigate();
    const centerRef = useRef(null);
    const panelRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const refresh = useCallback(async (nextPage = 1) => {
        try {
            const [list, unread] = await Promise.all([
                axiosClient.get(`/notifications?page=${nextPage}&pageSize=20`),
                axiosClient.get('/notifications/unread-count'),
            ]);
            setItems(previous => nextPage === 1 ? list.data : [
                ...previous, ...list.data.filter(item => !previous.some(old => old.notificationId === item.notificationId)),
            ]);
            setCount(unread.count);
            setPage(nextPage);
            setHasMore(nextPage * 20 < list.totalCount);
        } catch (error) {
            console.error('Could not load notifications', error);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const onSync = () => void refresh();
        const onReceived = () => void refresh();
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            void refresh();
            window.dispatchEvent(new Event('diamond:speaking-history-refresh'));
        };
        window.addEventListener('diamond:notification-sync', onSync);
        window.addEventListener('diamond:notification-received', onReceived);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('diamond:notification-sync', onSync);
            window.removeEventListener('diamond:notification-received', onReceived);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [refresh]);

    useEffect(() => {
        if (!open) return undefined;
        const closeOnOutsidePointer = event => {
            if (centerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', closeOnOutsidePointer);
        return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
    }, [open]);

    const markRead = async item => {
        if (!item.readAtUtc) {
            await axiosClient.patch(`/notifications/${item.notificationId}/read`);
            setItems(previous => previous.map(current => current.notificationId === item.notificationId
                ? { ...current, readAtUtc: new Date().toISOString() } : current));
            setCount(previous => Math.max(0, previous - 1));
        }
        if (item.targetUrl?.startsWith('/') && !item.targetUrl.startsWith('//')) {
            setOpen(false);
            const target = new URL(item.targetUrl, window.location.origin);
            const assignmentItemId = Number(target.searchParams.get('assignmentItemId'));
            const isOffTopic = target.searchParams.get('offTopic') === '1';
            navigate(item.targetUrl, {
                state: isOffTopic && Number.isInteger(assignmentItemId) && assignmentItemId > 0
                    ? { assignmentSpeaking: { itemId: assignmentItemId, submissionId: null } }
                    : undefined,
            });
            if (isOffTopic) {
                window.requestAnimationFrame(() => {
                    void Swal.fire({
                        icon: 'warning',
                        title: 'Bài nói lạc đề',
                        text: 'Vui lòng nói đúng đề bài',
                        confirmButtonText: 'Đã hiểu',
                        customClass: { container: 'off-topic-notice' },
                    });
                });
            }
        }
    };

    const markAllRead = async () => {
        await axiosClient.patch('/notifications/read-all');
        setItems(previous => previous.map(item => ({ ...item, readAtUtc: item.readAtUtc || new Date().toISOString() })));
        setCount(0);
    };

    const panel = open && <section ref={panelRef} className={`${styles.panel} ${variant === 'sidebar' ? styles.sidebarPanel : ''}`} aria-label="Trung tâm thông báo">
        <header><strong>Thông báo</strong><button type="button" onClick={markAllRead} disabled={!count}>Đọc tất cả</button></header>
        <div className={styles.list}>
            {items.length === 0 && <p>Chưa có thông báo.</p>}
            {items.map(item => <button type="button" key={item.notificationId}
                className={`${styles.item} ${!item.readAtUtc ? styles.unread : ''}`}
                onClick={() => void markRead(item)}>
                <strong>{item.title}</strong><span>{item.message}</span>
                <small>{new Date(item.createdAtUtc).toLocaleString('vi-VN')}</small>
            </button>)}
        </div>
        {hasMore && <button type="button" className={styles.more} onClick={() => void refresh(page + 1)}>Xem thêm</button>}
    </section>;

    return <div ref={centerRef} className={`${styles.center} ${variant === 'sidebar' ? styles.sidebarCenter : ''}`}>
        <button className={styles.bell} type="button" aria-label={`Thông báo, ${count} chưa đọc`}
            aria-expanded={open} onClick={() => setOpen(value => !value)}>
            <i className="bi bi-bell" aria-hidden="true" />
            {count > 0 && <span className={styles.badge}>{count > 99 ? '99+' : count}</span>}
        </button>
        {variant === 'sidebar' && panel ? createPortal(panel, document.body) : panel}
    </div>;
}
