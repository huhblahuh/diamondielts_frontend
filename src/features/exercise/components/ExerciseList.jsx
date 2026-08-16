import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import styles from '../ExerciseManagement.module.css';
import Pagination from '../../../components/Pagination';

const PAGE_SIZE = 10;
const VALID_SKILLS = ['SPEAKING', 'LISTENING', 'READING', 'WRITING'];
const SPEAKING_TYPES = ['Part 1', 'Part 2', 'Part 3'];
const GENERAL_TYPES = [
    'Part 1', 'Part 2', 'Part 3', 'Part 4',
    'Task 1', 'Task 2',
    'Passage 1', 'Passage 2', 'Passage 3'
];

const escapeHtml = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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
    const getQuestionSnippet = (formattedContent) => {
        if (!formattedContent) return 'N/A';
        try {
            const parsed = JSON.parse(formattedContent);
            const rawText = parsed.passageHtml || parsed.question || parsed.textPrompt || '';
            const cleanText = rawText.replace(/<[^>]*>/g, '').trim();
            if (cleanText.length > 85) {
                return cleanText.substring(0, 85) + '...';
            }
            return cleanText || 'N/A';
        } catch (e) {
            const cleanText = formattedContent.replace(/<[^>]*>/g, '').trim();
            if (cleanText.length > 85) {
                return cleanText.substring(0, 85) + '...';
            }
            return cleanText || 'N/A';
        }
    };

    const handleDownloadTemplate = () => {
        window.open('https://diamondielts.blob.core.windows.net/public-asset/staticTemplate/IeltsAI_Exercise_Template.xlsx', '_blank');
    };

    const handleImportExcel = async () => {
        const { value: file } = await Swal.fire({
            title: '<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1.2rem; font-weight: 700; color: #0f172a;"><i class="bi bi-file-earmark-excel-fill" style="color: #10b981;"></i> Nhập đề bài từ Excel</div>',
            input: 'file',
            inputAttributes: {
                'accept': '.xlsx',
                'aria-label': 'Tải lên tệp Excel của bạn'
            },
            inputLabel: 'Chọn tệp tin Excel (.xlsx) từ máy tính:',
            html: `
                <div style="font-size: 0.85rem; color: #334155; margin-top: 0.75rem; text-align: left;">
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                            <div>
                                <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem; margin-bottom: 0.2rem;">
                                    <i class="bi bi-file-earmark-arrow-down-fill" style="color: #0284c7; margin-right: 6px;"></i>Chưa có tệp Excel mẫu?
                                </div>
                                <div style="font-size: 0.8rem; color: #475569;">Tải ngay mẫu chuẩn để điền dữ liệu chính xác.</div>
                            </div>
                            <button id="swal-download-template" type="button" style="background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; border: none; padding: 0.55rem 1.1rem; font-size: 0.82rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); transition: all 0.2s ease;">
                                <i class="bi bi-cloud-arrow-down-fill" style="font-size: 0.95rem;"></i> Tải Mẫu Excel
                            </button>
                        </div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem;">
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.88rem; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="bi bi-info-circle-fill" style="color: #6366f1;"></i> Quy tắc cấu trúc dữ liệu Excel:
                        </div>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.82rem;">
                            <div style="background: #ffffff; padding: 0.55rem 0.8rem; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 600; color: #334155;">Cột A (SkillType)</span>
                                <span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-family: monospace;">SPEAKING</span>
                            </div>
                            <div style="background: #ffffff; padding: 0.55rem 0.8rem; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 600; color: #334155;">Cột B (Type)</span>
                                <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 0.78rem;">Part 1 / Part 2 / Part 3</span>
                            </div>
                            <div style="background: #ffffff; padding: 0.55rem 0.8rem; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 600; color: #334155;">Cột C (QuestionContent)</span>
                                <span style="color: #64748b; font-style: italic;">Chi tiết câu hỏi / đề bài</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Tải lên & Nhập',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#94a3b8',
            didOpen: () => {
                const btn = document.getElementById('swal-download-template');
                if (btn) {
                    btn.addEventListener('click', handleDownloadTemplate);
                }
            },
            inputValidator: (value) => {
                if (!value) {
                    return 'Vui lòng chọn một tệp tin Excel!';
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
                Swal.fire('Thất bại', 'Không thể xử lý file. Vui lòng kiểm tra và thử lại.', 'error');
            }
        }
    };

    const handleImportScript = async () => {
        if (!topicId) {
            await Swal.fire('Chú ý', 'Vui lòng chọn chủ đề trước khi nhập script.', 'warning');
            return;
        }

        const defaultSample = JSON.stringify([
            {
                "SkillType": "SPEAKING",
                "Type": "Part 1",
                "QuestionContent": "Do you live in a house or an apartment?"
            },
            {
                "SkillType": "SPEAKING",
                "Type": "Part 2",
                "QuestionContent": "Describe a home you would like to live in."
            },
            {
                "SkillType": "SPEAKING",
                "Type": "Part 3",
                "QuestionContent": "Why are housing prices increasing in many cities?"
            }
        ], null, 2);

        const { value: scriptItems } = await Swal.fire({
            title: '<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1.2rem; font-weight: 700; color: #0f172a;"><i class="bi bi-code-square" style="color: #6366f1;"></i> Nhập câu hỏi từ JSON Script</div>',
            html: `
                <div style="text-align: left; margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: #475569;">Dán đoạn mã JSON bên dưới:</span>
                        <button id="btn-insert-sample" type="button" style="background: #e0e7ff; color: #4338ca; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                            <i class="bi bi-magic"></i> Chèn JSON Mẫu
                        </button>
                    </div>
                    <textarea id="swal-script-input" rows="10" spellcheck="false" style="width: 100%; box-sizing: border-box; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 0.82rem; padding: 0.75rem; border-radius: 8px; border: 1px solid #cbd5e1; background: #0f172a; color: #38bdf8; outline: none; line-height: 1.4;" placeholder='[\n  {\n    "SkillType": "SPEAKING",\n    "Type": "Part 1",\n    "QuestionContent": "Nội dung câu hỏi..."\n  }\n]'></textarea>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; font-size: 0.8rem; color: #475569;">
                        <div style="font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;"><i class="bi bi-exclamation-circle-fill" style="color: #6366f1;"></i> Quy tắc Validate Backend:</div>
                        <ul style="margin: 0; padding-left: 1.2rem; display: grid; gap: 0.2rem;">
                            <li><strong>SkillType:</strong> SPEAKING, LISTENING, READING, WRITING</li>
                            <li><strong>Speaking:</strong> Part 1, Part 2, Part 3</li>
                            <li><strong>Kỹ năng khác:</strong> Part 1–4, Task 1–2, Passage 1–3</li>
                            <li><strong>QuestionContent:</strong> Không được để trống</li>
                        </ul>
                    </div>
                </div>
            `,
            width: '650px',
            showCancelButton: true,
            confirmButtonText: 'Nhập dữ liệu',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            didOpen: () => {
                const sampleBtn = document.getElementById('btn-insert-sample');
                const textarea = document.getElementById('swal-script-input');
                if (sampleBtn && textarea) {
                    sampleBtn.addEventListener('click', () => {
                        textarea.value = defaultSample;
                    });
                }
            },
            preConfirm: () => {
                const input = document.getElementById('swal-script-input')?.value;
                if (!input || !input.trim()) {
                    Swal.showValidationMessage('Vui lòng nhập nội dung JSON Script!');
                    return false;
                }
                let parsed;
                try {
                    parsed = JSON.parse(input);
                } catch (e) {
                    Swal.showValidationMessage('Đoạn script không đúng cú pháp JSON! Kiểm tra lại dấu ngoặc, phẩy...');
                    return false;
                }

                if (!Array.isArray(parsed) || parsed.length === 0) {
                    Swal.showValidationMessage('Script JSON phải là một mảng (array) các câu hỏi!');
                    return false;
                }

                const normalizedItems = [];

                for (let i = 0; i < parsed.length; i++) {
                    const item = parsed[i];
                    if (!item || typeof item !== 'object' || Array.isArray(item)) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Dữ liệu phải là một object câu hỏi.`);
                        return false;
                    }

                    const skill = typeof item.SkillType === 'string'
                        ? item.SkillType.trim().toUpperCase()
                        : '';
                    const type = typeof item.Type === 'string'
                        ? item.Type.trim()
                        : '';
                    const question = typeof item.QuestionContent === 'string'
                        ? item.QuestionContent.trim()
                        : '';

                    if (!skill || !VALID_SKILLS.includes(skill)) {
                        Swal.showValidationMessage(`Mục #${i + 1}: SkillType '${item.SkillType || ''}' không hợp lệ. Hợp lệ: SPEAKING, LISTENING, READING, WRITING.`);
                        return false;
                    }

                    if (!type) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Thiếu trường Type (Part).`);
                        return false;
                    }

                    const validTypes = skill === 'SPEAKING' ? SPEAKING_TYPES : GENERAL_TYPES;
                    const normalizedType = validTypes.find(validType =>
                        validType.toLowerCase() === type.toLowerCase()
                    );
                    if (!normalizedType) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Type '${type}' không hợp lệ. Hợp lệ: ${validTypes.join(', ')}.`);
                        return false;
                    }

                    if (!question) {
                        Swal.showValidationMessage(`Mục #${i + 1}: QuestionContent không được để trống.`);
                        return false;
                    }

                    normalizedItems.push({
                        skillType: skill,
                        type: normalizedType,
                        questionContent: question
                    });
                }

                return normalizedItems;
            }
        });

        if (scriptItems) {
            Swal.fire({
                title: 'Đang xử lý...',
                text: `Hệ thống đang tạo ${scriptItems.length} bài tập...`,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            let createdCount = 0;
            try {
                for (const item of scriptItems) {
                    await exerciseService.create({
                        skillType: item.skillType,
                        type: item.type,
                        topicId,
                        formattedContent: JSON.stringify({
                            passageHtml: `<p>${escapeHtml(item.questionContent)}</p>`,
                            blocks: []
                        })
                    });
                    createdCount++;
                }
                Swal.close();

                await Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: `Đã nhập thành công ${createdCount} bài tập từ script!`,
                    confirmButtonText: 'Đồng ý'
                });

                if (onRefresh) onRefresh();
            } catch (err) {
                console.error(err);
                Swal.close();
                let errorMessage = 'Không thể xử lý script. Vui lòng kiểm tra lại dữ liệu.';
                if (err.response?.data) {
                    const d = err.response.data;
                    if (typeof d === 'string') errorMessage = d;
                    else if (d.Message) errorMessage = d.Message;
                    else if (d.message) errorMessage = d.message;
                    else if (d.title) errorMessage = d.title;
                    else if (d.errors) errorMessage = Object.values(d.errors).flat().join('\n');
                } else if (err.message) {
                    errorMessage = err.message;
                }
                if (createdCount > 0) {
                    errorMessage = `Đã tạo ${createdCount}/${scriptItems.length} bài tập trước khi yêu cầu bị gián đoạn. ${errorMessage}`;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Nhập Script Thất Bại',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    // Filter exercises
    const filteredExercises = activeFilter === 'ALL'
        ? exercises
        : exercises.filter(ex => ex.skillType?.toUpperCase() === activeFilter);

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
                        onClick={handleImportScript}
                        style={{
                            background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
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
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <i className="bi bi-code-square"></i> Nhập bằng Script
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
                                    <td style={{ padding: '0.6rem 0.8rem', color: '#475569', maxWidth: '350px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={getQuestionSnippet(ex.formattedContent)}>
                                        {getQuestionSnippet(ex.formattedContent)}
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
