import React, { Suspense, useEffect, useState, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import siteLogo from '../../assets/site-logo.webp';
import PageSkeleton from '../common/PageSkeleton';
import userQuotaService from '../../api/services/userQuota.service';
import authService from '../../api/services/auth.service';
import {
    getPushStatus,
    isPushSupported,
    syncExistingPushSubscription,
} from '../../utils/pushNotification';

const QUOTA_PERIODS = [
    { value: 'Daily', label: 'Theo ngày' },
    { value: 'Weekly', label: 'Theo tuần' },
    { value: 'Monthly', label: 'Theo tháng' },
];

function formatResetRemaining(resetDate, now = Date.now()) {
    const milliseconds = new Date(resetDate).getTime() - now;
    if (milliseconds <= 0) return 'Sắp được reset';

    const totalMinutes = Math.ceil(milliseconds / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
}

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(() => authService.getCurrentUser() || {});
    const role = user.role || 'Student';
    const isStudentMobileView = role === 'Student';

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isQuotaOpen, setIsQuotaOpen] = useState(false);
    const [mySpeakingQuota, setMySpeakingQuota] = useState(
        user.speakingQuota || null,
    );
    const [isQuotaLoading, setIsQuotaLoading] = useState(false);
    const [quotaError, setQuotaError] = useState('');
    const [showAllQuotaPeriods, setShowAllQuotaPeriods] = useState(false);
    const [quotaClock, setQuotaClock] = useState(Date.now());
    const [customHeader, setCustomHeader] = useState(null);
    const [pushStatus, setPushStatus] = useState(null);
    const pushInitializedRef = useRef(false);

    useEffect(() => {
        setCustomHeader(null);
    }, [location.pathname]);

    useEffect(() => {
        if (role !== 'Student' || !isPushSupported()) return undefined;
        if (pushInitializedRef.current) return undefined;

        pushInitializedRef.current = true;

        let isActive = true;
        const initializeStudentPush = async () => {
            try {
                // Reassociate an existing browser subscription with this user.
                // Creating a new subscription requires an explicit user click.
                if (Notification.permission === 'granted') {
                    await syncExistingPushSubscription();
                }

                const status = await getPushStatus();
                if (isActive) setPushStatus(status);
            } catch (error) {
                console.error('Automatic push setup failed:', error);
            }
        };

        void initializeStudentPush();

        return () => {
            isActive = false;
        };
    }, [role]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    useEffect(() => {
        if (role !== 'Student') return undefined;

        let isActive = true;
        setIsQuotaLoading(true);
        userQuotaService.getMySpeakingQuota()
            .then((quota) => {
                if (isActive) {
                    setMySpeakingQuota(quota || null);
                }
            })
            .catch(() => {
                if (isActive) setMySpeakingQuota(null);
            })
            .finally(() => {
                if (isActive) setIsQuotaLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [role]);

    useEffect(() => {
        if (!isQuotaOpen) return undefined;
        setQuotaClock(Date.now());
        const timer = window.setInterval(() => setQuotaClock(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, [isQuotaOpen]);

    useEffect(() => {
        const syncUser = (event) => setUser(event.detail || authService.getCurrentUser() || {});
        window.addEventListener('diamond:user-updated', syncUser);
        return () => window.removeEventListener('diamond:user-updated', syncUser);
    }, []);

    const mainContentRef = React.useRef(null);
    const dimVeilRef = React.useRef(null);
    const edgeHandleRef = React.useRef(null);

    // Return to the parent screen within the student routes.
    const getParentRouteUrl = (pathname, search) => {
        if (!pathname) return null;
        const clean = pathname.split('?')[0].replace(/\/+$/, '');

        // 1. Root dashboards: STOP, never exit app
        const rootPaths = [
            '/student', '/student/dashboard',
            '/teacher', '/teacher/dashboard',
            '/admin', '/admin/dashboard'
        ];
        if (rootPaths.includes(clean)) {
            return null;
        }

        // 2. Student hierarchy:
        if (clean === '/student/history' && new URLSearchParams(search).has('id')) {
            return '/student/history';
        }
        if (clean === '/student/assignments') {
            return '/student/dashboard';
        }
        if (clean.startsWith('/student/assignments/') || clean.startsWith('/student/assignment/')) {
            return '/student/assignments';
        }
        if (clean.includes('/speaking')) {
            return '/student/practice';
        }
        if (clean.startsWith('/student/')) {
            return '/student/dashboard';
        }

        // 3. Teacher hierarchy:
        if (clean.startsWith('/teacher/assignment') || clean.startsWith('/teacher/create-speaking')) {
            return '/teacher/classrooms';
        }
        if (clean.startsWith('/teacher/')) {
            return '/teacher/dashboard';
        }

        // 4. Admin hierarchy:
        if (clean.startsWith('/admin/assignment') || clean.startsWith('/admin/create-speaking')) {
            return '/admin/classrooms';
        }
        if (clean.startsWith('/admin/')) {
            return '/admin/dashboard';
        }

        return null;
    };

    // Calculate target route to navigate back to
    const getPreviousInternalUrl = () => {
        return getParentRouteUrl(location.pathname, location.search);
    };

    // iOS-style left-edge swipe back gesture
    useEffect(() => {
        // State per gesture
        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let tracking = false;   // touch started in edge zone
        let active = false;     // confirmed horizontal drag
        let gestureBlocked = false;

        const EDGE_ZONE = 35;         // px from left edge to initiate
        const CONFIRM_DX = 12;        // px horizontal movement to confirm gesture
        const CANCEL_DY_RATIO = 1.2;  // vertical:horizontal ratio to cancel
        const THRESHOLD_RATIO = 0.25; // fraction of screen to commit
        const DAMPING = 0.88;         // finger tracking damping

        const resetStyles = () => {
            const mc = mainContentRef.current;
            const dv = dimVeilRef.current;
            if (mc) { mc.style.transform = ''; mc.style.boxShadow = ''; mc.style.transition = ''; }
            if (dv) { dv.style.opacity = ''; dv.style.transition = ''; }
        };

        const onTouchStart = (e) => {
            if (window.innerWidth > 768) return;
            if (e.touches.length !== 1) return;
            if (isSidebarOpen || isQuotaOpen) return;

            const touch = e.touches[0];
            // Only fire from left edge zone
            if (touch.clientX > EDGE_ZONE) return;

            const target = e.target;
            if (
                target.closest('input:not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]') ||
                target.closest('[data-no-swipe], audio, video')
            ) return;

            // No parent route → don't track
            if (!getPreviousInternalUrl()) return;

            startX = touch.clientX;
            startY = touch.clientY;
            lastX = startX;
            tracking = true;
            active = false;
            gestureBlocked = false;
        };

        const onTouchMove = (e) => {
            if (!tracking || gestureBlocked) return;
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            lastX = touch.clientX;

            if (!active) {
                // Cancel if user is scrolling vertically
                if (Math.abs(dy) > CONFIRM_DX && Math.abs(dy) > Math.abs(dx) * CANCEL_DY_RATIO) {
                    gestureBlocked = true;
                    return;
                }
                // Only confirm right swipe
                if (dx > CONFIRM_DX && dx > Math.abs(dy)) {
                    active = true;
                    // Prevent page scroll once gesture is confirmed
                    e.preventDefault();
                }
                return;
            }

            // Active drag — follow finger with damping, clamp to [0, screenW]
            const screenW = window.innerWidth || 390;
            const moveX = Math.max(0, dx * DAMPING);
            const progress = Math.min(moveX / screenW, 1);

            e.preventDefault();

            const mc = mainContentRef.current;
            const dv = dimVeilRef.current;

            if (mc) {
                mc.style.transition = 'none';
                mc.style.transform = `translateX(${moveX}px)`;
                mc.style.boxShadow = `-${8 + progress * 24}px 0 32px rgba(0,0,0,${0.08 + progress * 0.18})`;
            }
            if (dv) {
                dv.style.transition = 'none';
                dv.style.opacity = `${(1 - progress) * 0.55}`;
            }
        };

        const onTouchEnd = () => {
            if (!tracking) return;
            tracking = false;

            if (!active) {
                gestureBlocked = false;
                return;
            }
            active = false;
            gestureBlocked = false;

            const dx = lastX - startX;
            const screenW = window.innerWidth || 390;
            const committed = dx * DAMPING >= screenW * THRESHOLD_RATIO;

            const targetUrl = getPreviousInternalUrl();

            if (committed && targetUrl && targetUrl !== `${location.pathname}${location.search}`) {
                // Slide off and navigate
                const mc = mainContentRef.current;
                const dv = dimVeilRef.current;
                const dur = 240;
                const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

                if (mc) {
                    mc.style.transition = `transform ${dur}ms ${easing}`;
                    mc.style.transform = 'translateX(100%)';
                    mc.style.boxShadow = 'none';
                }
                if (dv) {
                    dv.style.transition = `opacity ${dur}ms ease`;
                    dv.style.opacity = '0';
                }

                setTimeout(() => {
                    navigate(targetUrl);
                    resetStyles();
                }, dur + 10);
            } else {
                // Spring back
                const mc = mainContentRef.current;
                const dv = dimVeilRef.current;
                const easing = 'cubic-bezier(0.42, 0, 0.18, 1.2)'; // slight overshoot feel

                if (mc) {
                    mc.style.transition = `transform 0.28s ${easing}, box-shadow 0.28s ease`;
                    mc.style.transform = 'translateX(0)';
                    mc.style.boxShadow = 'none';
                }
                if (dv) {
                    dv.style.transition = 'opacity 0.28s ease';
                    dv.style.opacity = '0.55';
                }

                setTimeout(resetStyles, 300);
            }
        };

        // touchmove must be non-passive so we can preventDefault during active drag
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isSidebarOpen, isQuotaOpen, location.pathname, location.search, navigate, role]);

    const openMyQuota = async () => {
        if (role !== 'Student') return;
        setShowAllQuotaPeriods(false);
        setIsQuotaOpen(true);
        setIsQuotaLoading(true);
        setQuotaError('');
        try {
            const quota = await userQuotaService.getMySpeakingQuota();
            setMySpeakingQuota(quota || null);
        } catch (error) {
            setQuotaError(error?.message || 'Không thể tải quota lúc này.');
        } finally {
            setIsQuotaLoading(false);
        }
    };

    const closeMyQuota = () => setIsQuotaOpen(false);

    const adminLinks = [
        { path: "/admin/dashboard", label: "Dashboard", icon: "bi-grid" },
        { path: "/admin/classrooms", label: "Quản Lý Lớp Học", icon: "bi-people" },
        { path: "/admin/exercises", label: "Bài tập tự luyện", icon: "bi-folder-check" },
        { path: "/admin/quota-dashboard", label: "Quota & Tài Nguyên", icon: "bi-speedometer2" },
        { path: "/admin/users", label: "Quản Lý Người Dùng", icon: "bi-person-gear" },
        { path: "/admin/settings/account", label: "Profile", icon: "bi-person-circle" },
    ];

    const teacherLinks = [
        { path: "/teacher/dashboard", label: "Dashboard", icon: "bi-grid" },
        { path: "/teacher/classrooms", label: "Quản Lý Lớp Học", icon: "bi-people" },
        { path: "/teacher/exercises", label: "Bài tập tự luyện", icon: "bi-folder-check" },
        { path: "/teacher/settings/account", label: "Profile", icon: "bi-person-circle" },
    ];

    const studentLinks = [
        { path: "/student/dashboard", label: "Home", icon: "bi-house" },
        { path: "/student/practice", label: "Practice", icon: "bi-journal-text" },
        { path: "/student/assignments", label: "Assignment", icon: "bi-journal-check" },
        { path: "/student/history", label: "History", icon: "bi-clock-history" },
        { path: "/student/settings/account", label: "Profile", icon: "bi-person-circle" },
    ];

    const links = role === 'Admin' ? adminLinks : (role === 'Teacher' ? teacherLinks : studentLinks);

    // Bottom nav: cap Admin to 5 most-used tabs
    const adminBottomLinks = [
        { path: "/admin/dashboard", label: "Dashboard", icon: "bi-grid" },
        { path: "/admin/classrooms", label: "Lớp Học", icon: "bi-people" },
        { path: "/admin/exercises", label: "Bài Tập", icon: "bi-folder-check" },
        { path: "/admin/users", label: "Users", icon: "bi-person-gear" },
        { path: "/admin/settings/account", label: "Profile", icon: "bi-person-circle" },
    ];
    const bottomLinks = (role === 'Admin' ? adminBottomLinks
        : role === 'Teacher' ? teacherLinks
            : studentLinks).map((link) => link.path.endsWith('/settings/account')
                ? { ...link, path: `/${role.toLowerCase()}/settings` }
                : link);

    // Determine which bottom tab is active
    const activeBottomIndex = bottomLinks.findIndex(link => {
        const clean = location.pathname.split('?')[0].replace(/\/+$/, '');
        if (link.path === clean) return true;
        // Student special cases
        if (link.path === '/student/dashboard' && (
            clean === '/student' || clean === '/student/dashboard' || clean.startsWith('/student/dashboard/')
        )) return true;
        if (link.path === '/student/assignments' && (
            clean.startsWith('/student/assignments') ||
            clean.startsWith('/student/assignment') ||
            clean.startsWith('/student/classrooms') ||
            clean.startsWith('/student/classroom')
        )) return true;
        if (link.path.endsWith('/settings') && clean.startsWith(`/${role.toLowerCase()}/settings`)) return true;
        // Teacher special cases
        if (link.path === '/teacher/dashboard' && clean === '/teacher') return true;
        if (link.path === '/teacher/classrooms' && (
            clean.startsWith('/teacher/classrooms') ||
            clean.startsWith('/teacher/assignment')
        )) return true;
        // Admin special cases
        if (link.path === '/admin/dashboard' && clean === '/admin') return true;
        if (link.path === '/admin/classrooms' && (
            clean.startsWith('/admin/classrooms') ||
            clean.startsWith('/admin/assignment')
        )) return true;
        return false;
    });

    const availableQuotaPeriods = QUOTA_PERIODS
        .map((period) => ({
            period,
            quota: (mySpeakingQuota?.limits || [])
                .find((item) => item.timeFrame === period.value),
        }))
        .filter((item) => Boolean(item.quota));
    const hasAdditionalQuotaPeriods = availableQuotaPeriods
        .some((item) => item.period.value !== 'Daily');

    return (
        <div className={styles.wrapper}>
            {/* Mobile Overlay */}
            <div
                className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.overlayActive : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarMobileOpen : ''}`}>
                {/* Brand */}
                <div className={styles.brand}>
                    <div className={styles.brandTitle}>
                        <img src={siteLogo} alt="Diamond Ielts" className={styles.brandLogo} />
                        <div className={styles.brandText}>
                            <span className={styles.brandName}>Diamond Ielts</span>
                            <span className={styles.brandSub}>IELTS Speaking</span>
                        </div>
                    </div>
                    <button className={styles.mobileCloseBtn} onClick={closeSidebar}>&times;</button>
                </div>

                {/* Nav */}
                <nav className={styles.nav}>
                    {links.map(link => {
                        const isActive = location.pathname === link.path ||
                            (link.path === '/student/dashboard' && (
                                location.pathname === '/student' ||
                                location.pathname === '/student/dashboard' ||
                                location.pathname.startsWith('/student/dashboard/')
                            )) ||
                            (link.path === '/student/assignments' && (
                                location.pathname.startsWith('/student/assignments') ||
                                location.pathname.startsWith('/student/assignment') ||
                                location.pathname.startsWith('/student/classrooms') ||
                                location.pathname.startsWith('/student/classroom')
                            )) ||
                            (link.path.endsWith('/settings/account') && location.pathname.startsWith(`/${role.toLowerCase()}/settings`)) ||
                            (link.path === '/teacher/dashboard' && location.pathname === '/teacher') ||
                            (link.path === '/teacher/classrooms' && (
                                location.pathname.startsWith('/teacher/classrooms') ||
                                location.pathname.startsWith('/teacher/assignment')
                            )) ||
                            (link.path === '/admin/dashboard' && location.pathname === '/admin') ||
                            (link.path === '/admin/classrooms' && (
                                location.pathname.startsWith('/admin/classrooms') ||
                                location.pathname.startsWith('/admin/assignment')
                            ));
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                                onClick={closeSidebar}
                            >
                                <i className={`bi ${link.icon}`}></i>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Logout */}
                <div className={styles.sidebarLogout}>
                    <button onClick={handleLogout} className={styles.btnLogoutFull} title="Đăng xuất">
                        <i className="bi bi-box-arrow-left"></i>
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Previous Page Underlay — skeleton shimmer shown during swipe-back */}
            <div className={styles.prevPageLayer} aria-hidden="true">
                <div className={styles.prevPageSkeleton}>
                    <div className={`${styles.skelBlock} ${styles.skelTitle}`} />
                    <div className={`${styles.skelBlock} ${styles.skelCard}`} />
                    <div className={`${styles.skelBlock} ${styles.skelCard} ${styles.skelCardShort}`} />
                    <div className={`${styles.skelBlock} ${styles.skelCard}`} />
                    <div className={`${styles.skelBlock} ${styles.skelCardSmall}`} />
                    <div className={`${styles.skelBlock} ${styles.skelCardSmall}`} />
                </div>
                <div ref={dimVeilRef} className={styles.dimVeil} />
            </div>

            {/* Edge handle — visual hint for swipe-back */}
            <div ref={edgeHandleRef} className={styles.edgeHandle} aria-hidden="true" />

            {/* Main Content */}
            <main ref={mainContentRef} className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <button className={styles.hamburger} onClick={toggleSidebar}>
                        <i className="bi bi-list"></i>
                    </button>
                    {customHeader ? (
                        customHeader
                    ) : (
                        <h2>{(role === 'Teacher' || role === 'Admin') ? 'Bảng Điều Khiển Giáo Viên' : 'Cổng Học Viên / Student Portal'}</h2>
                    )}
                </header>
                <div className={`${styles.pageBody} ${isStudentMobileView ? styles.studentPageBody : ''}`}>
                    <Suspense fallback={<PageSkeleton />}>
                        <Outlet context={{
                            setCustomHeader,
                            pushStatus,
                            setPushStatus,
                            openSidebar: () => setIsSidebarOpen(true),
                            mySpeakingQuota,
                            isQuotaLoading,
                            openMyQuota,
                        }} />
                    </Suspense>
                </div>
            </main>

            {role === 'Student' && isQuotaOpen && (
                <div
                    className={styles.quotaBackdrop}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeMyQuota();
                        }
                    }}
                >
                    <section
                        className={styles.quotaModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="my-quota-title"
                    >
                        <div className={styles.quotaModalHeader}>
                            <div>
                                <span>ĐIỂM QUOTA SPEAKING</span>
                                <h2 id="my-quota-title">Hạn mức của tôi</h2>
                                <p>Quota dùng cho các bài luyện Speaking tự do.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeMyQuota}
                                aria-label="Đóng"
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className={styles.quotaModalBody}>
                            {isQuotaLoading ? (
                                <div className={styles.quotaState}>
                                    <i className="bi bi-arrow-repeat" />
                                    Đang tải quota…
                                </div>
                            ) : quotaError ? (
                                <div className={`${styles.quotaState} ${styles.quotaError}`}>
                                    <i className="bi bi-exclamation-circle" />
                                    {quotaError}
                                </div>
                            ) : !mySpeakingQuota || availableQuotaPeriods.length === 0 ? (
                                <div className={styles.quotaState}>
                                    <i className="bi bi-inbox" />
                                    Tài khoản chưa được thiết lập quota Speaking.
                                </div>
                            ) : (
                                <article className={styles.quotaItem}>
                                    <div className={`${styles.quotaPeriods} ${showAllQuotaPeriods ? styles.quotaPeriodsExpanded : ''}`}>
                                        {availableQuotaPeriods.map(({ period, quota }) => {
                                            const usagePercentage = Math.min(
                                                100,
                                                Math.max(0, Number(quota?.usagePercentage || 0)),
                                            );

                                            return (
                                                <section
                                                    key={period.value}
                                                    className={`${styles.quotaPeriodCard} ${period.value !== 'Daily' ? styles.quotaPeriodSecondary : ''}`}
                                                >
                                                    <div className={styles.quotaItemTop}>
                                                        <div>
                                                            <strong>{period.label}</strong>
                                                            <small>{Number(quota.used).toLocaleString('vi-VN')} điểm đã dùng</small>
                                                        </div>
                                                        <span>
                                                            {Number(quota.remaining).toLocaleString('vi-VN')}/{Number(quota.limit).toLocaleString('vi-VN')} điểm
                                                        </span>
                                                    </div>
                                                    <div className={styles.quotaProgress}>
                                                        <span style={{ width: `${usagePercentage}%` }} />
                                                    </div>
                                                    <div className={styles.quotaReset}>
                                                        {quota.periodEndsAtUtc
                                                            ? `Reset sau ${formatResetRemaining(quota.periodEndsAtUtc, quotaClock)}`
                                                            : 'Không có lịch reset'}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                    </div>
                                    {hasAdditionalQuotaPeriods && (
                                        <button
                                            type="button"
                                            className={styles.quotaPeriodToggle}
                                            onClick={() => setShowAllQuotaPeriods((current) => !current)}
                                        >
                                            {showAllQuotaPeriods ? 'Chỉ theo ngày' : 'Tất cả'}
                                            <i className={`bi ${showAllQuotaPeriods ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                        </button>
                                    )}
                                </article>
                            )}
                        </div>
                    </section>
                </div>
            )}
            {/* ── Mobile Bottom Navigation Bar ────────────────────────────────── */}
            <nav className={styles.mobileBottomNav} aria-label="Mobile navigation">
                {/* Sliding pill indicator */}
                {activeBottomIndex >= 0 && (
                    <span
                        className={styles.mobileNavPill}
                        style={{ '--tab-index': activeBottomIndex, '--tab-count': bottomLinks.length }}
                        aria-hidden="true"
                    />
                )}
                {bottomLinks.map((link, idx) => {
                    const isActive = idx === activeBottomIndex;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                            aria-label={link.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <i className={`bi ${link.icon} ${styles.mobileNavIcon}`} />
                            <span className={styles.mobileNavLabel}>{link.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
