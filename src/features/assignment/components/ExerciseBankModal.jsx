import React, { useState, useMemo } from 'react';
import styles from '../CreateAssignment.module.css';
import Swal from 'sweetalert2';

export default function ExerciseBankModal({ exercises, onClose, onSelect }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSkill, setSelectedSkill] = useState('SPEAKING');
    const [selectedItems, setSelectedItems] = useState({}); // { [exerciseId]: true }
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 6; // Hiển thị 6 bài trên mỗi trang để vừa khít màn hình

    // Lọc bài tập theo từ khóa tìm kiếm và loại kỹ năng
    const filteredExercises = useMemo(() => {
        return (exercises || []).filter(ex => {
            const matchesSearch = 
                (ex.type && ex.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (ex.topicName && ex.topicName.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesSkill = selectedSkill === 'ALL' || ex.skillType === selectedSkill;
            return matchesSearch && matchesSkill;
        });
    }, [exercises, searchTerm, selectedSkill]);

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(filteredExercises.length / PAGE_SIZE));
    const paginatedExercises = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredExercises.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredExercises, currentPage]);

    // Chọn / Bỏ chọn bài tập
    const toggleItem = (exerciseId) => {
        setSelectedItems(prev => ({
            ...prev,
            [exerciseId]: !prev[exerciseId]
        }));
    };

    // Danh sách các bài đã được chọn
    const selectedList = useMemo(() => {
        return (exercises || []).filter(ex => selectedItems[ex.exerciseId]);
    }, [exercises, selectedItems]);



    // Xác nhận chèn các bài đã chọn
    const handleConfirm = () => {
        if (selectedList.length === 0) {
            Swal.fire('Chú ý', 'Vui lòng chọn ít nhất một bài tập!', 'warning');
            return;
        }
        onSelect(selectedList);
    };

    const changePage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ width: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className={styles.modalHeader}>
                    <h4 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🗂️</span> Ngân Hàng Đề
                    </h4>
                    <button type="button" onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>

                {/* Thanh tìm kiếm và bộ lọc nhanh */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
                    <input 
                        type="text" 
                        placeholder="Tìm theo chủ đề hoặc tiêu đề bài tập..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className={styles.input}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    />
                    <select 
                        value={selectedSkill}
                        onChange={(e) => { setSelectedSkill(e.target.value); setCurrentPage(1); }}
                        className={styles.select}
                        style={{ width: '160px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    >
                        <option value="SPEAKING">Speaking</option>
                    </select>
                </div>

                {/* Hiển thị số lượng bài đã chọn */}
                <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Đã chọn <strong>{selectedList.length}</strong> bài tập
                    </span>
                </div>

                {/* Danh sách bài tập trong ngân hàng */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {paginatedExercises.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            Không tìm thấy bài tập nào khớp với bộ lọc.
                        </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {paginatedExercises.map(ex => {
                            const isChecked = !!selectedItems[ex.exerciseId];
                            return (
                                <div 
                                    key={ex.exerciseId} 
                                    onClick={() => toggleItem(ex.exerciseId)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem 1rem',
                                        background: isChecked ? '#f5f3ff' : '#ffffff',
                                        border: isChecked ? '1px solid #6366f1' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => {}} // Đã xử lý ở thẻ cha div.onClick
                                        onClick={(e) => e.stopPropagation()} 
                                        style={{ transform: 'scale(1.1)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <span style={{
                                            background: ex.skillType === 'SPEAKING' ? '#fee2e2' : '#e0e7ff',
                                            color: ex.skillType === 'SPEAKING' ? '#ef4444' : '#6366f1',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase'
                                        }}>
                                            {ex.skillType}
                                        </span>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '3px', color: '#1e293b' }}>
                                            {ex.type}
                                        </div>
                                        {ex.topicName && (
                                            <small style={{ color: '#64748b' }}>Chủ đề: {ex.topicName}</small>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer phân trang và Xác nhận chèn */}
                <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                    {/* Phân trang */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                            type="button" 
                            disabled={currentPage === 1}
                            onClick={() => changePage(currentPage - 1)}
                            style={{
                                padding: '0.35rem 0.75rem',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1
                            }}
                        >
                            Trước
                        </button>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                            Trang <strong>{currentPage}</strong> / {totalPages}
                        </span>
                        <button 
                            type="button" 
                            disabled={currentPage === totalPages}
                            onClick={() => changePage(currentPage + 1)}
                            style={{
                                padding: '0.35rem 0.75rem',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.5 : 1
                            }}
                        >
                            Sau
                        </button>
                    </div>

                    {/* Nút hành động */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: '#475569',
                                cursor: 'pointer'
                            }}
                        >
                            Đóng
                        </button>
                        <button 
                            type="button" 
                            onClick={handleConfirm}
                            disabled={selectedList.length === 0}
                            style={{
                                padding: '0.5rem 1.25rem',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: '#ffffff',
                                fontWeight: 600,
                                cursor: selectedList.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: selectedList.length === 0 ? 0.5 : 1
                            }}
                        >
                            Chèn đã chọn ({selectedList.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
