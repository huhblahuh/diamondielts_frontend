import React, { useEffect, useMemo, useState } from 'react';

const ROLE_FILTERS = [
    { value: 'All', label: 'Tất cả' },
    { value: 'Student', label: 'Học sinh' },
    { value: 'Teacher', label: 'Giáo viên' },
];

export default function AddMemberModal({ show, onClose, usersPool = [], loadingUsers = false, existingMembers = [], onAddUsers, styles }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (show) {
            setSearchTerm('');
            setRoleFilter('All');
            setSelectedIds(new Set());
            setSubmitting(false);
        }
    }, [show]);

    const availableUsers = useMemo(() => {
        const existingIds = new Set(existingMembers.map((member) => member.userId));
        return usersPool.filter((user) => !existingIds.has(user.userId));
    }, [usersPool, existingMembers]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi');
        return availableUsers.filter((user) => {
            const matchesRole = roleFilter === 'All' || user.role === roleFilter;
            const matchesSearch = !normalizedSearch
                || user.fullName?.toLocaleLowerCase('vi').includes(normalizedSearch)
                || user.email?.toLocaleLowerCase('vi').includes(normalizedSearch);
            return matchesRole && matchesSearch;
        });
    }, [availableUsers, roleFilter, searchTerm]);

    if (!show) return null;

    const visibleIds = filteredUsers.map((user) => user.userId);
    const allVisibleSelected = visibleIds.length > 0
        && visibleIds.every((userId) => selectedIds.has(userId));

    const toggleUser = (userId) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleAllVisible = () => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (allVisibleSelected) visibleIds.forEach((userId) => next.delete(userId));
            else visibleIds.forEach((userId) => next.add(userId));
            return next;
        });
    };

    const submitSelectedUsers = async () => {
        if (selectedIds.size === 0 || submitting) return;
        setSubmitting(true);
        try {
            const shouldClose = await onAddUsers([...selectedIds]);
            if (shouldClose !== false) onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        if (!submitting) onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={`${styles.modalContent} ${styles.addMemberModal}`} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h4><i className="bi bi-person-plus-fill" /> Thêm Thành Viên</h4>
                    <button type="button" className={styles.btnClose} onClick={closeModal} aria-label="Đóng" disabled={submitting}>&times;</button>
                </div>

                <div className={styles.modalBody}>
                    <p className={styles.modalSubtitle}>Chọn một hoặc nhiều học sinh, giáo viên rồi bấm “Thêm vào lớp”.</p>

                    <div className={styles.memberSearch}>
                        <i className="bi bi-search" />
                        <input
                            type="search"
                            placeholder="Tìm theo tên hoặc email..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className={styles.memberFilters} aria-label="Lọc thành viên theo vai trò">
                        {ROLE_FILTERS.map((filter) => (
                            <button
                                type="button"
                                key={filter.value}
                                className={roleFilter === filter.value ? styles.memberFilterActive : ''}
                                onClick={() => setRoleFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.memberSelectionBar}>
                        <label className={styles.selectAllLabel}>
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleAllVisible}
                                disabled={loadingUsers || visibleIds.length === 0}
                            />
                            <span>Chọn tất cả đang hiển thị</span>
                        </label>
                        <span>{selectedIds.size} đã chọn</span>
                    </div>

                    <div className={styles.userListScroll}>
                        {filteredUsers.map((user) => {
                            const selected = selectedIds.has(user.userId);
                            return (
                                <label key={user.userId} className={`${styles.userItem} ${selected ? styles.userItemSelected : ''}`}>
                                    <input
                                        className={styles.memberCheckbox}
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleUser(user.userId)}
                                    />
                                    <span className={styles.memberAvatar} aria-hidden="true">
                                        {user.fullName?.trim()?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                    <span className={styles.memberIdentity}>
                                        <span className={styles.boldText}>{user.fullName}</span>
                                        <small className={styles.muted}>{user.email}</small>
                                    </span>
                                    <span className={`${styles.userRoleBadge} ${user.role === 'Student' ? styles.studentRoleBadge : styles.teacherRoleBadge}`}>
                                        {user.role === 'Student' ? 'Học sinh' : user.role === 'Teacher' ? 'Giáo viên' : user.role}
                                    </span>
                                </label>
                            );
                        })}

                        {loadingUsers && (
                            <div className={styles.memberEmptyState}><i className="bi bi-arrow-repeat" /> Đang nạp dữ liệu...</div>
                        )}
                        {!loadingUsers && usersPool.length === 0 && (
                            <div className={styles.memberEmptyState}>Không còn thành viên nào để thêm.</div>
                        )}
                        {!loadingUsers && usersPool.length > 0 && filteredUsers.length === 0 && (
                            <div className={styles.memberEmptyState}>Không tìm thấy thành viên phù hợp.</div>
                        )}
                    </div>
                </div>

                <div className={styles.memberModalFooter}>
                    <span>{selectedIds.size > 0 ? `Đã chọn ${selectedIds.size} thành viên` : 'Chưa chọn thành viên'}</span>
                    <div>
                        <button type="button" className={styles.btnMemberCancel} onClick={closeModal} disabled={submitting}>Hủy</button>
                        <button
                            type="button"
                            className={styles.btnMemberSubmit}
                            onClick={submitSelectedUsers}
                            disabled={selectedIds.size === 0 || submitting}
                        >
                            {submitting ? <><i className={`bi bi-arrow-repeat ${styles.memberSubmitSpinner}`} /> Đang thêm...</> : <><i className="bi bi-person-plus-fill" /> Thêm vào lớp</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
