import React, { useState } from 'react';
import Swal from 'sweetalert2';
import assignmentService from '../api/services/assignment.service';

export default function CommonAttachmentUploader({
    files = [],
    onChange,
    maxSizeMB = 30,
    maxFileCount = 5,
    maxTotalSizeMB = 50,
    allowedTypes = ['.pdf', '.doc', '.docx', '.zip', '.rar'],
    label = 'Tài liệu đính kèm mẫu',
    subLabel = 'Chấp nhận các định dạng file: .pdf, .doc, .docx, .zip, .rar (Tối đa 30MB/file)',
    buttonText = 'Chọn File Đính Kèm',
    disabled = false
}) {
    const [isUploading, setIsUploading] = useState(false);
    const uniqueInputId = React.useId();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Kiểm tra số lượng file tối đa
        if (files.length >= maxFileCount) {
            Swal.fire({
                icon: 'error',
                title: 'Giới hạn số lượng file',
                text: `Bạn chỉ được phép tải lên tối đa ${maxFileCount} file.`,
                confirmButtonColor: '#ef4444'
            });
            e.target.value = '';
            return;
        }

        // 2. Kiểm tra tổng dung lượng lũy kế của tất cả file đính kèm
        const currentTotalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
        const newTotalSize = currentTotalSize + file.size;
        const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;
        if (newTotalSize > maxTotalSizeBytes) {
            Swal.fire({
                icon: 'error',
                title: 'Vượt quá tổng dung lượng',
                text: `Tổng dung lượng các file đính kèm không được vượt quá ${maxTotalSizeMB}MB (Hiện tại đã dùng: ${(currentTotalSize / (1024 * 1024)).toFixed(2)}MB).`,
                confirmButtonColor: '#ef4444'
            });
            e.target.value = '';
            return;
        }

        // 3. Kiểm tra giới hạn của 1 file đơn lẻ
        const maxByteSize = maxSizeMB * 1024 * 1024;
        if (file.size > maxByteSize) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi dung lượng',
                text: `Dung lượng file vượt quá giới hạn cho phép (Tối đa ${maxSizeMB}MB/file).`,
                confirmButtonColor: '#ef4444'
            });
            e.target.value = '';
            return;
        }

        // 4. Kiểm tra phần mở rộng file hợp lệ
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(extension)) {
            Swal.fire({
                icon: 'error',
                title: 'Định dạng không hỗ trợ',
                text: `Chỉ chấp nhận các định dạng file: ${allowedTypes.join(', ')}`,
                confirmButtonColor: '#ef4444'
            });
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const userStr = localStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const currentRole = currentUser?.role || 'Teacher';

            const res = await assignmentService.uploadMaterial(file, currentRole);
            const newPayload = {
                dataType: res.dataType || extension.substring(1).toUpperCase(),
                dataValue: res.dataValue,
                fileName: res.fileName || file.name,
                fileSize: file.size // Lưu dung lượng file cục bộ để cộng dồn
            };
            onChange([...files, newPayload]);
            Swal.fire({
                icon: 'success',
                title: 'Tải lên thành công',
                timer: 1000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Thất bại',
                text: 'Không thể tải file lên. Vui lòng thử lại.',
                confirmButtonColor: '#3b82f6'
            });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveFile = async (index) => {
        const fileToRemove = files[index];
        if (fileToRemove && fileToRemove.dataValue) {
            try {
                await assignmentService.deleteMaterial(fileToRemove.dataValue);
            } catch (err) {
                console.error("Failed to delete physical file from cloud:", err);
            }
        }
        const updated = files.filter((_, idx) => idx !== index);
        onChange(updated);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
            {label && <label style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>{label}</label>}
            {subLabel && <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>{subLabel}</p>}
            
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                <label 
                    htmlFor={uniqueInputId}
                    style={{
                        cursor: disabled || isUploading ? 'not-allowed' : 'pointer', 
                        margin: 0, 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.4rem 0.85rem', 
                        fontSize: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        opacity: disabled || isUploading ? 0.6 : 1
                    }}
                >
                    <i className="bi bi-paperclip" style={{ fontSize: '0.9rem' }}></i> {isUploading ? 'Đang tải...' : buttonText}
                </label>
                
                {!disabled && !isUploading && (
                    <input 
                        id={uniqueInputId}
                        type="file" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                        accept={allowedTypes.join(',')} 
                    />
                )}

                {isUploading && (
                    <div style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '0.85rem', height: '0.85rem' }}></span>
                        Đang đẩy file lên Cloud...
                    </div>
                )}
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem' }}>Đã tải lên:</div>
                    <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {files.map((fl, idx) => (
                            <li key={idx} style={{ fontSize: '0.75rem', color: '#334155', listStyleType: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                                        <i className="bi bi-file-earmark-text" style={{ color: '#6366f1', fontSize: '0.85rem' }}></i>
                                        <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{fl.fileName}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#475569', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                            {fl.dataType}
                                        </span>
                                    </span>
                                    {!disabled && (
                                        <button 
                                            type="button" 
                                            onChange={null} // placeholder
                                            onClick={() => handleRemoveFile(idx)} 
                                            style={{
                                                background: 'none', 
                                                border: 'none', 
                                                color: '#ef4444', 
                                                cursor: 'pointer', 
                                                padding: 0,
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.2rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            <i className="bi bi-trash"></i> Xóa
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
