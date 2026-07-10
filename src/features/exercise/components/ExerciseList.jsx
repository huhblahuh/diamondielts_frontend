import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import styles from '../ExerciseManagement.module.css';
import Pagination from '../../../components/Pagination';

const PAGE_SIZE = 10;

export default function ExerciseList({
    exercises = [],
    loading,
    topicName,
    onAdd,
    onEdit,
    onDelete,
    topicId,
    onRefresh
}) {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Parse content JSON to get a clean snippet of the question/passage
    const getQuestionSnippet = (contentJson) => {
        if (!contentJson) return 'N/A';
        try {
            const parsed = JSON.parse(contentJson);
            const rawText = parsed.passageHtml || parsed.question || parsed.textPrompt || '';
            const cleanText = rawText.replace(/<[^>]*>/g, '').trim();
            if (cleanText.length > 85) {
                return cleanText.substring(0, 85) + '...';
            }
            return cleanText || 'N/A';
        } catch (e) {
            const cleanText = contentJson.replace(/<[^>]*>/g, '').trim();
            if (cleanText.length > 85) {
                return cleanText.substring(0, 85) + '...';
            }
            return cleanText || 'N/A';
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await exerciseService.downloadTemplate();
            const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'IeltsAI_Exercise_Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error(err);
            Swal.fire('Thất bại', 'Không thể tải file mẫu.', 'error');
        }
    };

    const handleImportExcel = async () => {
        const { value: file } = await Swal.fire({
            title: '📥 Nhập đề bài từ Excel',
            input: 'file',
            inputAttributes: {
                'accept': '.xlsx',
                'aria-label': 'Tải lên tệp Excel của bạn'
            },
            inputLabel: 'Chọn file Excel (.xlsx)',
            html: `
                <div style="font-size: 0.85rem; color: #334155; margin-top: 0.5rem; text-align: left;">
                    <div style="margin-bottom: 1rem; text-align: center;">
                        <button id="swal-download-template" type="button" class="swal2-confirm swal2-styled" style="background-color: #4f46e5; margin: 0; padding: 0.5rem 1rem; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; border: none;">
                            <i class="bi bi-cloud-arrow-down-fill"></i> Tải Excel Mẫu tại đây
                        </button>
                    </div>
                    <p style="margin-bottom: 0.35rem; font-weight: 600; color: #1e293b;">Quy tắc điền nội dung trong file:</p>
                    <ul style="padding-left: 1.2rem; margin: 0 0 0.75rem 0; line-height: 1.45;">
                        <li><strong>Cột A (SkillType):</strong> Nhập tên kỹ năng bằng chữ in hoa (Ví dụ: <code style="background:#f1f5f9; padding:2px 4px; border-radius:4px; color:#ef4444; font-weight:bold;">SPEAKING</code>).</li>
                        <li><strong>Cột B (Type):</strong> Nhập dạng bài tương ứng (Ví dụ: <code style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">Part 1</code>, <code style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">Part 2</code>, hoặc <code style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">Part 3</code>).</li>
                        <li><strong>Cột C (QuestionContent):</strong> Nhập nội dung chi tiết của câu hỏi/prompt tự luyện.</li>
                    </ul>
                    <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-style: italic; border-left: 3px solid #e2e8f0; padding-left: 0.5rem;">* Lưu ý: Tệp Excel phải bỏ qua dòng đầu tiên chứa tiêu đề cột (Header row) khi bắt đầu đọc dữ liệu.</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Tải lên & Nhập',
            cancelButtonText: 'Hủy',
            didOpen: () => {
                const btn = document.getElementById('swal-download-template');
                if (btn) {
                    btn.addEventListener('click', handleDownloadTemplate);
                }
            },
            inputValidator: (value) => {
                if (!value) {
                    return 'Vui lòng chọn một tệp tin!';
                }
            }
        });

        if (file) {
            Swal.fire({
                title: 'Đang xử lý...',
                text: 'Hệ thống đang nhập dữ liệu đề bài, vui lòng chờ...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('topicId', topicId);

                const response = await exerciseService.importExcel(formData);
                Swal.close();

                await Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: response.Message || 'Đã nhập thành công bài tập tự luyện!',
                    confirmButtonText: 'Đồng ý'
                });

                if (onRefresh) onRefresh();
            } catch (err) {
                console.error(err);
                Swal.close();
                Swal.fire('Thất bại', err.response?.data || 'Không thể tải file lên hoặc phân tích cú pháp Excel.', 'error');
            }
        }
    };

    // Filter exercises
    const filteredExercises = activeFilter === 'ALL'
        ? exercises
        : exercises.filter(ex => ex.skillType?.toUpperCase() === activeFilter);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredExercises.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedExercises = filteredExercises.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Style helper for Skill Badges
    const getSkillBadgeStyle = (skillType) => {
        switch (skillType?.toUpperCase()) {
            case 'SPEAKING':
                return { backgroundColor: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 };
            case 'READING':
                return { backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 };
            case 'LISTENING':
                return { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 };
            case 'WRITING':
                return { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 };
            default:
                return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 };
        }
    };

    const filters = [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'SPEAKING', label: 'Speaking', icon: 'bi-mic-fill' },
        { key: 'READING', label: 'Reading', icon: 'bi-book-fill' },
        { key: 'LISTENING', label: 'Listening', icon: 'bi-headphones' },
        { key: 'WRITING', label: 'Writing', icon: 'bi-pencil-square' }
    ];

    return (
        <div className={styles.listPanel} style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="bi bi-journal-text" style={{ color: '#6366f1' }}></i>
                        Ngân Hàng Đề Đã Có ({exercises.length})
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        Chủ đề: <strong>{topicName}</strong>
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={onAdd}
                        style={{
                            background: 'linear-gradient(to right, #4f46e5, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <i className="bi bi-plus-lg"></i> Thêm Đề Mới
                    </button>
                    <button
                        onClick={handleImportExcel}
                        style={{
                            background: 'linear-gradient(to right, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <i className="bi bi-file-earmark-arrow-up"></i> Nhập Excel
                    </button>
                    <button
                        onClick={handleDownloadTemplate}
                        style={{
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    >
                        <i className="bi bi-download"></i> Tải File Mẫu
                    </button>
                </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid',
                            borderColor: activeFilter === f.key ? '#6366f1' : '#e2e8f0',
                            backgroundColor: activeFilter === f.key ? '#e0e7ff' : '#f8fafc',
                            color: activeFilter === f.key ? '#4f46e5' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {f.icon && <i className={`bi ${f.icon}`} style={{ fontSize: '0.85rem' }}></i>}
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Exercises Table */}
            <div className={styles.tableWrapper} style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '1rem' }}>
                <table className={styles.styledTable} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ width: '70px', padding: '0.75rem 0.8rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Mã</th>
                            <th style={{ width: '110px', padding: '0.75rem 0.8rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Kỹ năng</th>
                            <th style={{ width: '120px', padding: '0.75rem 0.8rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Dạng đề</th>
                            <th style={{ padding: '0.75rem 0.8rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Nội dung câu hỏi / Đề bài</th>
                            <th style={{ width: '150px', padding: '0.75rem 0.8rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    Đang đồng bộ kho đề bài...
                                </td>
                            </tr>
                        ) : pagedExercises.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Không tìm thấy bài tập nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            pagedExercises.map(ex => (
                                <tr key={ex.exerciseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: '#64748b' }}>#{ex.exerciseId}</td>
                                    <td style={{ padding: '0.6rem 0.8rem' }}>
                                        <span style={getSkillBadgeStyle(ex.skillType)}>
                                            {ex.skillType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.8rem' }}>
                                        <strong style={{ color: '#334155', fontSize: '0.85rem' }}>{ex.type}</strong>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.8rem', color: '#475569', maxWidth: '350px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={getQuestionSnippet(ex.contentJson)}>
                                        {getQuestionSnippet(ex.contentJson)}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => onEdit && onEdit(ex)}
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    padding: '0.35rem 0.7rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem'
                                                }}
                                            >
                                                <i className="bi bi-pencil"></i> Sửa
                                            </button>
                                            <button
                                                onClick={() => onDelete && onDelete(ex.exerciseId)}
                                                style={{
                                                    backgroundColor: '#fef2f2',
                                                    color: '#ef4444',
                                                    border: '1px solid #fee2e2',
                                                    padding: '0.35rem 0.7rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                            >
                                                <i className="bi bi-trash"></i> Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
