import React, { useState } from 'react';
import Pagination from '../../../components/Pagination';

const PAGE_SIZE = 10;

export default function MemberListTab({ members = [], onRemoveUser, onViewDetails, loading, formatDate, styles }) {
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
                                <td className={(mem.role === 'Teacher' || mem.role === 'Admin') ? styles.userNameRed : styles.boldText}>
                                    {mem.fullName}
                                </td>
                                <td className={styles.muted}>{mem.email}</td>
                                <td>
                                    {(mem.role === 'Teacher' || mem.role === 'Admin') ? (
                                        <span className={styles.userRoleBadge}>{mem.role}</span>
                                    ) : (
                                        <span>Học viên {mem.joinDate ? `(${formatDate(mem.joinDate)})` : ''}</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{display:'flex', gap:'0.5rem'}}>
                                        {mem.role !== 'Teacher' && mem.role !== 'Admin' ? (
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
