import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './ZaloBrowserNotice.module.css';

export default function ZaloBrowserNotice() {
    const location = useLocation();
    const [copiedLink, setCopiedLink] = useState('');
    const [manualLink, setManualLink] = useState('');
    const linkInput = useRef(null);

    // Zalo's browser can restrict microphone access. Detection is best effort.
    if (!/zalo/i.test(navigator.userAgent)) return null;

    const currentLink = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(currentLink);
            setCopiedLink(currentLink);
            setManualLink('');
        } catch {
            setManualLink(currentLink);
            setCopiedLink('');
        }
    };

    return (
        <aside className={styles.notice} aria-label="Hướng dẫn mở trình duyệt">
            <div className={styles.content}>
                <strong>Mở bằng {isIOS ? 'Safari hoặc Chrome' : 'Chrome hoặc trình duyệt trên điện thoại'} để làm bài Speaking</strong>
                <p>Bạn đang mở trang trong Zalo. Để ghi âm và nộp bài ổn định hơn, hãy nhấn menu (⋯) của Zalo và chọn mở bằng trình duyệt bên ngoài nếu có.</p>
                <p>Hoặc sao chép liên kết rồi dán vào {isIOS ? 'Safari hoặc Chrome' : 'Chrome'}. Bạn có thể cần đăng nhập lại.</p>
                <button type="button" onClick={copyLink}>Sao chép liên kết</button>
                <span className={styles.status} role="status">
                    {copiedLink === currentLink ? 'Đã sao chép. Hãy dán liên kết vào trình duyệt.' : ''}
                </span>
                {manualLink === currentLink && (
                    <label className={styles.manual}>
                        Nhấn giữ liên kết bên dưới và chọn Sao chép:
                        <input ref={linkInput} value={currentLink} readOnly
                            aria-label="Liên kết trang hiện tại"
                            onFocus={() => linkInput.current?.select()} />
                    </label>
                )}
            </div>
        </aside>
    );
}
