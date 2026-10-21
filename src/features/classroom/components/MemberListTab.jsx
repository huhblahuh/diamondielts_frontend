import React, { useState } from 'react';
import Pagination from '../../../components/Pagination';

const PAGE_SIZE = 10;

const getInitials = (fullName = '') => {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    return words.length === 1
        ? words[0].slice(0, 2).toUpperCase()
        : `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const isStudentMember = (role) => !['teacher', 'admin'].includes(String(role || '').trim().toLowerCase());

export default function MemberListTab({ members = [], onRemoveUser, onViewDetails, onViewProfile, loading, formatDate, styles }) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paged = members.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <h4>Thành Viên Lớp Học</h4>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>Vai Trò</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan="4" style={{textAlign:'center'}}>Đang tải chi tiết...</td></tr>}
                        {!loading && paged.map((mem) => (
                            <tr key={mem.userId}>
                                <td>
                                    {isStudentMember(mem.role) ? (
                                        <button
                                            type="button"
                                            className={styles.memberProfileButton}
                                            onClick={() => onViewProfile(mem.userId, mem.fullName)}
                                            aria-label={`Xem hồ sơ học viên ${mem.fullName}`}
                                        >
                                            <span className={styles.memberAvatar} aria-hidden="true">
                                                <span>{getInitials(mem.fullName)}</span>
                                                {mem.avatarUrl && <img src={mem.avatarUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                                            </span>
                                            <span className={styles.memberProfileName}>{mem.fullName}</span>
                                        </button>
                                    ) : (
                                        <div className={styles.memberNameCell}>
                                            <span className={styles.memberAvatar} aria-hidden="true">
                                                <span>{getInitials(mem.fullName)}</span>
                                                {mem.avatarUrl && <img src={mem.avatarUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                                            </span>
                                            <span className={styles.userNameRed}>{mem.fullName}</span>
                                        </div>
                                    )}
                                </td>
                                <td className={styles.muted}>{mem.email}</td>
                                <td>
                                    {!isStudentMember(mem.role) ? (
                                        <span className={styles.userRoleBadge}>{mem.role}</span>
                                    ) : (
                                        <span>Học viên {mem.joinDate ? `(${formatDate(mem.joinDate)})` : ''}</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{display:'flex', gap:'0.5rem'}}>
                                        {isStudentMember(mem.role) ? (
                                            <button 
                                                className={styles.btnAction}
                                                onClick={() => onViewDetails(mem.userId, mem.fullName)}
                                            >
                                                Chi tiết
                                            </button>
                                        ) : (
                                            <button className={styles.btnAction} disabled style={{opacity: 0.5, cursor: 'not-allowed'}}>
                                                Chi tiết
                                            </button>
                                        )}
                                        <button 
                                            className={styles.btnActionDanger} 
                                            title="Gỡ khỏi lớp"
                                            onClick={() => onRemoveUser(mem.userId, mem.fullName)}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && members.length === 0 && (
                            <tr><td colSpan="4" style={{textAlign:'center', fontStyle:'italic'}}>Lớp chưa có thành viên nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
            />
        </div>
    );
}
