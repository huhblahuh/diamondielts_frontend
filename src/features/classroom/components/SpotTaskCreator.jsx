import React, { useState } from 'react';
import Swal from 'sweetalert2';
import CommonAttachmentUploader from '../../../components/CommonAttachmentUploader';
import { makeSpeakingContent } from '../../../utils/speakingContent';

const SpotTaskCreator = React.forwardRef(({ show, onClose, onAddTask, onDirtyChange, styles }, ref) => {
    const [inlineSkillType, setInlineSkillType] = useState('SPEAKING');
    const [inlinePart, setInlinePart] = useState('Part 1');
    const [inlinePrompt, setInlinePrompt] = useState('');
    const [inlineSuggestions, setInlineSuggestions] = useState([]);
    const [inlineUploadPayloads, setInlineUploadPayloads] = useState([]);
    const [inlineMaxAttempts, setInlineMaxAttempts] = useState(3);


    React.useImperativeHandle(ref, () => ({
        getNewItem: () => {
            if (!inlinePrompt.trim()) {
                return null;
            }

            let newItem = null;
            const localId = Date.now() + Math.random();

            if (inlineSkillType === 'SPEAKING') {
                newItem = {
                    id: localId,
                    exerciseId: null,
                    itemType: 'SPEAKING',
                    type: inlinePart,
                    content: makeSpeakingContent(inlinePrompt, inlineSuggestions, inlinePart),
                    maxAttempts: inlineMaxAttempts,
                    _displayLabel: `[Speaking] ${inlinePart} - ${inlinePrompt.substring(0, 30)}...${inlineMaxAttempts ? ` (Tối đa ${inlineMaxAttempts} lần)` : ''}`
                };
            } else if (inlineSkillType === 'fileSubmission') {
                newItem = {
                    id: localId,
                    exerciseId: null,
                    itemType: 'fileSubmission',
                    type: '',
                    content: { description: inlinePrompt },
                    payloads: inlineUploadPayloads,
                    _displayLabel: `[Nộp File] ${inlinePrompt.substring(0, 30)}... (${inlineUploadPayloads.length} files)`
                };
            }
            return newItem;
        },
        reset: () => {
            setInlinePrompt('');
            setInlineSuggestions([]);
            setInlinePart('Part 1');
            setInlineUploadPayloads([]);
            setInlineMaxAttempts(3);
        }
    }));

    React.useEffect(() => {
        if (!show) {
            onDirtyChange?.(false);
            return;
        }
        const isDirty = inlinePrompt.trim().length > 0 || inlineUploadPayloads.length > 0;
        onDirtyChange?.(isDirty);
    }, [inlinePrompt, inlineUploadPayloads, show, onDirtyChange]);

    if (!show) return null;

    const handleAddTask = () => {
        if (!inlinePrompt.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Chú ý',
                text: 'Vui lòng nhập nội dung yêu cầu đề bài!',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        let newItem = null;
        const localId = Date.now() + Math.random();

        if (inlineSkillType === 'SPEAKING') {
            newItem = {
                id: localId,
                exerciseId: null,
                itemType: 'SPEAKING',
                type: inlinePart,
                content: makeSpeakingContent(inlinePrompt, inlineSuggestions, inlinePart),
                maxAttempts: inlineMaxAttempts,
                _displayLabel: `[Speaking] ${inlinePart} - ${inlinePrompt.substring(0, 30)}...${inlineMaxAttempts ? ` (Tối đa ${inlineMaxAttempts} lần)` : ''}`
            };
        } else if (inlineSkillType === 'fileSubmission') {
            newItem = {
                id: localId,
                exerciseId: null,
                itemType: 'fileSubmission',
                type: '',
                content: { description: inlinePrompt },
                payloads: inlineUploadPayloads,
                _displayLabel: `[Nộp File] ${inlinePrompt.substring(0, 30)}... (${inlineUploadPayloads.length} files)`
            };
        }

        onAddTask(newItem);

        // Reset state
        setInlinePrompt('');
        setInlineSuggestions([]);
        setInlinePart('Part 1');
        setInlineUploadPayloads([]);
        setInlineMaxAttempts(3);
        onClose();
    };

    return (
        <div className={styles.inlineCreator}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="fa-solid fa-microphone"></i> THIẾT KẾ BÀI TẬP TẠI CHỖ</span>
                <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.15rem' }}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className={styles.folderRow}>
                <div className={styles.folderGroup}>
                    <label className={styles.folderLabel}>Dạng Bài Tập (Kỹ Năng)</label>
                    <select
                        className={styles.folderInput}
                        value={inlineSkillType}
                        onChange={e => {
                            setInlineSkillType(e.target.value);
                            setInlinePrompt('');
                            setInlineUploadPayloads([]);
                        }}
                    >
                        <option value="SPEAKING">Speaking</option>
                        <option value="fileSubmission">Nộp file kèm theo</option>
                    </select>
                </div>

                {/* Sub-config dynamic fields */}
                {inlineSkillType === 'SPEAKING' && (
                    <>
                        <div className={styles.folderGroup}>
                            <label className={styles.folderLabel}>Phần Thi / Part</label>
                            <select 
                                className={styles.folderInput} 
                                value={inlinePart} 
                                onChange={e => { setInlinePart(e.target.value); if (e.target.value !== 'Part 2') setInlineSuggestions([]); }}
                            >
                                <option value="Part 1">Part 1 - Interview</option>
                                <option value="Part 2">Part 2 - Cue Card</option>
                                <option value="Part 3">Part 3 - Discussion</option>
                            </select>
                        </div>
                        <div className={styles.folderGroup}>
                            <label className={styles.folderLabel}>Số lần nộp tối đa</label>
                            <input
                                type="number"
                                min="1"
                                className={styles.folderInput}
                                placeholder="Không giới hạn (để trống)"
                                value={inlineMaxAttempts === null || inlineMaxAttempts === undefined ? '' : inlineMaxAttempts}
                                onChange={e => {
                                    const val = e.target.value;
                                    setInlineMaxAttempts(val === '' ? null : Math.max(1, parseInt(val, 10)));
                                }}
                            />
                        </div>
                    </>
                )}

            </div>

            {inlineSkillType === 'fileSubmission' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', marginBottom: '1rem' }}>
                    <div className={styles.folderGroup}>
                        <label className={styles.folderLabel}>Hướng dẫn / Yêu cầu chi tiết <span style={{color:'#ef4444'}}>*</span></label>
                        <textarea 
                            className={styles.folderTextarea} 
                            value={inlinePrompt} 
                            onChange={e => setInlinePrompt(e.target.value)} 
                            placeholder="Nhập hướng dẫn bài tự luận hoặc mô tả yêu cầu nộp file..." 
                            style={{ height: '120px' }}
                        />
                    </div>
                    
                    <div className={styles.folderGroup}>
                        {/* Integrated the reusable shared uploader */}
                        <CommonAttachmentUploader
                            files={inlineUploadPayloads}
                            onChange={setInlineUploadPayloads}
                            label="Tài liệu đính kèm mẫu (Tùy chọn)"
                            subLabel="Chấp nhận file: .pdf, .doc, .docx, .zip, .rar (Tối đa 30MB/file). Để trống nếu chỉ cần tạo cổng nộp bài."
                            buttonText="Đính kèm tài liệu học tập"
                        />
                    </div>
                </div>
            ) : (
                <div className={styles.folderGroup}>
                    <label className={styles.folderLabel}>Nội dung đề bài / Yêu cầu chi tiết <span style={{color:'#ef4444'}}>*</span></label>
                    <textarea className={styles.folderTextarea} value={inlinePrompt} onChange={e => setInlinePrompt(e.target.value)} placeholder="VD: Speak about a historical building in your town..." style={{ minHeight: '140px' }} />
                    {inlinePart === 'Part 2' && (
                        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={styles.folderLabel}>Các ý gợi ý</span>
                                <button type="button" className={styles.btnActionOutline} onClick={() => setInlineSuggestions(items => [...items, ''])}>
                                    + Thêm gợi ý
                                </button>
                            </div>
                            {inlineSuggestions.map((value, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        className={styles.folderInput}
                                        style={{ flex: 1 }}
                                        value={value}
                                        onChange={e => setInlineSuggestions(items => items.map((item, i) => i === index ? e.target.value : item))}
                                        placeholder={`Gợi ý ${index + 1}`}
                                    />
                                    <button
                                        type="button"
                                        className={styles.btnRemoveSuggestion}
                                        onClick={() => setInlineSuggestions(items => items.filter((_, i) => i !== index))}
                                        title="Xóa gợi ý"
                                        aria-label={`Xóa gợi ý ${index + 1}`}
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className={styles.btnActionOutline} onClick={onClose}>Hủy</button>
                <button 
                    type="button" 
                    className={styles.btnMiniAdd} 
                    onClick={handleAddTask}
                    style={{ background: '#6366f1', color: '#ffffff' }}
                >
                    Thêm vào thư mục
                </button>
            </div>
        </div>
    );
});

export default SpotTaskCreator;
