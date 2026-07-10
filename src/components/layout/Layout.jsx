import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import siteLogo from '../../assets/site-logo.webp';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'Student';

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

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

    const baseLinks = (role === 'Teacher' || role === 'Admin') ? teacherLinks : studentLinks;
    const links = [...baseLinks];
    if (role === 'Admin') {
        links.push({ path: "/teacher/users", label: "Quản Lý Người Dùng", icon: "bi-person-gear" });
    }

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
                            (link.path === '/teacher/dashboard' && location.pathname === '/teacher');
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
                    <div className={styles.userAvatar}>{userInitial}</div>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{user.fullName || 'User'}</p>
                        <small>{role === 'Teacher' ? 'GV. ' : (role === 'Admin' ? 'AD. ' : 'HV. ')}{role}</small>
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
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
