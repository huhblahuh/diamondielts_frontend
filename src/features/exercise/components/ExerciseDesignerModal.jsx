import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import { makeSpeakingContent, normalizeSpeakingContent } from '../../../utils/speakingContent';
import styles from '../ExerciseManagement.module.css';

export default function ExerciseDesignerModal({ isOpen, onClose, topic, exercise, onSaved }) {
    const [partType, setPartType] = useState('Part 1');
    const [question, setQuestion] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const content = normalizeSpeakingContent(exercise?.content);
        setPartType(exercise?.type || 'Part 1');
        setQuestion(content.question);
        setSuggestions(content.suggestions);
    }, [exercise, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const content = makeSpeakingContent(question, suggestions, partType);
        if (!content.question) {
            await Swal.fire('Chú ý', 'Vui lòng nhập câu hỏi.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const payload = { skillType: 'SPEAKING', type: partType, content, topicId: topic.id };
            if (exercise) await exerciseService.update(exercise.exerciseId, payload);
            else await exerciseService.create(payload);
            await Swal.fire({ icon: 'success', title: exercise ? 'Cập nhật thành công!' : 'Lưu thành công!', timer: 1200, showConfirmButton: false });
            onSaved?.();
            onClose();
        } catch (error) {
            await Swal.fire('Lỗi', error?.message || 'Không thể lưu đề bài.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
                <div className={styles.modalHeader}>
                    <div><h3 id="exercise-modal-title">{exercise ? 'Chỉnh sửa đề Speaking' : 'Tạo đề Speaking'}</h3><p>Chủ đề: <strong>{topic.name}</strong></p></div>
                    <button type="button" className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.styledFormGroup}>
                        <label>Phần thi</label>
                        <select className={styles.styledSelect} value={partType} onChange={event => { const next = event.target.value; setPartType(next); if (next !== 'Part 2') setSuggestions([]); }}>
                            <option value="Part 1">Part 1 - Interview</option><option value="Part 2">Part 2 - Cue Card</option><option value="Part 3">Part 3 - Discussion</option>
                        </select>
                    </div>
                    <div className={styles.styledFormGroup}>
                        <label>Câu hỏi</label>
                        <textarea className={`${styles.styledInput} ${styles.questionTextarea}`} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Nhập câu hỏi Speaking..." />
                    </div>
                    {partType === 'Part 2' && (
                        <div className={styles.styledFormGroup}>
                            <div className={styles.suggestionHeader}><label>Các ý gợi ý</label><button type="button" className={styles.addQBtn} onClick={() => setSuggestions(items => [...items, ''])}><i className="bi bi-plus-circle"></i> Thêm gợi ý</button></div>
                            <div className={styles.suggestionList}>
                                {suggestions.map((suggestion, index) => <div key={index} className={styles.suggestionRow}><input className={styles.styledInput} value={suggestion} onChange={event => setSuggestions(items => items.map((item, i) => i === index ? event.target.value : item))} placeholder={`Gợi ý ${index + 1}`} /><button type="button" className={styles.removeBtn} onClick={() => setSuggestions(items => items.filter((_, i) => i !== index))} title="Xóa gợi ý" aria-label={`Xóa gợi ý ${index + 1}`}><i className="bi bi-x-lg"></i></button></div>)}
                                {suggestions.length === 0 && <small className={styles.formHint}>Cue card có thể không có gợi ý.</small>}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.modalFooter}><button type="button" className={styles.btnSecondary} onClick={onClose}>Hủy</button><button type="button" className={styles.btnSubmit} disabled={saving} onClick={handleSave}>{saving ? 'Đang lưu...' : 'Lưu đề'}</button></div>
            </div>
        </div>
    );
}
