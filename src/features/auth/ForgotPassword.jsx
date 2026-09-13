import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../api/services/auth.service';
import backgroundImg from '../../assets/backgroundLogin.webp';
import siteLogo from '../../assets/site-logo.webp';
import styles from './Login.module.css';

const STEPS = {
    EMAIL: 1,
    OTP: 2,
    PASSWORD: 3,
    SUCCESS: 4,
};

const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

export default function ForgotPassword({ embedded = false, onBack }) {
    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [requestId, setRequestId] = useState('');
    const [otp, setOtp] = useState('');
    const [actionToken, setActionToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [expiresIn, setExpiresIn] = useState(0);
    const [resendIn, setResendIn] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (step !== STEPS.OTP) return undefined;

        const timer = window.setInterval(() => {
            setExpiresIn((value) => Math.max(0, value - 1));
            setResendIn((value) => Math.max(0, value - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [step]);

    const applyRequestResponse = (data) => {
        setRequestId(data.requestId);
        setExpiresIn(data.expiresInSeconds || 0);
        setResendIn(data.resendAfterSeconds || 0);
        setOtp('');
    };

    const runRequest = async (operation) => {
        setLoading(true);
        setError('');
        try {
            await operation();
        } catch (requestError) {
            setError(requestError.message || 'Không thể thực hiện yêu cầu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = (event) => {
        event.preventDefault();
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setError('Vui lòng nhập email của tài khoản.');
            return;
        }

        runRequest(async () => {
            const data = await authService.requestForgotPassword({ email: normalizedEmail });
            setEmail(normalizedEmail);
            applyRequestResponse(data);
            setStep(STEPS.OTP);
        });
    };

    const handleVerifyOtp = (event) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
            setError('Mã OTP phải gồm đúng 6 chữ số.');
            return;
        }

        runRequest(async () => {
            const data = await authService.verifyOtp({ requestId, otp });
            setActionToken(data.actionToken);
            setStep(STEPS.PASSWORD);
        });
    };

    const handleResendOtp = () => {
        if (loading || resendIn > 0) return;

        runRequest(async () => {
            const data = await authService.resendOtp(requestId);
            applyRequestResponse(data);
        });
    };

    const handleResetPassword = (event) => {
        event.preventDefault();
        if (newPassword.length < 8 || newPassword.length > 128) {
            setError('Mật khẩu mới phải có từ 8 đến 128 ký tự.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        runRequest(async () => {
            await authService.confirmPasswordReset({
                requestId,
                actionToken,
                newPassword,
                confirmPassword,
            });
            setActionToken('');
            setNewPassword('');
            setConfirmPassword('');
            setStep(STEPS.SUCCESS);
        });
    };

    const returnToEmail = () => {
        setStep(STEPS.EMAIL);
        setRequestId('');
        setOtp('');
        setError('');
    };

    const renderStepIndicator = () => (
        <div className={styles.stepIndicator} aria-label={`Bước ${Math.min(step, 3)} trên 3`}>
            {[1, 2, 3].map((item) => (
                <span
                    key={item}
                    className={`${styles.stepDot} ${step >= item ? styles.stepDotActive : ''}`}
                />
            ))}
        </div>
    );

    const content = (
        <>
                <div className={styles.loginHeader}>
                    <img src={siteLogo} alt="Diamond Ielts" className={styles.brandLogo} />
                    <h1>{step === STEPS.SUCCESS ? 'Đặt lại thành công' : 'Quên mật khẩu'}</h1>
                </div>

                {step !== STEPS.SUCCESS && renderStepIndicator()}
                {error && <div className={styles.errorText} role="alert">{error}</div>}

                {step === STEPS.EMAIL && (
                    <form onSubmit={handleRequestOtp}>
                        <p className={styles.helperText}>
                            Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu.
                        </p>
                        <div className={styles.formGroup}>
                            <label htmlFor="forgot-email" className={styles.label}>Email</label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconBox}><i className="bi bi-envelope" /></div>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    className={styles.input}
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="Nhập email của bạn"
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.btnLogin} disabled={loading}>
                                {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
                            </button>
                            {onBack ? (
                                <button type="button" className={styles.linkButton} onClick={onBack}>
                                    Quay lại đăng nhập
                                </button>
                            ) : (
                                <Link to="/login" className={styles.textLink}>Quay lại đăng nhập</Link>
                            )}
                        </div>
                    </form>
                )}

                {step === STEPS.OTP && (
                    <form onSubmit={handleVerifyOtp}>
                        <p className={styles.helperText}>
                            Nếu tài khoản tồn tại, mã 6 chữ số đã được gửi đến <strong>{email}</strong>.
                        </p>
                        <div className={styles.formGroup}>
                            <label htmlFor="forgot-otp" className={styles.label}>Mã OTP</label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconBox}><i className="bi bi-shield-lock" /></div>
                                <input
                                    id="forgot-otp"
                                    className={`${styles.input} ${styles.otpInput}`}
                                    value={otp}
                                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="000000"
                                    disabled={loading || expiresIn === 0}
                                />
                            </div>
                        </div>
                        <p className={styles.statusText}>
                            {expiresIn > 0 ? `Mã hết hạn sau ${formatTime(expiresIn)}` : 'Mã đã hết hạn. Vui lòng gửi lại mã.'}
                        </p>
                        <div className={styles.formActions}>
                            <button
                                type="submit"
                                className={styles.btnLogin}
                                disabled={loading || expiresIn === 0}
                            >
                                {loading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
                            </button>
                            <button
                                type="button"
                                className={styles.linkButton}
                                onClick={handleResendOtp}
                                disabled={loading || resendIn > 0}
                            >
                                {resendIn > 0 ? `Gửi lại mã sau ${resendIn}s` : 'Gửi lại mã'}
                            </button>
                            <button type="button" className={styles.linkButton} onClick={returnToEmail}>
                                Dùng email khác
                            </button>
                        </div>
                    </form>
                )}

                {step === STEPS.PASSWORD && (
                    <form onSubmit={handleResetPassword}>
                        <p className={styles.helperText}>Tạo mật khẩu mới có ít nhất 8 ký tự.</p>
                        <div className={styles.formGroup}>
                            <label htmlFor="new-password" className={styles.label}>Mật khẩu mới</label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconBox}><i className="bi bi-lock" /></div>
                                <input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={styles.eyeButton}
                                    onClick={() => setShowPassword((value) => !value)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="confirm-password" className={styles.label}>Xác nhận mật khẩu</label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconBox}><i className="bi bi-lock-fill" /></div>
                                <input
                                    id="confirm-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <button type="submit" className={styles.btnLogin} disabled={loading}>
                            {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                        </button>
                    </form>
                )}

                {step === STEPS.SUCCESS && (
                    <div>
                        <div className={styles.successIcon}><i className="bi bi-check-lg" /></div>
                        <p className={styles.helperText}>
                            Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
                        </p>
                        {onBack ? (
                            <button type="button" className={styles.btnLogin} onClick={onBack}>
                                Đăng nhập ngay
                            </button>
                        ) : (
                            <Link to="/login" className={styles.btnLogin}>Đăng nhập ngay</Link>
                        )}
                    </div>
                )}
        </>
    );

    if (embedded) return content;

    return (
        <div className={styles.loginContainer} style={{ backgroundImage: `url(${backgroundImg})` }}>
            <div className={`${styles.loginCard} ${styles.forgotCard}`}>
                {content}
            </div>
        </div>
    );
}
