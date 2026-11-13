import { reportHandledError, setReportUser } from '../../utils/errorReporting.js';
import React, { useRef, useState } from 'react';
import styles from './Login.module.css';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import userQuotaService from '../../api/services/userQuota.service';
import ForgotPassword from './ForgotPassword';

export function getLoginErrorMessage(status, code) {
    if (status === 401 && code === 'INVALID_CREDENTIALS') {
        return 'Email, tên tài khoản hoặc mật khẩu không chính xác.';
    }
    if (status === 401) {
        return 'Không thể xác thực đăng nhập. Vui lòng thử lại sau.';
    }
    if (status === 400) {
        return 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra và thử lại.';
    }
    if (status === 403) {
        return 'Tài khoản của bạn không có quyền đăng nhập.';
    }
    if (status === 429) {
        return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
    }
    if (status >= 500) {
        return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }
    if (status == null) {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
    }
    return 'Không thể đăng nhập. Vui lòng thử lại sau.';
}

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const submitting = useRef(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(previous => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting.current) return;
        const fields = new FormData(e.currentTarget);
        const credentials = { email: String(fields.get('email') || '').trim(), password: String(fields.get('password') || '') };
        if (!credentials.email || !credentials.password) {
            Swal.fire('Chú ý', 'Vui lòng điền đầy đủ email và mật khẩu!', 'warning');
            return;
        }

        submitting.current = true;
        setLoading(true);
        const requestId = crypto.randomUUID().replaceAll('-', '');
        let loginSucceeded = false;
        try {
            const data = await axiosClient.post('/auth/login', credentials, {
                skipAuth: true,
                timeout: 30000,
                headers: { 'X-Request-ID': requestId, 'X-Client-Version': __APP_BUILD_ID__ },
            });
            if (!data.success || !data.token) throw { status: 502, requestId };
            
            if (data.success) {
                // Persist the token first so the authenticated quota request
                // can identify the current student from JWT.
                localStorage.setItem('token', data.token);
                setReportUser(data.userId);
                let speakingQuota = null;
                if (data.role === 'Student') {
                    try {
                        speakingQuota =
                            await userQuotaService.getMySpeakingQuota();
                    } catch (caughtError) {
                        reportHandledError(caughtError, "features/auth/Login.jsx:70");
                        // Login remains successful; Layout will retry loading.
                    }
                }
                localStorage.setItem('user', JSON.stringify({
                    userId: data.userId,
                    fullName: data.fullName,
                    username: data.username,
                    avatarUrl: data.avatarUrl,
                    role: data.role,
                    speakingQuota,
                }));

                loginSucceeded = true;
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: 'Đăng nhập hệ thống thành công.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Chuyển hướng động dựa trên Role
                    if (data.role === 'Admin') {
                        window.location.href = '/admin/dashboard';
                    } else if (data.role === 'Teacher') {
                        window.location.href = '/teacher/dashboard';
                    } else {
                        window.location.href = '/student/dashboard';
                    }
                });
            }
        } catch (error) {
            reportHandledError(error, "features/auth/Login.jsx:101");
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đăng nhập',
                text: `${getLoginErrorMessage(error.status, error.code)} Mã tra cứu: ${error.requestId || requestId}`
            });
        } finally {
            if (!loginSucceeded) {
                submitting.current = false;
                setLoading(false);
            }
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                {showForgotPassword && (
                    <ForgotPassword
                        embedded
                        onBack={() => setShowForgotPassword(false)}
                    />
                )}
                <div hidden={showForgotPassword}>
                        <div className={styles.loginHeader}>
                            <h1>Đăng nhập</h1>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email hoặc Tài khoản</label>
                                <div className={styles.inputWrapper}>
                                    <div className={styles.iconBox}>
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                    <input
                                        type="text"
                                        name="email"
                                        autoComplete="username"
                                        className={styles.input}
                                        placeholder="Email hoặc Username..."
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Mật khẩu</label>
                                <div className={styles.inputWrapper}>
                                    <div className={styles.iconBox}>
                                        <i className="bi bi-lock"></i>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        autoComplete="current-password"
                                        className={styles.input}
                                        placeholder="Nhập mật khẩu"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className={styles.eyeButton}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                                    </button>
                                </div>
                                <div className={styles.forgotPasswordRow}>
                                    <button
                                        type="button"
                                        className={styles.linkButton}
                                        onClick={() => setShowForgotPassword(true)}
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className={styles.btnLogin} disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-box-arrow-in-right"></i>
                                        Đăng nhập
                                    </>
                                )}
                            </button>
                        </form>
                </div>

            </div>
        </div>
    );
}
