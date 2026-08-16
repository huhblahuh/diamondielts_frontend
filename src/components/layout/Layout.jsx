import React, { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import siteLogo from '../../assets/site-logo.webp';
import PageSkeleton from '../common/PageSkeleton';
import userQuotaService from '../../api/services/userQuota.service';

function formatResetRemaining(resetDate) {
    const milliseconds = new Date(resetDate).getTime() - Date.now();
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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'Student';

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isQuotaOpen, setIsQuotaOpen] = useState(false);
    const [mySpeakingQuota, setMySpeakingQuota] = useState(
        user.speakingQuota || null,
    );
    const [isQuotaLoading, setIsQuotaLoading] = useState(false);
    const [quotaError, setQuotaError] = useState('');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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

    const openMyQuota = async () => {
        if (role !== 'Student') return;
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
    ];

    const teacherLinks = [
        { path: "/teacher/dashboard", label: "Dashboard", icon: "bi-grid" },
        { path: "/teacher/classrooms", label: "Quản Lý Lớp Học", icon: "bi-people" },
        { path: "/teacher/exercises", label: "Bài tập tự luyện", icon: "bi-folder-check" },
    ];

    const studentLinks = [
        { path: "/student/dashboard", label: "Home", icon: "bi-house" },
        { path: "/student/practice", label: "Practice", icon: "bi-journal-text" },
        { path: "/student/classrooms", label: "Classroom", icon: "bi-mortarboard" },
        { path: "/student/history", label: "History", icon: "bi-clock-history" },
    ];

    const links = role === 'Admin' ? adminLinks : (role === 'Teacher' ? teacherLinks : studentLinks);

    const userInitial = (user.fullName || 'U').trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase();

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
                            <span className={styles.brandSub}>Brighter Every Day</span>
                        </div>
                    </div>
                    <button className={styles.mobileCloseBtn} onClick={closeSidebar}>&times;</button>
                </div>

                {/* Nav */}
                <nav className={styles.nav}>
                    {links.map(link => {
                        const isActive = location.pathname === link.path || 
                            (link.path === '/student/dashboard' && location.pathname === '/student') ||
                            (link.path === '/teacher/dashboard' && location.pathname === '/teacher') ||
                            (link.path === '/admin/dashboard' && location.pathname === '/admin');
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

                {/* User Section */}
                <div className={styles.userSection}>
                    {role === 'Student' ? (
                        <button
                            type="button"
                            className={styles.userAvatar}
                            onClick={openMyQuota}
                            aria-label="Xem lượt nộp Speaking của tôi"
                            aria-haspopup="dialog"
                            aria-expanded={isQuotaOpen}
                            title="Xem lượt nộp Speaking"
                        >
                            {userInitial}
                        </button>
                    ) : (
                        <div className={`${styles.userAvatar} ${styles.staticAvatar}`}>
                            {userInitial}
                        </div>
                    )}
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{user.fullName || 'User'}</p>
                        <small>
                            {role === 'Student'
                                ? isQuotaLoading
                                    ? 'Đang tải lượt nộp…'
                                    : mySpeakingQuota
                                        ? `Còn ${Number(mySpeakingQuota.remaining).toLocaleString('vi-VN')} lượt nộp`
                                        : 'Chưa có hạn mức nộp bài'
                                : `${role === 'Teacher' ? 'GV. ' : 'AD. '}${role}`}
                        </small>
                    </div>
                    <button onClick={handleLogout} className={styles.btnLogout} title="Đăng xuất">
                        <i className="bi bi-box-arrow-left"></i>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <button className={styles.hamburger} onClick={toggleSidebar}>
                        <i className="bi bi-list"></i>
                    </button>
                    <h2>{(role === 'Teacher' || role === 'Admin') ? 'Bảng Điều Khiển Giáo Viên' : 'Cổng Học Viên / Student Portal'}</h2>
                </header>
                <div className={styles.pageBody}>
                    <Suspense fallback={<PageSkeleton />}>
                        <Outlet />
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
                                <span>LƯỢT NỘP SPEAKING</span>
                                <h2 id="my-quota-title">Hạn mức của tôi</h2>
                                <p>Chỉ hiển thị lượt nộp của tài khoản hiện tại.</p>
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
                            ) : !mySpeakingQuota ? (
                                <div className={styles.quotaState}>
                                    <i className="bi bi-inbox" />
                                    Tài khoản chưa được thiết lập lượt nộp Speaking.
                                </div>
                            ) : (
                                <article className={styles.quotaItem}>
                                    <div className={styles.speakingQuotaStats}>
                                        <div>
                                            <span>Đã nộp</span>
                                            <strong>
                                                {Number(mySpeakingQuota.used).toLocaleString('vi-VN')}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Tối đa</span>
                                            <strong>
                                                {Number(mySpeakingQuota.limit).toLocaleString('vi-VN')}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Còn lại</span>
                                            <strong>
                                                {Number(mySpeakingQuota.remaining).toLocaleString('vi-VN')}
                                            </strong>
                                        </div>
                                    </div>
                                    <div className={styles.quotaProgress}>
                                        <span
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        mySpeakingQuota.usagePercentage || 0,
                                                    ),
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                    <div className={styles.resetCountdown}>
                                        <i className="bi bi-arrow-clockwise" />
                                        <span>
                                            {mySpeakingQuota.resetDate ? (
                                                <>
                                                    Reset sau <strong>
                                                        {formatResetRemaining(mySpeakingQuota.resetDate)}
                                                    </strong>
                                                </>
                                            ) : (
                                                'Không có lịch reset tự động'
                                            )}
                                        </span>
                                    </div>
                                </article>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
