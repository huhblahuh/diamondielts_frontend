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
    );
}
