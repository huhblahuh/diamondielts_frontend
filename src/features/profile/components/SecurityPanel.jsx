import React, { useState } from 'react';
import authService from '../../../api/services/auth.service';
import { showToastError, showToastSuccess } from '../../../utils/toast';
import styles from '../StudentProfile.module.css';

function OtpBox({ recipient, otp, setOtp, busy, onConfirm, onCancel, onResend }) {
    return (
        <div className={styles.otpBox}>
            <div className={styles.otpIconWrap}>
                <i className="bi bi-shield-check" />
            </div>
            <div>
                <strong>Nhập mã xác thực</strong>
                <p>Mã OTP 6 số đã được gửi tới <span>{recipient}</span>.</p>
            </div>
            <input
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
            />
            <div className={styles.inlineActions}>
                <button type="button" className={styles.secondaryButton} onClick={onCancel}>
                    Hủy
                </button>
                <button type="button" className={styles.linkButton} onClick={onResend} disabled={busy}>
                    Gửi lại mã
                </button>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={onConfirm}
                    disabled={busy || otp.length !== 6}
                >
                    {busy ? (
                        <>
                            <i className={`bi bi-arrow-repeat ${styles.spinIcon}`} />
                            <span>Đang xác thực…</span>
                        </>
                    ) : (
                        <>
                            <i className="bi bi-check-lg" />
                            <span>Xác nhận</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function SecurityPanel({ email, isOpen = true, onToggle }) {
    const [tab, setTab] = useState('password');
    const [busy, setBusy] = useState(false);
    const [otp, setOtp] = useState('');
    const [request, setRequest] = useState(null);
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [emailForm, setEmailForm] = useState({ newEmail: '' });
    const [emailStage, setEmailStage] = useState('form');

    // Password visibility toggles
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const fail = (error) => showToastError(error.message || 'Không thể thực hiện yêu cầu.');
    const finishSecurityChange = (message) => {
        showToastSuccess(message);
        authService.logout();
        window.setTimeout(() => window.location.replace('/login'), 1200);
    };
    const resend = async () => {
        if (!request?.requestId) return;
        setBusy(true);
        try { await authService.resendOtp(request.requestId); showToastSuccess('Đã gửi lại mã OTP.'); }
        catch (error) { fail(error); } finally { setBusy(false); }
    };
    const requestPassword = async (event) => {
        event.preventDefault();
        if (passwords.newPassword.length < 8 || passwords.newPassword !== passwords.confirmPassword) {
            showToastError('Mật khẩu mới cần ít nhất 8 ký tự và phần xác nhận phải trùng khớp.'); return;
        }
        setBusy(true);
        try { setRequest(await authService.requestPasswordChange({ currentPassword: passwords.currentPassword })); setOtp(''); }
        catch (error) { fail(error); } finally { setBusy(false); }
    };
    const confirmPassword = async () => {
        setBusy(true);
        try {
            const verified = await authService.verifyOtp({ requestId: request.requestId, otp });
            await authService.confirmPasswordChange({ requestId: request.requestId, actionToken: verified.actionToken, newPassword: passwords.newPassword, confirmPassword: passwords.confirmPassword });
            finishSecurityChange('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
        } catch (error) { fail(error); } finally { setBusy(false); }
    };
    const requestEmailChange = async (event) => {
        event.preventDefault();
        if (!emailForm.newEmail || emailForm.newEmail.toLowerCase() === email?.toLowerCase()) { showToastError('Vui lòng nhập một email mới.'); return; }
        setBusy(true);
        try {
            const next = await authService.requestNewEmailVerification({ newEmail: emailForm.newEmail });
            setRequest(next); setEmailStage('newOtp'); setOtp('');
        } catch (error) { fail(error); } finally { setBusy(false); }
    };
    const confirmEmail = async () => {
        setBusy(true);
        try {
            const verified = await authService.verifyOtp({ requestId: request.requestId, otp });
            await authService.confirmEmailChange({ requestId: request.requestId, actionToken: verified.actionToken });
            finishSecurityChange('Đổi email thành công. Vui lòng đăng nhập lại.');
        } catch (error) { fail(error); } finally { setBusy(false); }
    };
    const resetFlow = () => { setRequest(null); setEmailStage('form'); setOtp(''); };

    // Dynamic animation key based on current tab and step
    const currentStepKey = `${tab}-${request ? 'otp' : emailStage}`;

    return (
        <div className={`${styles.card} ${styles.settingsCard}`}>
            <div
                className={`${styles.cardHeaderToggle} ${isOpen ? styles.cardHeaderOpen : ''}`}
                onClick={onToggle}
                role={onToggle ? "button" : undefined}
                tabIndex={onToggle ? 0 : undefined}
            >
                <div className={styles.cardHeading}>
                    <span className={`${styles.cardIcon} ${styles.purple}`}><i className="bi bi-shield-lock" /></span>
                    <div><h2>Bảo mật tài khoản</h2><p>Mọi thay đổi đều được xác thực qua email</p></div>
                </div>
                {onToggle && <button
                    type="button"
                    className={`${styles.collapseBtn} ${isOpen ? styles.collapseBtnOpen : ''}`}
                    aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                >
                    <i className="bi bi-chevron-down" />
                </button>}
            </div>
            <div className={`${styles.collapseWrapper} ${isOpen ? styles.collapseOpen : styles.collapseClosed}`}>
                <div className={styles.collapseInner}>
                    <div className={styles.tabs}>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${tab === 'password' ? styles.activeTab : ''}`}
                            onClick={() => { setTab('password'); resetFlow(); }}
                        >
                            <i className="bi bi-key" />
                            <span>Đổi mật khẩu</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${tab === 'email' ? styles.activeTab : ''}`}
                            onClick={() => { setTab('email'); resetFlow(); }}
                        >
                            <i className="bi bi-envelope" />
                            <span>Đổi email</span>
                        </button>
                    </div>

                    <div key={currentStepKey} className={styles.tabContentAnimated}>
                        {tab === 'password' && (request ?
                            <OtpBox recipient={email} otp={otp} setOtp={setOtp} busy={busy} onConfirm={confirmPassword} onCancel={resetFlow} onResend={resend} /> :
                            <form className={styles.form} onSubmit={requestPassword}>
                                <label>Mật khẩu hiện tại
                                    <div className={styles.passwordInputWrap}>
                                        <input
                                            type={showCurrent ? "text" : "password"}
                                            required
                                            value={passwords.currentPassword}
                                            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                            placeholder="Nhập mật khẩu hiện tại"
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggleBtn}
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            tabIndex={-1}
                                            aria-label={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <i className={`bi ${showCurrent ? 'bi-eye-slash' : 'bi-eye'}`} />
                                        </button>
                                    </div>
                                </label>
                                <label>Mật khẩu mới
                                    <div className={styles.passwordInputWrap}>
                                        <input
                                            type={showNew ? "text" : "password"}
                                            required
                                            minLength={8}
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                            placeholder="Tối thiểu 8 ký tự"
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggleBtn}
                                            onClick={() => setShowNew(!showNew)}
                                            tabIndex={-1}
                                            aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`} />
                                        </button>
                                    </div>
                                </label>
                                <label>Xác nhận mật khẩu mới
                                    <div className={styles.passwordInputWrap}>
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            required
                                            minLength={8}
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggleBtn}
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            tabIndex={-1}
                                            aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} />
                                        </button>
                                    </div>
                                </label>
                                <button className={styles.primaryButton} disabled={busy}>
                                    {busy ? (
                                        <>
                                            <i className={`bi bi-arrow-repeat ${styles.spinIcon}`} />
                                            <span>Đang gửi OTP…</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Tiếp tục xác thực</span>
                                            <i className="bi bi-arrow-right" />
                                        </>
                                    )}
                                </button>
                            </form>)}

                        {tab === 'email' && (emailStage === 'form' ?
                            <form className={styles.form} onSubmit={requestEmailChange}>
                                <label>Email hiện tại
                                    <input value={email || ''} disabled />
                                </label>
                                <label>Email mới
                                    <input
                                        type="email"
                                        required
                                        value={emailForm.newEmail}
                                        onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                        placeholder="name@example.com"
                                    />
                                </label>
                                <button className={styles.primaryButton} disabled={busy}>
                                    {busy ? (
                                        <>
                                            <i className={`bi bi-arrow-repeat ${styles.spinIcon}`} />
                                            <span>Đang gửi OTP…</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Xác thực email mới</span>
                                            <i className="bi bi-arrow-right" />
                                        </>
                                    )}
                                </button>
                            </form> : <OtpBox recipient={emailForm.newEmail} otp={otp} setOtp={setOtp} busy={busy} onConfirm={confirmEmail} onCancel={resetFlow} onResend={resend} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}
