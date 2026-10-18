import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../StudentProfile.module.css';

const VIEWPORT = 320;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export default function AvatarCropper({ file, busy, onCancel, onConfirm }) {
    const imageRef = useRef(null);
    const dragRef = useRef(null);
    const [dimensions, setDimensions] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [sourceUrl, setSourceUrl] = useState('');

    useEffect(() => {
        if (!file) {
            setSourceUrl('');
            return;
        }

        const url = URL.createObjectURL(file);
        setSourceUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const baseScale = dimensions
        ? Math.max(VIEWPORT / dimensions.width, VIEWPORT / dimensions.height)
        : 1;
    const renderedWidth = dimensions?.width * baseScale * zoom || VIEWPORT;
    const renderedHeight = dimensions?.height * baseScale * zoom || VIEWPORT;
    const maxX = Math.max(0, (renderedWidth - VIEWPORT) / 2);
    const maxY = Math.max(0, (renderedHeight - VIEWPORT) / 2);

    useEffect(() => {
        setOffset((current) => ({
            x: clamp(current.x, -maxX, maxX),
            y: clamp(current.y, -maxY, maxY)
        }));
    }, [maxX, maxY]);

    const pointerDown = (event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            x: offset.x,
            y: offset.y
        };
    };

    const pointerMove = (event) => {
        if (!dragRef.current) return;
        setOffset({
            x: clamp(dragRef.current.x + event.clientX - dragRef.current.clientX, -maxX, maxX),
            y: clamp(dragRef.current.y + event.clientY - dragRef.current.clientY, -maxY, maxY)
        });
    };

    const createCrop = async () => {
        const image = imageRef.current;
        if (!image || !dimensions) return;

        const scale = baseScale * zoom;
        const sourceSize = VIEWPORT / scale;
        const sourceX = dimensions.width / 2 - (VIEWPORT / 2 + offset.x) / scale;
        const sourceY = dimensions.height / 2 - (VIEWPORT / 2 + offset.y) / scale;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);
        let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
        if (!blob) {
            blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        }
        if (blob) {
            const fileName = blob.type === 'image/jpeg' ? 'avatar.jpg' : 'avatar.webp';
            onConfirm(new File([blob], fileName, { type: blob.type || 'image/webp' }));
        }
    };

    return createPortal(
        <div className={styles.cropBackdrop} role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
            <section className={styles.cropDialog}>
                <div className={styles.cropHeader}>
                    <div><h3 id="avatar-crop-title">Căn chỉnh ảnh đại diện</h3><p>Kéo ảnh để chọn vùng hiển thị.</p></div>
                    <button type="button" onClick={onCancel} aria-label="Đóng" disabled={busy}><i className="bi bi-x-lg" /></button>
                </div>
                <div className={styles.cropViewport} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
                    {sourceUrl && (
                        <img
                            ref={imageRef}
                            src={sourceUrl}
                            alt="Ảnh đang căn chỉnh"
                            draggable="false"
                            onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            style={{ width: renderedWidth, height: renderedHeight, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
                        />
                    )}
                    <div className={styles.cropMask} />
                </div>
                <label className={styles.zoomControl}>
                    <i className="bi bi-image" />
                    <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
                    <i className="bi bi-image-fill" />
                </label>
                <div className={styles.cropActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Hủy</button>
                    <button type="button" className={styles.primaryButton} onClick={createCrop} disabled={busy || !dimensions}>{busy ? 'Đang tải lên…' : 'Dùng ảnh này'}</button>
                </div>
            </section>
        </div>,
        document.body
    );
}
