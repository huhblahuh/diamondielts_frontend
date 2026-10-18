import React, { useState } from 'react';
import Swal from 'sweetalert2';
import styles from '../CreateAssignment.module.css';
import assignmentService from '../../../api/services/assignment.service';
import { makeSpeakingContent } from '../../../utils/speakingContent';

export default function AssignmentBuilder({ items, setItems, onOpenBank }) {
    const [showSpeakingBuilder, setShowSpeakingBuilder] = useState(false);
    const [speakingPart, setSpeakingPart] = useState('Part 1');
    const [speakingPrompt, setSpeakingPrompt] = useState('');
    const [speakingSuggestions, setSpeakingSuggestions] = useState([]);

    // State cho File Submission Builder (Trường hợp A)
    const [showFileSubmissionBuilder, setShowFileSubmissionBuilder] = useState(false);
    const [fileSubmissionDescription, setFileSubmissionDescription] = useState('');
    const [fileSubmissionPayloads, setFileSubmissionPayloads] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const removeItem = (localId) => {
        setItems(prev => prev.filter(i => i.id !== localId));
    };

    const handleAddInlineSpeakingConfirm = () => {
        if (!speakingPrompt.trim() || speakingPrompt === '<p></p>') {
            Swal.fire('Chú ý', 'Vui lòng nhập nội dung đề bài!', 'warning');
            return;
        }

        const newItem = {
            id: Date.now(),
            itemType: 'SPEAKING',
            type: speakingPart,
            content: makeSpeakingContent(speakingPrompt, speakingSuggestions, speakingPart),
            _displayLabel: `🗣️ [Tự do] ${speakingPart} - ${speakingPrompt.substring(0, 40)}...`
        };
        setItems([...items, newItem]);
        setShowSpeakingBuilder(false);
        setSpeakingPrompt('');
        setSpeakingSuggestions([]);
        setSpeakingPart('Part 1');
        Swal.fire({ icon: 'success', title: 'Đã tạo task Ghi âm', timer: 1000, showConfirmButton: false });
    };

    const handleAddFileUpload = () => {
        const newItem = {
            id: Date.now(),
            itemType: 'fileSubmission',
            type: '',
            content: { description: '', allowedExtensions: ['pdf', 'docx', 'zip'] },
            _displayLabel: `📁 Yêu cầu Nộp File (PDF/Docx)`
        };
        setItems([...items, newItem]);
        Swal.fire({ icon: 'success', title: 'Đã thêm Task Nộp File', timer: 1200, showConfirmButton: false });
    };

    // Hàm upload file lên Azure Storage (Tối đa 30MB)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Giới hạn 30MB
        const maxFileSize = 30 * 1024 * 1024;
        if (file.size > maxFileSize) {
            Swal.fire('Lỗi dung lượng', 'Dung lượng file vượt quá giới hạn cho phép (Tối đa 30MB).', 'error');
            e.target.value = '';
            return;
        }

        // Hạn chế định dạng file
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.zip', '.rar'];
        if (!allowedExtensions.includes(extension)) {
            Swal.fire('Định dạng không hỗ trợ', 'Chỉ chấp nhận các định dạng file: .pdf, .doc, .docx, .zip, .rar', 'error');
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const res = await assignmentService.uploadMaterial(file);
            setFileSubmissionPayloads(prev => [...prev, {
                dataType: res.dataType,
                dataValue: res.dataValue,
                fileName: res.fileName || file.name
            }]);
            Swal.fire({ icon: 'success', title: 'Tải lên thành công', timer: 1000, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Thất bại', 'Không thể tải file lên. Vui lòng thử lại.', 'error');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleRemovePayloadFile = (index) => {
        setFileSubmissionPayloads(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleAddFileSubmissionConfirm = () => {
        if (!fileSubmissionDescription.trim() || fileSubmissionDescription === '<p></p>') {
            Swal.fire('Chú ý', 'Vui lòng nhập mô tả hoặc yêu cầu đề tự luận!', 'warning');
            return;
        }

        const newItem = {
            id: Date.now(),
            itemType: 'fileSubmission',
            type: '',
            content: { description: fileSubmissionDescription },
            payloads: fileSubmissionPayloads,
            _displayLabel: `📁 [Nộp File] ${fileSubmissionDescription.replace(/<[^>]*>/g, '').substring(0, 40)}... (${fileSubmissionPayloads.length} files)`
        };

        setItems([...items, newItem]);
        setShowFileSubmissionBuilder(false);
        setFileSubmissionDescription('');
        setFileSubmissionPayloads([]);
        Swal.fire({ icon: 'success', title: 'Đã thêm Task Nộp File tự luận', timer: 1000, showConfirmButton: false });
    };

    return (
        <div className={styles.panel} style={{background:'#f8fafc'}}>
            <h4 className={styles.panelTitle}><i className="bi bi-layers"></i> Cấu trúc nội dung bài nộp</h4>
            
            <div style={{display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
                <button type="button" className={styles.subBtn} onClick={onOpenBank}>
                    <i className="bi bi-database-add"></i> Chọn từ Ngân Hàng
                </button>
                <button type="button" className={styles.subBtn} onClick={() => setShowSpeakingBuilder(true)}>
                    <i className="bi bi-mic"></i> Chèn Task Ghi Âm
                </button>
                <button type="button" className={styles.subBtn} onClick={() => setShowFileSubmissionBuilder(true)}>
                    <i className="bi bi-file-earmark-arrow-up"></i> Chèn Task Nộp File tự luận
                </button>
                <button type="button" className={styles.subBtn} onClick={handleAddFileUpload}>
                    <i className="bi bi-cloud-upload"></i> Chèn Task Nộp File (Cũ)
                </button>
            </div>

            <div className={styles.builderList}>
                {items.length === 0 ? (
                    <div className={styles.emptyBuilder}>
                        ⚠️ Trống. Chưa có bài tập hoặc task nào được đính kèm vào deadline này.
                    </div>
                ) : (
                    items.map((it, index) => (
                        <div key={it.id} className={styles.builderItemCard}>
                            <div className={styles.dragHandle}>::</div>
                            <div className={styles.orderBadge}>{index + 1}</div>
                            <div style={{flex:1, fontWeight:500, fontSize:'0.95rem'}}>
                                {it._displayLabel}
                            </div>
                            <div className={styles.itemActions}>
                                <button type="button" className={styles.miniDanger} onClick={() => removeItem(it.id)}>
                                    <i className="bi bi-trash3"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Inline Speaking Builder Modal */}
            {showSpeakingBuilder && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{width:'700px'}}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h4 style={{margin:0}}><i className="bi bi-mic-fill" style={{color:'#e11d48'}}></i> Thiết kế Task Ghi âm (Inline)</h4>
                                <p style={{margin:0, fontSize:'0.8rem', color:'#64748b'}}>Tạo nội dung nói riêng biệt cho deadline này.</p>
                            </div>
                            <button type="button" onClick={() => setShowSpeakingBuilder(false)} className={styles.closeBtn}>&times;</button>
                        </div>
                        <div style={{padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem'}}>
                            <div>
                                <label className={styles.label}>Dạng Đề / Phần thi</label>
                                <select className={styles.select} value={speakingPart} onChange={(e) => { setSpeakingPart(e.target.value); if (e.target.value !== 'Part 2') setSpeakingSuggestions([]); }}>
                                    <option value="Part 1">Part 1 - Giới thiệu & Phỏng vấn</option>
                                    <option value="Part 2">Part 2 - Thẻ gợi ý (Cue Card)</option>
                                    <option value="Part 3">Part 3 - Thảo luận Mở rộng</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Nội dung đề bài / Yêu cầu nói</label>
                                <div style={{border:'1px solid #cbd5e1', borderRadius:'8px', minHeight:'220px'}}>
                                    <textarea className={styles.input} value={speakingPrompt} onChange={event => setSpeakingPrompt(event.target.value)} placeholder="Nhập câu hỏi Speaking..." style={{ minHeight: '180px', resize: 'vertical' }} />
                                </div>
                            </div>
                            {speakingPart === 'Part 2' && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><label className={styles.label}>Các ý gợi ý</label><button type="button" className={styles.btnSecondary} onClick={() => setSpeakingSuggestions(items => [...items, ''])}>+ Thêm gợi ý</button></div>
                                    <div style={{display:'grid', gap:'0.5rem'}}>{speakingSuggestions.map((value, index) => <div key={index} style={{display:'flex', gap:'0.5rem'}}><input className={styles.input} value={value} onChange={event => setSpeakingSuggestions(items => items.map((item, i) => i === index ? event.target.value : item))} placeholder={`Gợi ý ${index + 1}`} /><button type="button" className={styles.miniDanger} onClick={() => setSpeakingSuggestions(items => items.filter((_, i) => i !== index))} title="Xóa gợi ý" aria-label={`Xóa gợi ý ${index + 1}`}><i className="bi bi-x-lg"></i></button></div>)}</div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button type="button" onClick={() => setShowSpeakingBuilder(false)} className={styles.btnSecondary}>Hủy bỏ</button>
                            <button type="button" onClick={handleAddInlineSpeakingConfirm} className={styles.btnSubmit}>Chèn Vào Danh Sách</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thiết kế Task Nộp File Tự luận (Trường hợp A) */}
            {showFileSubmissionBuilder && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{width:'750px'}}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h4 style={{margin:0}}><i className="bi bi-file-earmark-arrow-up-fill" style={{color:'#101d54'}}></i> Thiết kế Task Nộp File Tự luận</h4>
                                <p style={{margin:0, fontSize:'0.8rem', color:'#64748b'}}>Tạo không gian nộp bài kèm hướng dẫn và tài liệu đính kèm (nếu có).</p>
                            </div>
                            <button type="button" onClick={() => setShowFileSubmissionBuilder(false)} className={styles.closeBtn}>&times;</button>
                        </div>
                        <div style={{padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem'}}>
                            <div>
                                <label className={styles.label}>Nội dung hướng dẫn / Đề bài chi tiết</label>
                                <textarea 
                                    className={styles.input} 
                                    value={fileSubmissionDescription} 
                                    onChange={(e) => setFileSubmissionDescription(e.target.value)} 
                                    placeholder="Nhập mô tả đề tự luận hoặc yêu cầu nộp file..." 
                                    style={{ height: '140px', resize: 'vertical' }}
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Tài liệu đính kèm mẫu (Tùy chọn - Tối đa 30MB/file)</label>
                                <p style={{margin:'0 0 0.5rem 0', fontSize:'0.8rem', color:'#64748b'}}>Chấp nhận các file dạng: <b>.pdf, .doc, .docx, .zip, .rar</b>. Giáo viên có thể bỏ trống file nếu chỉ cần tạo chỗ nộp bài cho học sinh.</p>
                                
                                <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                                    <label className={styles.btnSecondary} style={{cursor:'pointer', margin:0, display:'inline-flex', alignItems:'center', gap:'0.5rem'}}>
                                        <i className="bi bi-paperclip"></i> {isUploading ? 'Đang tải lên...' : 'Chọn File Đính Kèm'}
                                        <input type="file" onChange={handleFileChange} disabled={isUploading} style={{display:'none'}} accept=".pdf,.doc,.docx,.zip,.rar" />
                                    </label>
                                    {isUploading && (
                                        <div style={{fontSize:'0.9rem', color:'#101d54'}}>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang đẩy file lên Cloud...
                                        </div>
                                    )}
                                </div>

                                {fileSubmissionPayloads.length > 0 && (
                                    <div style={{marginTop:'1rem', background:'#f1f5f9', padding:'0.75rem', borderRadius:'8px'}}>
                                        <div style={{fontWeight:600, fontSize:'0.85rem', color:'#475569', marginBottom:'0.5rem'}}>Danh sách tài liệu mẫu đã đính kèm:</div>
                                        <ul style={{margin:0, paddingLeft:'1.25rem', display:'flex', flexDirection:'column', gap:'0.35rem'}}>
                                            {fileSubmissionPayloads.map((fl, idx) => (
                                                <li key={idx} style={{fontSize:'0.9rem', color:'#334155'}}>
                                                    <span style={{display:'inline-flex', alignItems:'center', gap:'0.5rem', width:'100%', justifyContent:'space-between'}}>
                                                        <span><i className="bi bi-file-earmark-text"></i> {fl.fileName} <span style={{fontSize:'0.75rem', color:'#64748b'}}>({fl.dataType})</span></span>
                                                        <button type="button" onClick={() => handleRemovePayloadFile(idx)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', padding:0}}>
                                                            <i className="bi bi-trash"></i> Xóa
                                                        </button>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button type="button" onClick={() => setShowFileSubmissionBuilder(false)} className={styles.btnSecondary}>Hủy bỏ</button>
                            <button type="button" onClick={handleAddFileSubmissionConfirm} className={styles.btnSubmit} style={{background:'#101d54'}}>Chèn Vào Danh Sách</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
