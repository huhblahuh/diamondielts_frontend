import React, { useState } from 'react';

export default function AddMemberModal({ show, onClose, usersPool = [], existingMembers = [], onAddUser, styles }) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!show) return null;

    const filteredUsers = usersPool
        .filter(u => !existingMembers.some(m => m.userId === u.userId))
        .filter(u => 
            u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h4><i className="bi bi-person-plus-fill"></i> Thêm Thành Viên</h4>
                    <button className={styles.btnClose} onClick={onClose}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    <p className={styles.modalSubtitle}>Chọn học sinh hoặc giáo viên để mời tham gia lớp.</p>
                    <input 
                        type="text"
                        placeholder="🔍 Gõ tên hoặc email để tìm kiếm..."
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className={styles.userListScroll}>
                        {filteredUsers.map(u => (
                            <div key={u.userId} className={styles.userItem}>
                                <div>
                                    <span className={(u.role === 'Teacher' || u.role === 'Admin') ? styles.userNameRed : styles.boldText}>
                                        {u.fullName}
                                    </span>
                                    {(u.role === 'Teacher' || u.role === 'Admin') && <span className={styles.userRoleBadge}>{u.role}</span>}
                                    <br/>
                                    <small className={styles.muted}>{u.email}</small>
                                </div>
                                <button className={styles.btnMiniAdd} onClick={() => onAddUser(u.userId)}>
                                    + Thêm
                                </button>
                            </div>
                        ))}
                        {usersPool.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang nạp dữ liệu...</div>
                        )}
                        {usersPool.length > 0 && filteredUsers.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Không tìm thấy người dùng phù hợp.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
