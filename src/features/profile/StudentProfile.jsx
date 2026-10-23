import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import profileService from '../../api/services/profile.service';
import authService from '../../api/services/auth.service';
import { showToastError } from '../../utils/toast';
import PersonalInfoCard from './components/PersonalInfoCard';
import SecurityPanel from './components/SecurityPanel';
import NotificationSettingsCard from './components/NotificationSettingsCard';
import PageSkeleton from '../../components/common/PageSkeleton';
import styles from './StudentProfile.module.css';

export default function StudentProfile() {
    const location = useLocation();
    const outletContext = useOutletContext();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatarFailed, setAvatarFailed] = useState(false);

    const roleSegment = location.pathname.split('/').filter(Boolean)[0] || 'student';
    const section = location.pathname.split('/').filter(Boolean).at(-1);
    const settingsBase = `/${roleSegment}/settings`;
    const isRootMenu = section === 'settings';

    useEffect(() => {
        let active = true;
        setLoading(true);
        profileService.getProfile()
            .then((result) => {
                if (!active) return;
                setProfile(result);
                authService.updateCurrentUser({
                    fullName: result.fullName,
                    username: result.username,
                    avatarUrl: result.avatarUrl
                });
            })
            .catch((error) => showToastError(error.message || 'Không thể tải cài đặt tài khoản.'))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => setAvatarFailed(false), [profile?.avatarUrl]);

    const navigation = useMemo(() => {
        const items = [
            {
                key: 'account',
                label: 'Tài khoản',
                description: 'Tên hiển thị, username & avatar',
                icon: 'bi-person-circle',
                colorClass: styles.navIconAccount
            },
            {
                key: 'security',
                label: 'Bảo mật',
                description: 'Đổi mật khẩu & email xác thực',
                icon: 'bi-shield-lock',
                colorClass: styles.navIconSecurity
            }
        ];
        if (profile?.role === 'Student') {
            items.push({
                key: 'notification',
                label: 'Thông báo',
                description: 'Nhắc nhở bài tập đến hạn',
                icon: 'bi-bell',
                colorClass: styles.navIconNotification
            });
        }
        return items;
    }, [profile?.role]);

    const handleLogout = () => {
        Swal.fire({
            title: 'Đăng xuất tài khoản?',
            text: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Đăng xuất',
            cancelButtonText: 'Ở lại',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                authService.logout();
                window.location.replace('/login');
            }
        });
    };

    if (loading) {
        return <PageSkeleton variant="settings" />;
    }
    if (!profile) {
        return (
            <div className={styles.loading}>
                <i className="bi bi-exclamation-circle" />
                <span>Không thể tải thông tin tài khoản. Vui lòng thử lại.</span>
            </div>
        );
    }

    const activeSection = isRootMenu ? 'account' : section;
    const activeItem = navigation.find((item) => item.key === activeSection) || navigation[0];
    const initial = profile.fullName?.trim().split(' ').slice(-1)[0]?.[0]?.toUpperCase() || 'U';

    const roleDisplayName = profile.role === 'Student'
        ? 'Học viên'
        : profile.role === 'Teacher'
            ? 'Giáo viên'
            : 'Quản trị viên';

    return (
        <div className={styles.settingsPage}>
            <div className={`${styles.settingsShell} ${isRootMenu ? styles.isRootMenu : styles.hasSubSection}`}>
                {/* ── Left Sidebar (Desktop) / Main Menu (Mobile Root) ── */}
                <aside className={styles.settingsSidebar} aria-label="Settings navigation">
                    {/* User Identity Hero */}
                    <div className={styles.settingsIdentity}>
                        <div className={styles.settingsAvatarWrap}>
                            <div className={styles.settingsMiniAvatar}>
                                {profile.avatarUrl && !avatarFailed ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt={profile.fullName}
                                        onError={() => setAvatarFailed(true)}
                                    />
                                ) : (
                                    <span>{initial}</span>
                                )}
                            </div>
                            <span className={styles.onlineBadge} title="Tài khoản hoạt động" />
                        </div>
                        <div className={styles.settingsIdentityInfo}>
                            <div className={styles.settingsNameRow}>
                                <strong>{profile.fullName}</strong>
                                <span className={styles.settingsRoleBadge}>{roleDisplayName}</span>
                            </div>
                            <small className={styles.settingsEmail}>
                                <i className="bi bi-envelope" />
                                <span>{profile.email}</span>
                            </small>
                            {profile.username && (
                                <small className={styles.settingsUsername}>
                                    @{profile.username}
                                </small>
                            )}
                        </div>
                    </div>

                    {/* Navigation Group */}
                    <div className={styles.settingsNavSection}>
                        <span className={styles.settingsNavHeading}>Cài đặt tài khoản</span>
                        <nav className={styles.settingsNavList}>
                            {navigation.map((item) => (
                                <NavLink
                                    key={item.key}
                                    to={`${settingsBase}/${item.key}`}
                                    className={({ isActive }) =>
                                        `${styles.settingsNavItem} ${isActive ? styles.settingsNavItemActive : ''}`
                                    }
                                >
                                    <div className={`${styles.navIconBox} ${item.colorClass}`}>
                                        <i className={`bi ${item.icon}`} />
                                    </div>
                                    <div className={styles.navItemText}>
                                        <strong>{item.label}</strong>
                                        <small>{item.description}</small>
                                    </div>
                                    <i className={`bi bi-chevron-right ${styles.navChevron}`} />
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Sidebar Footer with Logout & Version */}
                    <div className={styles.sidebarFooter}>
                        <button
                            type="button"
                            className={styles.logoutButton}
                            onClick={handleLogout}
                            title="Đăng xuất khỏi thiết bị này"
                        >
                            <i className="bi bi-box-arrow-right" />
                            <span>Đăng xuất tài khoản</span>
                        </button>
                        <span className={styles.appVersion}>Diamonds IELTS • Phiên bản 1.0</span>
                    </div>
                </aside>

                {/* ── Right Content Pane (Desktop) / Sub-Page View (Mobile) ── */}
                <section className={styles.settingsContent} aria-labelledby="settings-section-title">
                    {!isRootMenu && (
                        <div className={styles.mobileBackRow}>
                            <Link to={settingsBase} className={styles.mobileBackBtn}>
                                <i className="bi bi-chevron-left" />
                                <span>Cài đặt</span>
                            </Link>
                            <span className={styles.mobileCurrentSectionBadge}>
                                <i className={`bi ${activeItem.icon}`} />
                                <span>{activeItem.label}</span>
                            </span>
                        </div>
                    )}

                    <div className={styles.contentHeading}>
                        <h2 id="settings-section-title">{activeItem.label}</h2>
                        <p>{activeItem.description}</p>
                    </div>

                    {activeSection === 'account' && (
                        <PersonalInfoCard profile={profile} onUpdated={setProfile} />
                    )}

                    {activeSection === 'security' && (
                        <SecurityPanel email={profile.email} />
                    )}

                    {activeSection === 'notification' && profile.role === 'Student' && (
                        <NotificationSettingsCard
                            pushStatus={outletContext?.pushStatus}
                            onStatusChange={outletContext?.setPushStatus}
                        />
                    )}
                </section>
            </div>
        </div>
    );
}
