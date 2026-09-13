import React, { useEffect, useRef, useState } from 'react';
import { showToastError, showToastSuccess } from '../../../utils/toast';
import authService from '../../../api/services/auth.service';
import profileService from '../../../api/services/profile.service';
import AvatarCropper from './AvatarCropper';
import styles from '../StudentProfile.module.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function PersonalInfoCard({ profile, onUpdated }) {
    const fileInputRef = useRef(null);
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [username, setUsername] = useState(profile?.username || '');
    const [saving, setSaving] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [cropFile, setCropFile] = useState(null);
    const [avatarFailed, setAvatarFailed] = useState(false);

    useEffect(() => setFullName(profile?.fullName || ''), [profile?.fullName]);
    useEffect(() => setUsername(profile?.username || ''), [profile?.username]);
    useEffect(() => setAvatarFailed(false), [profile?.avatarUrl]);

    const notifyUpdated = (updated) => {
        authService.updateCurrentUser({
            fullName: updated.fullName,
            username: updated.username,
            avatarUrl: updated.avatarUrl
        });
        onUpdated(updated);
    };

    const submit = async (event) => {
        event.preventDefault();
        const normalizedName = fullName.trim().replace(/\s+/g, ' ');
        const normalizedUsername = username.trim().normalize('NFC');
        if (normalizedName.length < 2) {
            showToastError('Họ tên phải có ít nhất 2 ký tự.');
            return;
        }
        if (!normalizedUsername || normalizedUsername.length > 50 || !/^[\p{L}\p{M}\p{N}\x21-\x7E]+$/u.test(normalizedUsername)) {
            showToastError('Username phải có 1–50 ký tự, không có khoảng trắng hoặc emoji.');
            return;
        }

        const usernameChanged = normalizedUsername !== profile?.username;
        setSaving(true);
        try {
            const updated = await profileService.updateProfile({ fullName: normalizedName, username: normalizedUsername });
            if (usernameChanged) {
                showToastSuccess('Đã đổi username. Vui lòng đăng nhập lại.');
                authService.logout();
                window.setTimeout(() => window.location.replace('/login'), 900);
                return;
            }
            notifyUpdated(updated);
            showToastSuccess('Đã cập nhật tài khoản.');
        } catch (error) {
            showToastError(error.message);
        } finally {
            setSaving(false);
        }
    };

    const chooseAvatar = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!ACCEPTED_TYPES.includes(file.type)) {
            showToastError('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            showToastError('Ảnh đại diện không được vượt quá 5 MB.');
            return;
        }
        setCropFile(file);
    };

    const uploadAvatar = async (file) => {
        setAvatarBusy(true);
        try {
            const updated = await profileService.uploadAvatar(file);
            notifyUpdated(updated);
            setCropFile(null);
            showToastSuccess('Đã cập nhật ảnh đại diện.');
        } catch (error) {
            showToastError(error.message);
        } finally {
            setAvatarBusy(false);
        }
    };

    const deleteAvatar = async () => {
        setAvatarBusy(true);
        try {
            const updated = await profileService.deleteAvatar();
            notifyUpdated(updated);
            showToastSuccess('Đã xóa ảnh đại diện.');
        } catch (error) {
            showToastError(error.message);
        } finally {
            setAvatarBusy(false);
        }
    };

    const initial = profile?.fullName?.trim().split(' ').slice(-1)[0]?.[0]?.toUpperCase() || 'U';
    const unchanged = fullName.trim().replace(/\s+/g, ' ') === profile?.fullName
        && username.trim().normalize('NFC') === profile?.username;

    return (
        <div className={`${styles.card} ${styles.settingsCard}`}>
            <div className={styles.cardHeading}>
                <span className={`${styles.cardIcon} ${styles.blue}`}><i className="bi bi-person" /></span>
                <div><h2>Tài khoản</h2><p>Cập nhật thông tin đăng nhập và ảnh đại diện</p></div>
            </div>
            <div className={styles.accountAvatarRow}>
                <div className={styles.accountAvatar}>
                    {profile?.avatarUrl && !avatarFailed
                        ? <img src={profile.avatarUrl} alt={`Avatar của ${profile.fullName}`} onError={() => setAvatarFailed(true)} />
                        : <span>{initial}</span>}
                </div>
                <div className={styles.avatarActions}>
                    <strong>Ảnh đại diện</strong>
                    <p>JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được lưu ở kích thước 512×512.</p>
                    <div className={styles.avatarActionBtns}>
                        <button type="button" className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()} disabled={avatarBusy}><i className="bi bi-upload" /> Chọn ảnh</button>
                        {profile?.avatarUrl && <button type="button" className={styles.dangerButton} onClick={deleteAvatar} disabled={avatarBusy}><i className="bi bi-trash3" /> Xóa ảnh</button>}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={chooseAvatar} />
                </div>
            </div>
            <form onSubmit={submit} className={styles.form}>
                <label>Họ và tên<input value={fullName} maxLength={100} onChange={(event) => setFullName(event.target.value)} /></label>
                <label>Username
                    <input value={username} maxLength={50} onChange={(event) => setUsername(event.target.value)} />
                    <small>Tối đa 50 ký tự, không có khoảng trắng hoặc emoji. Đổi username sẽ đăng xuất mọi thiết bị.</small>
                </label>
                <label>Email đăng nhập
                    <input value={profile?.email || ''} disabled />
                    <small>Email được đổi tại mục Security để xác thực chủ tài khoản.</small>
                </label>
                <button className={styles.primaryButton} disabled={saving || unchanged}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </form>
            {cropFile && <AvatarCropper file={cropFile} busy={avatarBusy} onCancel={() => setCropFile(null)} onConfirm={uploadAvatar} />}
        </div>
    );
}
