import React, { useState } from 'react';
import styles from './Login.module.css';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import backgroundImg from '../../assets/backgroundLogin.webp';
import siteLogo from '../../assets/site-logo.webp';

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            Swal.fire('Chú ý', 'Vui lòng điền đầy đủ email và mật khẩu!', 'warning');
            return;
        }

        setLoading(true);
        try {
            // Call our new robust C# API endpoint directly
            const data = await axiosClient.post('/auth/login', formData);
            
            if (data.success) {
                // Persist simple credentials
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({
                    userId: data.userId,
                    fullName: data.fullName,
                    role: data.role
                }));

                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: 'Đăng nhập hệ thống thành công.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Chuyển hướng động dựa trên Role
                    if (data.role === 'Teacher' || data.role === 'Admin') {
                        window.location.href = '/teacher/dashboard';
                    } else {
                        window.location.href = '/student/dashboard';
                    }
                });
            }
        } catch (error) {
            console.error("Login Error: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đăng nhập',
                text: error.message || 'Đã xảy ra lỗi không mong muốn.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer} style={{ backgroundImage: `url(${backgroundImg})` }}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <img src={siteLogo} alt="Diamond Ielts" className={styles.brandLogo} />
                    <h1>Diamond Ielts</h1>
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
                    </div>

                    <div className={styles.forgotActions}>
                        <a href="#forgot" className={styles.link}>
                            <i className="bi bi-key me-1"></i>Quên mật khẩu?
                        </a>
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

                <div className={styles.divider}>
                    <span>HOẶC</span>
                </div>

                <button className={styles.btnGoogle} type="button">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Tiếp tục với Google
                </button>
            </div>
        </div>
    );
}
