import React, { useState, useMemo, useEffect } from 'react';

// Helper functions defined statically outside the component
const getPrefix = (skillType) => {
    const type = (skillType || '').toLowerCase();
    if (type === 'speaking') return '🗣️';
    if (type === 'writing') return '✍️';
    if (type === 'reading') return '📖';
    if (type === 'listening') return '🎧';
    return '📝';
};

const getCleanText = (contentJson) => {
    if (!contentJson) return 'Không có chi tiết';
    try {
        const parsed = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
        if (!parsed) return 'Không có chi tiết';
        const rawContent = parsed.htmlContent || parsed.passageHtml || parsed.prompt || parsed.question || parsed.textPrompt || parsed.topic || parsed.title || '';
        let cleanText = '';
        if (typeof window !== 'undefined' && window.DOMParser) {
            try {
                const doc = new DOMParser().parseFromString(rawContent, 'text/html');
                cleanText = doc.body.textContent || rawContent;
            } catch (err) {
                cleanText = rawContent.replace(/<[^>]*>/g, '');
            }
        } else {
            cleanText = rawContent.replace(/<[^>]*>/g, '');
        }
        return cleanText.trim() || 'Không có chi tiết';
    } catch (e) {
        return 'Không có chi tiết';
    }
};

export default function ExerciseSelector({ show, onClose, oldExercises = [], onSelectTasks, styles }) {
    const [skillFilter, setSkillFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [speakingAttempts, setSpeakingAttempts] = useState({}); // { [exerciseId]: number | '' }
    const [bulkAttemptValue, setBulkAttemptValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 8;

    // Reset state when opening the modal
    useEffect(() => {
        if (show) {
            setSelectedIds([]);
            setSpeakingAttempts({});
            setBulkAttemptValue('');
            setCurrentPage(1);
            setSkillFilter('All');
            setSearchTerm('');
        }
    }, [show]);

    const filteredOld = useMemo(() => {
        return (oldExercises || []).filter(ex => {
            // Skill filter
            if (skillFilter !== 'All' && (ex.skillType || '').toLowerCase() !== skillFilter.toLowerCase()) {
                return false;
            }
            // Search filter
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const typeStr = (ex.type || '').toLowerCase();
                const skillStr = (ex.skillType || '').toLowerCase();
                const detailsStr = getCleanText(ex.contentJson).toLowerCase();
                return typeStr.includes(term) || skillStr.includes(term) || detailsStr.includes(term);
            }
            return true;
        });
    }, [oldExercises, skillFilter, searchTerm]);

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(filteredOld.length / PAGE_SIZE));
    const paginatedExercises = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredOld.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredOld, currentPage]);

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            let nextState;
            if (prev.includes(id)) {
                nextState = prev.filter(item => item !== id);
            } else {
                nextState = [...prev, id];
                // Apply current bulk attempt if newly selected task is Speaking
                const ex = oldExercises.find(e => e.exerciseId === id);
                if (ex && (ex.skillType || '').toLowerCase() === 'speaking' && bulkAttemptValue !== '') {
                    setSpeakingAttempts(prevAttempts => ({
                        ...prevAttempts,
                        [id]: bulkAttemptValue
                    }));
                }
            }
            return nextState;
        });
    };

    const handleAttemptChange = (id, value) => {
        setSpeakingAttempts(prev => ({
            ...prev,
            [id]: value === '' ? '' : Math.max(1, parseInt(value, 10))
        }));
    };

    const handleBulkAttemptChange = (val) => {
        const parsedInt = parseInt(val, 10);
        const parsedVal = (val === '' || isNaN(parsedInt)) ? '' : Math.max(1, parsedInt);
        setBulkAttemptValue(parsedVal);
        
        setSpeakingAttempts(prev => {
            const newAttempts = { ...prev };
            selectedIds.forEach(id => {
                const ex = oldExercises.find(e => e.exerciseId === id);
                if (ex && (ex.skillType || '').toLowerCase() === 'speaking') {
                    newAttempts[id] = parsedVal;
                }
            });
            return newAttempts;
        });
    };

    const handleSubmit = () => {
        if (selectedIds.length === 0) return;
        
        const selectedList = selectedIds.map(id => {
            const ex = oldExercises.find(e => e.exerciseId === id);
            if (!ex) return null;
            const attemptsVal = speakingAttempts[id];
            
            // Mặc định là 3 lượt nộp cho Speaking bài tập cũ nếu giáo viên không cấu hình cụ thể
            let attempts = 3;
            if (attemptsVal === '') {
                attempts = null; // Không giới hạn
            } else if (attemptsVal !== undefined) {
                attempts = attemptsVal;
            }
            
            return {
                ex,
                maxAttempts: attempts
            };
        }).filter(Boolean);
        
        onSelectTasks(selectedList);
        
        // Reset local states
        setSelectedIds([]);
        setSpeakingAttempts({});
        setBulkAttemptValue('');
        setCurrentPage(1);
    };

    const hasSelectedSpeaking = selectedIds.some(id => {
        const ex = oldExercises.find(e => e.exerciseId === id);
        return ex && (ex.skillType || '').toLowerCase() === 'speaking';
    });

    if (!show) return null;

    return (
        <div className={styles.folderModalOverlay} onClick={onClose}>
            <div className={styles.folderModalContent} style={{ width: '95%', maxWidth: '1200px', height: '90vh', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <i className="bi bi-database-fill-add" style={{ color: '#6366f1' }}></i>
                        <span>📂 NGÂN HÀNG ĐỀ - LỌC & CHỌN HÀNG LOẠT</span>
                    </h4>
                    <button className={styles.btnClose} onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div className={styles.folderBody} style={{ padding: '1.25rem', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Top controls: Search and Pills filters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                            <input 
                                type="text"
                                className={styles.folderInput}
                                style={{ width: '100%', paddingLeft: '36px', height: '42px', borderRadius: '10px' }}
                                placeholder="Tìm kiếm bài tập theo tiêu đề, kỹ năng, dạng bài..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {/* Skill Filter Pills */}
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {['All', 'Speaking', 'Writing', 'Reading', 'Listening'].map(skill => (
                                    <button
                                        key={skill}
                                        type="button"
                                        className={styles.btnActionOutline}
                                        style={{
                                            padding: '0.35rem 0.85rem',
                                            fontSize: '0.78rem',
                                            borderRadius: '20px',
                                            background: skillFilter === skill ? '#6366f1' : '#ffffff',
                                            color: skillFilter === skill ? '#ffffff' : '#475569',
                                            borderColor: skillFilter === skill ? '#6366f1' : '#cbd5e1',
                                            boxShadow: 'none',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => { setSkillFilter(skill); setCurrentPage(1); }}
                                    >
                                        {skill === 'All' ? 'Tất cả kỹ năng' : skill}
                                    </button>
                                ))}
                            </div>

                            {/* Bulk Attempts adjustment */}
                            {hasSelectedSpeaking && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', background: '#f5f3ff', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                                    <span style={{ fontWeight: 600, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <i className="bi bi-sliders"></i> Lượt nộp đồng loạt bài đã chọn:
                                    </span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={bulkAttemptValue}
                                        placeholder="Nhập số..."
                                        style={{ width: '80px', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                        onChange={e => handleBulkAttemptChange(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exercises checklist section */}
                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', minHeight: '260px' }}>
                        {oldExercises.length === 0 ? (
                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                                <span>Đang tải danh sách ngân hàng đề...</span>
                            </div>
                        ) : paginatedExercises.length === 0 ? (
                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
                                <span>Không tìm thấy bài tập nào tương ứng với bộ lọc của bạn.</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {paginatedExercises.map(ex => {
                                    const isSelected = selectedIds.includes(ex.exerciseId);
                                    const isSpeaking = (ex.skillType || '').toLowerCase() === 'speaking';
                                    
                                    return (
                                        <div 
                                            key={ex.exerciseId} 
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between', 
                                                padding: '0.85rem 1.25rem', 
                                                borderBottom: '1px solid #f1f5f9',
                                                background: isSelected ? '#f8fafc' : '#ffffff',
                                                transition: 'background 0.15s ease'
                                            }}
                                        >
                                            <div 
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, cursor: 'pointer' }}
                                                onClick={() => handleToggleSelect(ex.exerciseId)}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', pointerEvents: 'none' }}
                                                    checked={isSelected}
                                                    readOnly
                                                />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                                                        {getPrefix(ex.skillType)} {ex.type} - {ex.skillType}
                                                    </span>
                                                    <span style={{ fontSize: '0.78rem', color: '#64748b', maxBreakWords: '3' }}>
                                                        {getCleanText(ex.contentJson)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Max attempts parameter custom input for Speaking tasks */}
                                            {isSpeaking && (
                                                <div 
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '1.5rem' }}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Lượt nộp:</span>
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        placeholder="Mặc định (3)"
                                                        style={{ 
                                                            width: '95px', 
                                                            padding: '0.35rem 0.5rem', 
                                                            fontSize: '0.8rem', 
                                                            border: '1px solid #cbd5e1', 
                                                            borderRadius: '6px',
                                                            outline: 'none',
                                                            background: isSelected ? '#ffffff' : '#f1f5f9'
                                                        }}
                                                        value={speakingAttempts[ex.exerciseId] !== undefined ? speakingAttempts[ex.exerciseId] : '3'}
                                                        onChange={e => handleAttemptChange(ex.exerciseId, e.target.value)}
                                                        disabled={!isSelected}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Phân trang */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.25rem 0 0.5rem 0' }}>
                            <button 
                                type="button" 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    color: '#475569',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    transition: 'all 0.15s'
                                }}
                            >
                                <i className="bi bi-chevron-left" style={{ marginRight: '0.25rem' }}></i> Trước
                            </button>
                            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                Trang <strong style={{ color: '#6366f1' }}>{currentPage}</strong> / {totalPages}
                            </span>
                            <button 
                                type="button" 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    color: '#475569',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1,
                                    transition: 'all 0.15s'
                                }}
                            >
                                Sau <i className="bi bi-chevron-right" style={{ marginLeft: '0.25rem' }}></i>
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.folderFooter}>
                    <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
                        <i className="bi bi-patch-check-fill" style={{ color: '#6366f1', marginRight: '0.25rem' }}></i>
                        Đã chọn: <strong style={{ color: '#6366f1', fontSize: '1rem' }}>{selectedIds.length}</strong> bài tập
                    </span>
                    <button type="button" className={styles.btnActionOutline} onClick={onClose} style={{ cursor: 'pointer' }}>Hủy bỏ</button>
                    <button 
                        type="button" 
                        className={styles.btnMiniAdd} 
                        style={{ 
                            background: selectedIds.length === 0 ? '#cbd5e1' : '#6366f1', 
                            color: '#ffffff', 
                            padding: '0.5rem 1.25rem',
                            cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSubmit}
                        disabled={selectedIds.length === 0}
                    >
                        <i className="bi bi-plus-circle-fill" style={{ marginRight: '0.35rem' }}></i>
                        Thêm bài đã chọn
                    </button>
                </div>
            </div>
        </div>
    );
}
