import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import TiptapEditor from '../../../components/TiptapEditor';
import styles from '../ExerciseManagement.module.css';

export default function ExerciseDesignerModal({ isOpen, onClose, topic, exercise, onSaved }) {
    const [activeSkill, setActiveSkill] = useState('SPEAKING');
    const [partType, setPartType] = useState('Part 1');
    const [editorContent, setEditorContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [blocks, setBlocks] = useState([]);
    const tiptapRefs = useRef({});

    useEffect(() => {
        if (isOpen) {
            if (exercise) {
                setActiveSkill(exercise.skillType);
                setPartType(exercise.type);
                try {
                    const content = JSON.parse(exercise.contentJson || '{}');
                    setEditorContent(content.passageHtml || content.textPrompt || '');
                    setBlocks(content.blocks || []);
                } catch (e) {
                    console.error("Error parsing contentJson", e);
                    setEditorContent('');
                    setBlocks([]);
                }
            } else {
                setActiveSkill('SPEAKING');
                setPartType('Part 1');
                setEditorContent('');
                setBlocks([]);
            }
        } else {
            setActiveSkill('SPEAKING');
            setPartType('Part 1');
            setEditorContent('');
            setBlocks([]);
        }
    }, [exercise, isOpen]);

    if (!isOpen) return null;

    const handleSkillChange = (skill) => {
        setActiveSkill(skill);
        if (skill !== 'QUESTIONS') {
            setPartType(skill === 'SPEAKING' ? 'Part 1' : 'Type 1');
        }
    };

    const handleAddBlock = (type) => {
        setBlocks([...blocks, {
            id: Date.now(),
            type: type,
            instruction: '',
            contentHtml: '',
            questions: []
        }]);
    };

    const handleUpdateBlock = (blockId, field, value) => {
        setBlocks(blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b));
    };

    const handleRemoveBlock = (blockId) => {
        setBlocks(blocks.filter(b => b.id !== blockId));
    };

    const handleAddQuestionToBlock = (blockId) => {
        setBlocks(blocks.map(b => {
            if (b.id === blockId) {
                const nextNum = b.questions.length > 0 ? Math.max(...b.questions.map(q => q.number)) + 1 : 1;
                const newQ = { 
                    id: Date.now(), 
                    number: nextNum, 
                    text: '', 
                    correctAnswer: '',
                    options: b.type === 'MULTIPLE_CHOICE' ? ['A', 'B', 'C', 'D'] : [] 
                };
                return { ...b, questions: [...b.questions, newQ] };
            }
            return b;
        }));
    };

    const handleUpdateQuestionInBlock = (blockId, qId, field, value) => {
        setBlocks(blocks.map(b => {
            if (b.id === blockId) {
                return { ...b, questions: b.questions.map(q => q.id === qId ? { ...q, [field]: value } : q) };
            }
            return b;
        }));
    };

    const handleUpdateOptionInBlock = (blockId, qId, optIndex, value) => {
        setBlocks(blocks.map(b => {
            if (b.id === blockId) {
                return { 
                    ...b, 
                    questions: b.questions.map(q => {
                        if (q.id === qId) {
                            const newOpts = [...q.options];
                            newOpts[optIndex] = value;
                            return { ...q, options: newOpts };
                        }
                        return q;
                    }) 
                };
            }
            return b;
        }));
    };

    const handleRemoveQuestionFromBlock = (blockId, qId) => {
        setBlocks(blocks.map(b => {
            if (b.id === blockId) {
                return { ...b, questions: b.questions.filter(q => q.id !== qId) };
            }
            return b;
        }));
    };

    const handleGapFillSync = (blockId, html, editor) => {
        const editorRef = tiptapRefs.current[blockId];
        const foundNumbers = editorRef ? editorRef.getGapIds() : [];
        setBlocks(prevBlocks => prevBlocks.map(b => {
            if (b.id !== blockId) return b;
            const syncedQuestions = b.questions.filter(q => foundNumbers.includes(q.number));
            return { ...b, contentHtml: html, questions: syncedQuestions };
        }));
    };

    const handleInsertGapAtCursor = (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
        const nextNum = block.questions.length > 0 ? Math.max(...block.questions.map(q => q.number)) + 1 : 1;
        const newQ = { id: Date.now(), number: nextNum, text: '', correctAnswer: '', options: [] };
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, questions: [...b.questions, newQ] } : b));
        const editorRef = tiptapRefs.current[blockId];
        if (editorRef) {
            editorRef.insertGap(nextNum);
        }
    };

    const handleSaveExercise = async () => {
        if (!editorContent.trim() || editorContent === '<p><br></p>') {
            Swal.fire('Chú ý', 'Vui lòng nhập nội dung đề bài!', 'warning');
            return;
        }
        setSaving(true);
        try {
            const contentJson = JSON.stringify({
                passageHtml: editorContent,
                blocks: (activeSkill === 'READING' || activeSkill === 'LISTENING') ? blocks : [],
                textPrompt: editorContent.replace(/<[^>]*>/g, '').substring(0, 150),
            });

            if (exercise) {
                await exerciseService.update(exercise.exerciseId, {
                    skillType: activeSkill,
                    type: partType,
                    contentJson: contentJson,
                    topicId: topic.id
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Cập nhật thành công!',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await exerciseService.create({
                    skillType: activeSkill,
                    type: partType,
                    contentJson: contentJson,
                    topicId: topic.id
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Lưu thành công!',
                    text: `Đã đẩy đề bài vào kho của ${topic.name}.`,
                    timer: 1500,
                    showConfirmButton: false
                });
            }

            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể lưu đề bài.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            {exercise ? `✏️ Chỉnh Sửa Đề Bài #${exercise.exerciseId}` : `✨ Soạn Thảo Đề Bài Mới`}
                        </h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Chủ đề: <strong>{topic.name}</strong>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                    >
                        <i className="bi bi-x-lg" style={{ fontSize: '1.2rem' }}></i>
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    <div className={styles.actionPanel} style={{ margin: 0, boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }}>
                        <div className={styles.modeTabBar} style={{ marginBottom: '1.5rem' }}>
                            {['QUESTIONS', 'SPEAKING', 'READING', 'LISTENING', 'WRITING'].map(skill => (
                                <button 
                                    key={skill}
                                    className={`${styles.modeTab} ${styles['tab' + skill.charAt(0) + skill.slice(1).toLowerCase()]} ${activeSkill === skill ? styles.activeTab : ''}`} 
                                    onClick={() => handleSkillChange(skill)}
                                    type="button"
                                >
                                    <i className={`bi bi-${skill === 'QUESTIONS' ? 'question-square' : skill === 'SPEAKING' ? 'mic' : skill === 'READING' ? 'book' : skill === 'LISTENING' ? 'headphones' : 'pencil-square'}-fill`}></i> {skill.charAt(0) + skill.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>

                        <div className={styles.designerBody} style={{ padding: 0 }}>
                            {activeSkill !== 'QUESTIONS' ? (
                                <div>
                                    <div className={styles.formRow}>
                                        <div className={styles.styledFormGroup}>
                                            <label>Dạng Đề / Phần thi (Part)</label>
                                            {activeSkill === 'SPEAKING' ? (
                                                <select className={styles.styledSelect} value={partType} onChange={(e) => setPartType(e.target.value)}>
                                                    <option value="Part 1">Part 1 - Giới thiệu & Phỏng vấn</option>
                                                    <option value="Part 2">Part 2 - Thẻ gợi ý (Cue Card)</option>
                                                    <option value="Part 3">Part 3 - Thảo luận Mở rộng</option>
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    className={styles.styledInput} 
                                                    placeholder="Ví dụ: Section 1, Task 2..."
                                                    value={partType}
                                                    onChange={e => setPartType(e.target.value)}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.styledFormGroup}>
                                            <label>Trạng thái</label>
                                            <select className={styles.styledSelect} disabled>
                                                <option>Đang Active (Mặc định)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.styledFormGroup}>
                                        <label>{(activeSkill === 'READING' || activeSkill === 'LISTENING') ? 'KHỐI 1: Đoạn văn gốc (Passage)' : 'Nội dung đề thi'}</label>
                                        <div className={styles.editorWrapper}>
                                            <TiptapEditor 
                                                value={editorContent}
                                                onChange={setEditorContent}
                                                minHeight="200px"
                                                placeholder={`Gõ nội dung văn bản chính tại đây...`}
                                            />
                                        </div>
                                    </div>

                                    {/* Sub-blocks for Reading/Listening */}
                                    {(activeSkill === 'READING' || activeSkill === 'LISTENING') && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '1rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                                🧩 KHỐI 2: Thiết kế Block Câu hỏi đi kèm
                                            </h4>

                                            {blocks.map((block, index) => (
                                                <div key={block.id} className={styles.blockCard}>
                                                    <div className={styles.blockHeader}>
                                                        <div>
                                                            <h5 className={styles.blockTitle}>Block #{index + 1}: Dạng Câu hỏi</h5>
                                                            <span className={styles.blockTypeBadge}>{block.type}</span>
                                                        </div>
                                                        <button type="button" className={styles.removeBtn} onClick={() => handleRemoveBlock(block.id)} style={{ fontSize: '1.2rem' }}>
                                                            <i className="bi bi-trash3-fill"></i>
                                                        </button>
                                                    </div>

                                                    <div className={styles.styledFormGroup}>
                                                        <label>Yêu cầu / Hướng dẫn đề (Instruction)</label>
                                                        <input 
                                                            type="text" 
                                                            className={styles.styledInput} 
                                                            placeholder="Ví dụ: Write NO MORE THAN TWO WORDS..."
                                                            value={block.instruction}
                                                            onChange={e => handleUpdateBlock(block.id, 'instruction', e.target.value)}
                                                        />
                                                    </div>

                                                    {block.type === 'SUMMARY_COMPLETION' && (
                                                        <div className={styles.styledFormGroup}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                <label style={{ margin: 0 }}>Văn bản đục lỗ (Inline Gap Fill)</label>
                                                                <button type="button" className={styles.addQBtn} onClick={() => handleInsertGapAtCursor(block.id)}>
                                                                    <i className="bi bi-plus-circle"></i> Chèn ô trống [Gap]
                                                                </button>
                                                            </div>
                                                            <div className={styles.editorWrapper} style={{ borderColor: '#10b981' }}>
                                                                <TiptapEditor 
                                                                    ref={el => tiptapRefs.current[block.id] = el}
                                                                    value={block.contentHtml}
                                                                    onChange={(content, editor) => handleGapFillSync(block.id, content, editor)}
                                                                    minHeight="150px"
                                                                    placeholder="Gõ nội dung văn bản. Để con trỏ vào vị trí cần đục lỗ và bấm nút 'Chèn ô trống [Gap]' ở trên..."
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                            <strong style={{ color: '#334155' }}>Danh sách câu hỏi / Đáp án</strong>
                                                            <button type="button" className={styles.addQBtn} onClick={() => handleAddQuestionToBlock(block.id)}>
                                                                <i className="bi bi-plus"></i> Thêm câu
                                                            </button>
                                                        </div>

                                                        {block.questions.map((q) => (
                                                            <div key={q.id} className={styles.questionRow}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Số thứ tự</label>
                                                                    <input 
                                                                        type="number" 
                                                                        className={styles.styledInput} 
                                                                        style={{ width: '70px', padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}
                                                                        value={q.number}
                                                                        onChange={e => handleUpdateQuestionInBlock(block.id, q.id, 'number', parseInt(e.target.value))}
                                                                    />
                                                                </div>

                                                                {block.type !== 'SUMMARY_COMPLETION' && (
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Nội dung câu hỏi</label>
                                                                        <input 
                                                                            type="text" 
                                                                            className={styles.styledInput} 
                                                                            style={{ padding: '0.5rem' }}
                                                                            placeholder="Nhập nội dung..."
                                                                            value={q.text}
                                                                            onChange={e => handleUpdateQuestionInBlock(block.id, q.id, 'text', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div style={{ flex: 1 }}>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Đáp án đúng</label>
                                                                    {block.type === 'TRUE_FALSE_NG' ? (
                                                                        <select className={styles.styledSelect} style={{ padding: '0.5rem' }} value={q.correctAnswer} onChange={e => handleUpdateQuestionInBlock(block.id, q.id, 'correctAnswer', e.target.value)}>
                                                                            <option value="">-- Chọn --</option>
                                                                            <option value="TRUE">TRUE / YES</option>
                                                                            <option value="FALSE">FALSE / NO</option>
                                                                            <option value="NOT GIVEN">NOT GIVEN</option>
                                                                        </select>
                                                                    ) : block.type === 'SUMMARY_COMPLETION' ? (
                                                                        <input type="text" className={styles.styledInput} style={{ padding: '0.5rem', borderColor: '#10b981' }} placeholder="Từ khóa đáp án" value={q.correctAnswer} onChange={e => handleUpdateQuestionInBlock(block.id, q.id, 'correctAnswer', e.target.value)} />
                                                                    ) : (
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                            {q.options.map((opt, optIdx) => (
                                                                                <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                                                    <input type="radio" name={`correct_${q.id}`} checked={q.correctAnswer === optIdx.toString()} onChange={() => handleUpdateQuestionInBlock(block.id, q.id, 'correctAnswer', optIdx.toString())} />
                                                                                    <span style={{ fontWeight: 600 }}>{String.fromCharCode(65+optIdx)}.</span>
                                                                                    <input type="text" className={styles.optInput} style={{ padding: '0.2rem' }} placeholder={`Option`} value={opt} onChange={e => handleUpdateOptionInBlock(block.id, q.id, optIdx, e.target.value)} />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <button type="button" className={styles.removeBtn} onClick={() => handleRemoveQuestionFromBlock(block.id, q.id)}><i className="bi bi-trash3-fill"></i></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className={styles.addBlockMenu}>
                                                <button type="button" className={styles.addBlockBtn} onClick={() => handleAddBlock('TRUE_FALSE_NG')}>
                                                    <i className="bi bi-check2-circle" style={{ color: '#3b82f6' }}></i> + True/False/NG
                                                </button>
                                                <button type="button" className={styles.addBlockBtn} onClick={() => handleAddBlock('MULTIPLE_CHOICE')}>
                                                    <i className="bi bi-ui-radios-grid" style={{ color: '#8b5cf6' }}></i> + Multiple Choice
                                                </button>
                                                <button type="button" className={styles.addBlockBtn} onClick={() => handleAddBlock('SUMMARY_COMPLETION')}>
                                                    <i className="bi bi-textarea-t" style={{ color: '#10b981' }}></i> + Gap Fill (Inline)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.designerHeader} style={{ margin: 0, padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#6366f1' }}>
                                        <i className="bi bi-question-square-fill"></i>
                                        Soạn thảo bộ Câu hỏi Ngắn
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Tính năng soạn thảo bộ câu hỏi ngắn đang được chuẩn bị tích hợp.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc',
                    gap: '0.75rem'
                }}>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSaveExercise} 
                        disabled={saving}
                        style={{
                            background: 'linear-gradient(to right, #4f46e5, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? (
                            <>Đang lưu...</>
                        ) : exercise ? (
                            <><i className="bi bi-pencil-square"></i> Cập nhật</>
                        ) : (
                            <><i className="bi bi-plus-lg"></i> Thêm mới</>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Keyframe animations styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}} />
        </div>
    );
}
