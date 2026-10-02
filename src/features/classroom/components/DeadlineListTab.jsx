import React, { useState } from 'react';
import Pagination from '../../../components/Pagination';
import { parseAssignmentDueDate } from '../../../utils/assignmentDate';

const PAGE_SIZE = 10;

export default function DeadlineListTab({ deadlines = [], onEditFolder, onDeleteDeadline, onViewSubmissions, formatDate, styles }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const now = Date.now();
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi');

    const visibleDeadlines = deadlines
        .filter((deadline) => (
            !normalizedSearch
            || deadline.title?.toLocaleLowerCase('vi').includes(normalizedSearch)
        ))
        .sort((first, second) => {
            const firstDueTime = parseAssignmentDueDate(first.dueDate)?.getTime();
            const secondDueTime = parseAssignmentDueDate(second.dueDate)?.getTime();
            const firstExpired = Number.isFinite(firstDueTime) && firstDueTime < now;
            const secondExpired = Number.isFinite(secondDueTime) && secondDueTime < now;

            if (firstExpired !== secondExpired) {
                return firstExpired ? 1 : -1;
            }

            const firstCreatedAt = new Date(first.createdAt).getTime() || 0;
            const secondCreatedAt = new Date(second.createdAt).getTime() || 0;
            return secondCreatedAt - firstCreatedAt;
        });
    const totalPages = Math.max(1, Math.ceil(visibleDeadlines.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paged = visibleDeadlines.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <h4>Deadlines &amp; Assignments</h4>
                <label className={styles.tableSearch}>
                    <i className="bi bi-search" aria-hidden="true"></i>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Tìm kiếm bài tập..."
                        aria-label="Tìm kiếm bài tập"
                    />
                </label>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tên Bài Tập</th>
                            <th>Hạn Nộp</th>
                            <th>Bài Con</th>
                            <th>Trạng Thái</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((dl) => {
                            const dueTime = parseAssignmentDueDate(dl.dueDate)?.getTime();
                            const isPastDeadline = Number.isFinite(dueTime) && dueTime < now;

                            return (
                                <tr
                                    key={dl.assignmentId}
                                    className={isPastDeadline ? styles.pastDeadlineRow : undefined}
                                >
                                <td className={styles.boldText}>
                                    <span 
                                        onClick={() => onEditFolder(dl)}
                                        style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}
                                    >
                                        {dl.title}
                                    </span>
                                </td>
                                <td>{formatDate(dl.dueDate, true)}</td>
                                <td><strong>{dl.itemCount}</strong> bài</td>
                                <td>
                                    {dl.isPublished ? (
                                        <span className={styles.badgeActive} style={{background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600}}>Đã Xuất Bản</span>
                                    ) : (
                                        <span className={styles.badgeActive} style={{background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600}}>Bản Nháp</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                        <button 
                                            className={styles.btnAction}
                                            onClick={() => onViewSubmissions && onViewSubmissions(dl.assignmentId)}
                                            title="Xem bài nộp của học sinh"
                                            style={{background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe'}}
                                        >
                                            <i className="bi bi-journal-check"></i> Bài nộp
                                        </button>
                                        <button 
                                            className={styles.btnAction}
                                            onClick={() => onEditFolder(dl)}
                                            title="Chỉnh sửa chi tiết"
                                        >
                                            <i className="bi bi-pencil-square"></i> Chi tiết
                                        </button>
                                        <button 
                                            className={styles.btnActionDanger}
                                            onClick={() => onDeleteDeadline(dl.assignmentId, dl.title)}
                                            title="Xóa bài tập này"
                                        >
                                            <i className="bi bi-trash3-fill"></i> Xóa
                                        </button>
                                    </div>
                                </td>
                                </tr>
                            );
                        })}
                        {visibleDeadlines.length === 0 && (
                            <tr>
                                <td colSpan="5" className={styles.emptyTableMessage}>
                                    {searchTerm.trim() ? 'Không tìm thấy bài tập phù hợp.' : 'Chưa có deadline nào được giao.'}
                                </td>
                            </tr>
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
