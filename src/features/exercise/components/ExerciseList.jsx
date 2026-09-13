import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import styles from '../ExerciseManagement.module.css';
import Pagination from '../../../components/Pagination';
import { normalizeSpeakingContent } from '../../../utils/speakingContent';

const PAGE_SIZE = 10;
const SPEAKING_TYPES = ['Part 1', 'Part 2', 'Part 3'];

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
    const [activeFilter, setActiveFilter] = useState('SPEAKING');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Parse content JSON to get a clean snippet of the question/passage
    const getQuestionSnippet = (content) => {
        const question = normalizeSpeakingContent(content).question;
        return question.length > 85 ? `${question.substring(0, 85)}...` : question || 'N/A';
    };

    const handleDownloadTemplate = () => {
        window.open('/api/teacher/exercise/import-excel/template', '_blank');
    };

    const handleImportExcel = async () => {
        const { value: file } = await Swal.fire({
            title: '<div class="exercise-dialog-title exercise-dialog-title--excel"><i class="bi bi-file-earmark-excel-fill"></i> Nhập đề bài từ Excel</div>',
            input: 'file',
            inputAttributes: {
                'accept': '.xlsx',
                'aria-label': 'Tải lên tệp Excel của bạn'
            },
            inputLabel: 'Chọn tệp tin Excel (.xlsx) từ máy tính:',
            html: `
                <div class="exercise-import-content">
                    <div class="exercise-template-card">
                        <div class="exercise-template-row">
                            <div>
                                <div class="exercise-template-title">
                                    <i class="bi bi-file-earmark-arrow-down-fill"></i>Chưa có tệp Excel mẫu?
                                </div>
                                <div class="exercise-template-copy">Tải ngay mẫu chuẩn để điền dữ liệu chính xác.</div>
                            </div>
                            <button id="swal-download-template" type="button" class="exercise-template-button">
                                <i class="bi bi-cloud-arrow-down-fill"></i> Tải Mẫu Excel
                            </button>
                        </div>
                    </div>

                    <div class="exercise-rules-card">
                        <div class="exercise-rules-title">
                            <i class="bi bi-info-circle-fill"></i> Quy tắc cấu trúc dữ liệu Excel:
                        </div>
                        <div class="exercise-rules-list">
                            <div class="exercise-rule-row">
                                <span>Cột A (Type)</span>
                                <code>Part 1 / Part 2 / Part 3</code>
                            </div>
                            <div class="exercise-rule-row">
                                <span>Cột B (Question)</span>
                                <em>Câu hỏi Speaking</em>
                            </div>
                            <div class="exercise-rule-row">
                                <span>Cột C (Suggestions)</span>
                                <em>Mỗi gợi ý một dòng</em>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            customClass: { popup: styles.importDialog },
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
                "Type": "Part 1",
                "Question": "Do you live in a house or an apartment?",
                "Suggestions": []
            },
            {
                "Type": "Part 2",
                "Question": "Describe a home you would like to live in.",
                "Suggestions": ["Where it is", "What it looks like"]
            },
            {
                "Type": "Part 3",
                "Question": "Why are housing prices increasing in many cities?",
                "Suggestions": []
            }
        ], null, 2);

        const { value: scriptItems } = await Swal.fire({
            title: '<div class="exercise-dialog-title exercise-dialog-title--script"><i class="bi bi-code-square"></i> Nhập câu hỏi từ JSON Script</div>',
            html: `
                <div class="exercise-script-content">
                    <div class="exercise-script-toolbar">
                        <span>Dán đoạn mã JSON bên dưới:</span>
                        <button id="btn-insert-sample" type="button">
                            <i class="bi bi-magic"></i> Chèn JSON Mẫu
                        </button>
                    </div>
                    <textarea id="swal-script-input" rows="10" spellcheck="false" placeholder='[{ "Type": "Part 2", "Question": "...", "Suggestions": ["..."] }]'></textarea>
                    
                    <div class="exercise-script-rules">
                        <div><i class="bi bi-exclamation-circle-fill"></i> Quy tắc Validate Backend:</div>
                        <ul>
                            <li><strong>Speaking:</strong> Part 1, Part 2, Part 3</li>
                            <li><strong>Question:</strong> Không được để trống</li>
                            <li><strong>Suggestions:</strong> Mảng chuỗi, chỉ dùng cho Part 2</li>
                        </ul>
                    </div>
                </div>
            `,
            customClass: { popup: styles.scriptDialog },
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

                    const type = typeof item.Type === 'string'
                        ? item.Type.trim()
                        : '';
                    const question = typeof item.Question === 'string'
                        ? item.Question.trim()
                        : '';
                    const suggestions = Array.isArray(item.Suggestions)
                        ? item.Suggestions.map(value => String(value).trim()).filter(Boolean)
                        : [];

                    if (!type) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Thiếu trường Type (Part).`);
                        return false;
                    }

                    const normalizedType = SPEAKING_TYPES.find(validType =>
                        validType.toLowerCase() === type.toLowerCase()
                    );
                    if (!normalizedType) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Type '${type}' không hợp lệ. Hợp lệ: ${SPEAKING_TYPES.join(', ')}.`);
                        return false;
                    }

                    if (!question) {
                        Swal.showValidationMessage(`Mục #${i + 1}: Question không được để trống.`);
                        return false;
                    }

                    normalizedItems.push({
                        skillType: 'SPEAKING',
                        type: normalizedType,
                        question,
                        suggestions
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
                        content: { question: item.question, suggestions: item.type === 'Part 2' ? item.suggestions : [] }
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
                if (err.message) {
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
    const filteredExercises = exercises;

    const totalPages = Math.max(1, Math.ceil(filteredExercises.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedExercises = filteredExercises.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const filters = [
        { key: 'SPEAKING', label: 'Speaking', icon: 'bi-mic-fill' }
    ];

    return (
        <div className={styles.listPanel}>
            <div className={styles.listHeader}>
                <div>
                    <h4 className={styles.listTitle}>
                        <i className="bi bi-journal-text"></i>
                        Ngân Hàng Đề Đã Có ({exercises.length})
                    </h4>
                    <p className={styles.listSubtitle}>
                        Chủ đề: <strong>{topicName}</strong>
                    </p>
                </div>

                <div className={styles.listActions}>
                    <button onClick={onAdd} className={`${styles.toolbarBtn} ${styles.primaryToolbarBtn}`}>
                        <i className="bi bi-plus-lg"></i> Thêm Đề Mới
                    </button>
                    <button onClick={handleImportScript} className={`${styles.toolbarBtn} ${styles.scriptToolbarBtn}`}>
                        <i className="bi bi-code-square"></i> Nhập bằng Script
                    </button>
                    <button onClick={handleImportExcel} className={`${styles.toolbarBtn} ${styles.excelToolbarBtn}`}>
                        <i className="bi bi-file-earmark-arrow-up"></i> Nhập Excel
                    </button>
                    <button onClick={handleDownloadTemplate} className={`${styles.toolbarBtn} ${styles.secondaryToolbarBtn}`}>
                        <i className="bi bi-download"></i> Tải File Mẫu
                    </button>
                </div>
            </div>
            <div className={styles.filterBar}>
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        className={`${styles.filterBtn} ${activeFilter === f.key ? styles.filterBtnActive : ''}`}
                        aria-pressed={activeFilter === f.key}
                    >
                        {f.icon && <i className={`bi ${f.icon}`}></i>}
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Exercises Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.styledTable}>
                    <thead>
                        <tr>
                            <th className={styles.idColumn}>Mã</th>
                            <th className={styles.skillColumn}>Kỹ năng</th>
                            <th className={styles.typeColumn}>Dạng đề</th>
                            <th>Nội dung câu hỏi / Đề bài</th>
                            <th className={styles.actionColumn}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className={styles.tableState}>
                                    <span className={styles.stateSpinner}></span> Đang đồng bộ kho đề bài...
                                </td>
                            </tr>
                        ) : pagedExercises.length === 0 ? (
                            <tr>
                                <td colSpan="5" className={`${styles.tableState} ${styles.emptyTableState}`}>
                                    <i className="bi bi-inbox"></i> Không tìm thấy bài tập nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            pagedExercises.map(ex => (
                                <tr key={ex.exerciseId}>
                                    <td className={styles.exerciseId}>#{ex.exerciseId}</td>
                                    <td>
                                        <span className={`${styles.skillBadge} ${ex.skillType?.toUpperCase() === 'SPEAKING' ? styles.badgeSPEAKING : ''}`}>
                                            {ex.skillType}
                                        </span>
                                    </td>
                                    <td>
                                        <strong className={styles.exerciseType}>{ex.type}</strong>
                                    </td>
                                    <td className={styles.exerciseSnippet} title={getQuestionSnippet(ex.content)}>
                                        {getQuestionSnippet(ex.content)}
                                    </td>
                                    <td className={styles.actionCell}>
                                        <div className={styles.rowActions}>
                                            <button
                                                onClick={() => onEdit && onEdit(ex)}
                                                className={`${styles.rowActionBtn} ${styles.editBtn}`}
                                            >
                                                <i className="bi bi-pencil"></i> Sửa
                                            </button>
                                            <button
                                                onClick={() => onDelete && onDelete(ex.exerciseId)}
                                                className={`${styles.rowActionBtn} ${styles.deleteBtn}`}
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
