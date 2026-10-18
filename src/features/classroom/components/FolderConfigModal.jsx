import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import axiosClient from '../../../api/axiosClient';
import assignmentService from '../../../api/services/assignment.service';
import SpotTaskCreator from './SpotTaskCreator';
import ExerciseSelector from './ExerciseSelector';
import DeadlineReminderModal from './DeadlineReminderModal';
import { normalizeSpeakingContent } from '../../../utils/speakingContent';
import { toAssignmentDateTimeLocal } from '../../../utils/assignmentDate';

const parseItemContent = (content) => content && typeof content === 'object' ? content : {};

const getItemPrompt = (content) => {
    const candidates = [
        content.description,
        content.question,
        content.title
    ];

    return candidates.find(value => typeof value === 'string' && value.trim()) || '';
};

const toDateTimeLocalValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatReminderTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function FolderConfigModal({ show, onClose, assignmentId, classId, oldExercises = [], onSaved, styles }) {
    const [folderTitle, setFolderTitle] = useState('');
    const [folderDueDate, setFolderDueDate] = useState('');
    const [folderDescription, setFolderDescription] = useState('');
    const [folderAllowLate, setFolderAllowLate] = useState(false);
    const [folderIsPublished, setFolderIsPublished] = useState(false);
    const [folderReminderAt, setFolderReminderAt] = useState('');
    const [folderReminderProcessedAt, setFolderReminderProcessedAt] = useState('');
    const [reminderDirty, setReminderDirty] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [folderItems, setFolderItems] = useState([]);
    const [expandedItemId, setExpandedItemId] = useState(null);

    const [showInlineCreator, setShowInlineCreator] = useState(false);
    const [showOldSelector, setShowOldSelector] = useState(false);
    const [isCreatorDirty, setIsCreatorDirty] = useState(false);
    const [loading, setLoading] = useState(false);

    const creatorRef = React.useRef(null);

    useEffect(() => {
        if (!show) return;

        const initModal = async () => {
            if (assignmentId) {
                try {
                    setLoading(true);
                    const assignData = await axiosClient.get(`/teacher/assignment/${assignmentId}`);
                    if (!assignData) {
                        Swal.fire('Lỗi', 'Không tải được chi tiết deadline.', 'error');
                        onClose();
                        return;
                    }

                    setFolderTitle(assignData.title || '');
                    setFolderDescription(assignData.description || '');
                    setFolderAllowLate(assignData.allowLateSubmission || false);
                    setFolderIsPublished(assignData.isPublished || false);
                    setFolderReminderAt(toDateTimeLocalValue(assignData.reminderAt));
                    setFolderReminderProcessedAt(assignData.reminderProcessedAt || '');
                    setReminderDirty(false);
                    setShowReminderModal(false);

                    setFolderDueDate(toAssignmentDateTimeLocal(assignData.dueDate));

                    const mappedItems = (assignData.items || []).map(item => {
                        let label = `Item #${item.itemId}`;
                        if (item.exerciseId) {
                            const ex = (oldExercises || []).find(e => e.exerciseId === item.exerciseId);
                            const isSpeaking = ex
                                ? (ex.skillType || '').toLowerCase() === 'speaking'
                                : (item.itemType || '').toLowerCase() === 'speaking';

                            let prefix = '📝';
                            if (isSpeaking) prefix = '🗣️';
                            else if (ex && (ex.skillType || '').toLowerCase() === 'writing') prefix = '✍️';
                            else if (ex && (ex.skillType || '').toLowerCase() === 'reading') prefix = '📖';
                            else if (ex && (ex.skillType || '').toLowerCase() === 'listening') prefix = '🎧';

                            const attemptsSuffix = (isSpeaking && item.maxAttempts)
                                ? ` (Tối đa ${item.maxAttempts} lần)`
                                : '';

                            label = ex
                                ? `${prefix} [Ngân hàng] ${ex.type || 'Custom'} - ${ex.skillType}${attemptsSuffix}`
                                : `[Bài tập cũ #${item.exerciseId}]${attemptsSuffix}`;
                        } else if (item.itemType === 'AI_SPEAKING' || item.itemType === 'SPEAKING') {
                            const parsed = normalizeSpeakingContent(item.content);
                            label = `🗣️ [Tự do] ${item.type || 'Part 1'} - ${parsed.question.substring(0, 30)}...${item.maxAttempts ? ` (Tối đa ${item.maxAttempts} lần)` : ''}`;
                        } else if (item.itemType === 'fileSubmission') {
                            label = `📁 [Nộp File] ${(item.content?.description || '').substring(0, 30)}... (${item.payloads?.length || 0} files)`;
                        }
                        return {
                            id: Date.now() + Math.random(),
                            dbId: item.itemId,
                            exerciseId: item.exerciseId,
                            itemType: item.itemType,
                            type: item.type || '',
                            content: item.content || {},
                            maxAttempts: item.maxAttempts,
                            payloads: item.payloads || [],
                            _displayLabel: label
                        };
                    });
                    setFolderItems(mappedItems);
                    setExpandedItemId(null);
                } catch (err) {
                    console.error("Error loading assignment details:", err);
                    Swal.fire('Lỗi', 'Không thể tải chi tiết deadline.', 'error');
                    onClose();
                } finally {
                    setLoading(false);
                }
            } else {
                setFolderTitle('');
                setFolderDescription('');
                setFolderAllowLate(false);
                setFolderIsPublished(false);
                setFolderReminderAt('');
                setFolderReminderProcessedAt('');
                setReminderDirty(false);
                setShowReminderModal(false);
                setFolderItems([]);
                setExpandedItemId(null);

                const d = new Date();
                d.setDate(d.getDate() + 7);
                d.setHours(23, 59, 0, 0);
                const pad = (num) => String(num).padStart(2, '0');
                const defaultDueDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                setFolderDueDate(defaultDueDate);
            }
            setShowInlineCreator(false);
            setShowOldSelector(false);
        };

        initModal();
    }, [show, assignmentId, oldExercises]);

    if (!show) return null;

    const handleSelectOldTasks = (selectedList) => {
        const newItemsList = [];
        let duplicateCount = 0;

        selectedList.forEach(({ ex, maxAttempts }) => {
            const isAlreadyAdded = folderItems.some(i => i.exerciseId === ex.exerciseId);
            if (isAlreadyAdded) {
                duplicateCount++;
                return;
            }

            const isSpeaking = (ex.skillType || '').toLowerCase() === 'speaking';
            let prefix = '📝';
            if (isSpeaking) prefix = '🗣️';
            else if ((ex.skillType || '').toLowerCase() === 'writing') prefix = '✍️';
            else if ((ex.skillType || '').toLowerCase() === 'reading') prefix = '📖';
            else if ((ex.skillType || '').toLowerCase() === 'listening') prefix = '🎧';

            const attemptsSuffix = (isSpeaking && maxAttempts)
                ? ` (Tối đa ${maxAttempts} lần)`
                : '';

            newItemsList.push({
                id: Date.now() + Math.random() + newItemsList.length,
                exerciseId: ex.exerciseId,
                itemType: ex.skillType,
                type: ex.type,
                content: ex.content,
                maxAttempts: isSpeaking ? maxAttempts : null,
                _displayLabel: `${prefix} [Ngân hàng] ${ex.type || 'Custom'} - ${ex.skillType}${attemptsSuffix}`
            });
        });

        if (newItemsList.length > 0) {
            setFolderItems(prev => [...prev, ...newItemsList]);
        }

        if (duplicateCount > 0) {
            Swal.fire({
                icon: 'info',
                title: 'Thông báo',
                text: `Đã bỏ qua ${duplicateCount} bài tập đã tồn tại trong thư mục.`,
                timer: 2000,
                showConfirmButton: false
            });
        }

        setShowOldSelector(false);
    };

    const handleAddTask = (newItem) => {
        setFolderItems([...folderItems, newItem]);
    };

    const handleRemoveItem = (localId) => {
        setFolderItems(prev => prev.filter(i => i.id !== localId));
        setExpandedItemId(prev => prev === localId ? null : prev);
    };

    const handleDeadlineReminder = () => {
        if (!folderDueDate) {
            Swal.fire('Chú ý', 'Vui lòng chọn hạn nộp bài trước.', 'warning');
            return;
        }
        setShowReminderModal(true);
    };

    const handleImportScript = async () => {
        const defaultSample = JSON.stringify([
            {
                Type: 'Part 1',
                Question: 'Do you live in a house or an apartment?',
                Suggestions: [],
                MaxAttempts: 3
            },
            {
                Type: 'Part 2',
                Question: 'Describe a place where you would like to live.',
                Suggestions: ['Where it is', 'What it looks like'],
                MaxAttempts: 2
            }
        ], null, 2);

        const { value: importedItems } = await Swal.fire({
            title: '<div style="display:flex;align-items:center;justify-content:center;gap:.5rem;font-size:1.2rem;font-weight:700;color:#101d54"><i class="bi bi-code-square" style="color:#1b2d75"></i> Nhập bài tập bằng Script</div>',
            html: `
                <div style="text-align:left;margin-top:.5rem">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.5rem">
                        <span style="font-size:.85rem;font-weight:600;color:#475569">Dán mảng JSON bài tập bên dưới:</span>
                        <button id="folder-script-sample" type="button" style="background:#f6e6b8;color:#101d54;border:0;padding:.35rem .75rem;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer;white-space:nowrap">
                            <i class="bi bi-magic"></i> Chèn JSON mẫu
                        </button>
                    </div>
                    <textarea id="folder-script-input" rows="13" spellcheck="false" style="width:100%;box-sizing:border-box;font-family:Consolas,Monaco,'Courier New',monospace;font-size:.82rem;padding:.75rem;border-radius:8px;border:1px solid #cbd5e1;background:#101d54;color:#2a3f94;outline:none;line-height:1.45" placeholder='[{ "Type": "Part 2", "Question": "...", "Suggestions": ["..."], "MaxAttempts": 3 }]'></textarea>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.75rem;margin-top:.75rem;font-size:.8rem;color:#475569">
                        <div style="font-weight:700;color:#1e293b;margin-bottom:.35rem"><i class="bi bi-info-circle-fill" style="color:#1b2d75"></i> Cấu trúc hỗ trợ</div>
                        <ul style="margin:0;padding-left:1.2rem;display:grid;gap:.2rem">
                            <li><strong>Type:</strong> Part 1, Part 2 hoặc Part 3</li>
                            <li><strong>Question:</strong> nội dung đề bài, không được trống</li>
                            <li><strong>Suggestions:</strong> mảng chuỗi dành cho Part 2</li>
                            <li><strong>MaxAttempts:</strong> số lượt nộp tối đa, mặc định là 3</li>
                        </ul>
                    </div>
                </div>
            `,
            width: '680px',
            showCancelButton: true,
            confirmButtonText: 'Thêm vào thư mục',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#1b2d75',
            cancelButtonColor: '#94a3b8',
            didOpen: () => {
                const sampleButton = document.getElementById('folder-script-sample');
                const textarea = document.getElementById('folder-script-input');
                sampleButton?.addEventListener('click', () => {
                    textarea.value = defaultSample;
                    textarea.focus();
                });
            },
            preConfirm: () => {
                const input = document.getElementById('folder-script-input')?.value?.trim();
                if (!input) {
                    Swal.showValidationMessage('Vui lòng nhập nội dung JSON Script.');
                    return false;
                }

                let parsed;
                try {
                    parsed = JSON.parse(input);
                } catch {
                    Swal.showValidationMessage('Script không đúng cú pháp JSON. Hãy kiểm tra dấu ngoặc và dấu phẩy.');
                    return false;
                }

                if (!Array.isArray(parsed) || parsed.length === 0) {
                    Swal.showValidationMessage('Script phải là một mảng JSON có ít nhất một bài tập.');
                    return false;
                }

                if (parsed.length > 100) {
                    Swal.showValidationMessage('Mỗi lần chỉ được nhập tối đa 100 bài tập.');
                    return false;
                }

                const normalized = [];
                const validParts = ['Part 1', 'Part 2', 'Part 3'];

                for (let index = 0; index < parsed.length; index++) {
                    const item = parsed[index];
                    if (!item || typeof item !== 'object' || Array.isArray(item)) {
                        Swal.showValidationMessage(`Mục #${index + 1}: dữ liệu phải là một object.`);
                        return false;
                    }

                    const rawType = String(item.Type ?? item.type ?? '').trim();
                    const question = String(item.Question ?? item.question ?? '').trim();
                    const suggestions = Array.isArray(item.Suggestions ?? item.suggestions)
                        ? (item.Suggestions ?? item.suggestions).map(value => String(value).trim()).filter(Boolean)
                        : [];
                    const normalizedPart = validParts.find(part => part.toLowerCase() === rawType.toLowerCase());
                    const rawMaxAttempts = item.MaxAttempts ?? item.maxAttempts ?? 3;
                    const maxAttempts = Number(rawMaxAttempts);

                    if (!normalizedPart) {
                        Swal.showValidationMessage(`Mục #${index + 1}: Type phải là Part 1, Part 2 hoặc Part 3.`);
                        return false;
                    }
                    if (!question) {
                        Swal.showValidationMessage(`Mục #${index + 1}: Question không được để trống.`);
                        return false;
                    }
                    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
                        Swal.showValidationMessage(`Mục #${index + 1}: MaxAttempts phải là số nguyên lớn hơn hoặc bằng 1.`);
                        return false;
                    }

                    normalized.push({
                        id: Date.now() + Math.random() + index,
                        exerciseId: null,
                        itemType: 'SPEAKING',
                        type: normalizedPart,
                        content: { question, suggestions: normalizedPart === 'Part 2' ? suggestions : [] },
                        maxAttempts,
                        payloads: [],
                        _displayLabel: `[Speaking] ${normalizedPart} - ${question.substring(0, 30)}${question.length > 30 ? '...' : ''} (Tối đa ${maxAttempts} lần)`
                    });
                }

                return normalized;
            }
        });

        if (!importedItems) return;

        setFolderItems(prev => [...prev, ...importedItems]);
        await Swal.fire({
            icon: 'success',
            title: 'Đã thêm bài tập',
            text: `Đã thêm ${importedItems.length} bài tập từ script vào thư mục.`,
            timer: 1600,
            showConfirmButton: false
        });
    };

    const saveFolder = async (shouldPublish, overrideItems = null) => {
        let itemsToSave = overrideItems ? [...overrideItems] : [...folderItems];

        if (!overrideItems && showInlineCreator && isCreatorDirty && creatorRef.current) {
            const result = await Swal.fire({
                title: 'Bài tập chưa được thêm vào thư mục',
                text: 'Bạn có bài tập đang được tạo nhưng chưa thêm vào thư mục. Bạn có muốn tiếp tục lưu và tự động thêm bài tập này không?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#101d54',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Tiếp tục',
                cancelButtonText: 'Hủy'
            });

            if (result.isConfirmed) {
                const autoItem = creatorRef.current.getNewItem();
                if (autoItem) {
                    itemsToSave.push(autoItem);
                    setFolderItems(prev => [...prev, autoItem]);
                    creatorRef.current.reset();
                    setIsCreatorDirty(false);
                    setShowInlineCreator(false);
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Chú ý',
                        text: 'Nội dung bài tập đang soạn thảo trống. Vui lòng nhập nội dung đề bài trước khi lưu!',
                        confirmButtonColor: '#2a3f94'
                    });
                    return;
                }
            } else {
                return; // Hủy bỏ → quay lại soạn tiếp
            }
        }

        if (!folderTitle.trim()) {
            Swal.fire('Chú ý', 'Vui lòng nhập Tiêu đề Thư mục!', 'warning');
            return;
        }
        if (!folderDueDate) {
            Swal.fire('Chú ý', 'Vui lòng chọn Hạn chót nộp bài!', 'warning');
            return;
        }

        if (!folderAllowLate && folderReminderAt && !folderReminderProcessedAt) {
            const reminderDate = new Date(folderReminderAt);
            const dueDate = new Date(folderDueDate);
            if (reminderDate >= dueDate) {
                Swal.fire('Chú ý', 'Thời điểm nhắc deadline phải trước hạn nộp bài.', 'warning');
                return;
            }
            if (reminderDirty && reminderDate <= new Date()) {
                Swal.fire('Chú ý', 'Thời điểm nhắc deadline phải ở trong tương lai.', 'warning');
                return;
            }
        }

        if (itemsToSave.length === 0) {
            const confirmEmpty = await Swal.fire({
                title: 'Thư mục chưa có bài tập',
                text: 'Thư mục deadline này hiện chưa có bất kỳ bài tập nào bên trong. Bạn có chắc chắn muốn tiếp tục lưu thư mục trống này không?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#eab308',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Có, vẫn tiếp tục',
                cancelButtonText: 'Quay lại thêm bài'
            });
            if (!confirmEmpty.isConfirmed) {
                return;
            }
        }

        const formattedItems = itemsToSave.map(it => ({
            exerciseId: it.exerciseId || null,
            itemType: it.itemType,
            type: it.type || '',
            content: it.content || {},
            maxAttempts: (it.maxAttempts !== undefined && it.maxAttempts !== null) ? it.maxAttempts : null,
            payloads: it.payloads || []
        }));

        const payload = {
            title: folderTitle.trim(),
            description: folderDescription.trim(),
            dueDate: new Date(folderDueDate).toISOString(),
            allowLateSubmission: folderAllowLate,
            isPublished: shouldPublish,
            items: formattedItems
        };

        try {
            setLoading(true);
            let savedAssignmentId = assignmentId;
            if (assignmentId) {
                await axiosClient.put(`/teacher/assignment/${assignmentId}`, payload);
            } else {
                payload.classId = classId;
                const createResult = await axiosClient.post('/teacher/assignment', payload);
                savedAssignmentId = createResult?.assignmentId ?? createResult?.AssignmentId;
            }

            let reminderError = null;
            const shouldCancelReminder = Boolean(
                assignmentId
                && reminderDirty
                && !folderReminderProcessedAt
                && (!folderReminderAt || folderAllowLate)
            );
            const shouldSetReminder = Boolean(
                savedAssignmentId
                && !folderAllowLate
                && folderReminderAt
                && (reminderDirty || !assignmentId)
            );

            if (shouldCancelReminder || shouldSetReminder) {
                try {
                    await assignmentService.setDeadlineReminder(
                        savedAssignmentId,
                        shouldSetReminder
                            ? new Date(folderReminderAt).toISOString()
                            : null
                    );
                } catch (error) {
                    reminderError = error;
                    console.error('Error saving deadline reminder:', error);
                }
            }

            if (reminderError) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Đã lưu assignment',
                    text: reminderError.message || 'Không thể cập nhật lịch nhắc deadline. Vui lòng mở lại assignment và thử lại.'
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: assignmentId
                        ? (shouldPublish ? 'Đã xuất bản & lưu thay đổi!' : 'Đã chuyển thành bản nháp & lưu thay đổi!')
                        : (shouldPublish ? 'Đã xuất bản thư mục deadline mới!' : 'Đã lưu bản nháp thành công!'),
                    timer: 1800,
                    showConfirmButton: false
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error("Error saving folder:", err);
            Swal.fire('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        if (showInlineCreator && isCreatorDirty && creatorRef.current) {
            const result = await Swal.fire({
                title: 'Bài tập chưa được thêm vào thư mục',
                text: 'Bài tập bạn đang soạn chưa được thêm vào thư mục. Bấm "Lưu" để tự động thêm bài và lưu thư mục lại, hoặc "Hủy bỏ" để thoát không lưu.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#101d54',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Lưu',
                cancelButtonText: 'Hủy bỏ'
            });
            if (result.isConfirmed) {
                // Tự động thêm bài vào thư mục và lưu
                const autoItem = creatorRef.current.getNewItem();
                if (autoItem) {
                    const updatedItems = [...folderItems, autoItem];
                    setFolderItems(updatedItems);
                    creatorRef.current.reset();
                    setIsCreatorDirty(false);
                    setShowInlineCreator(false);
                    // Gọi saveFolder với danh sách items đã thêm
                    await saveFolder(folderIsPublished, updatedItems);
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Chú ý',
                        text: 'Nội dung bài tập đang soạn thảo trống. Vui lòng nhập nội dung đề bài trước khi lưu!',
                        confirmButtonColor: '#2a3f94'
                    });
                }
            } else {
                onClose(); // Hủy bỏ → thoát không lưu
            }
            return;
        }
        onClose();
    };

    return (
        <div className={styles.folderModalOverlay} onClick={handleClose}>
            <div className={styles.folderModalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h4>
                        <i className="bi bi-folder2-open" style={{ color: '#eab308', marginRight: '0.5rem' }}></i>
                        {assignmentId ? 'Cấu Hình Thư Mục Deadline' : 'Tạo Thư Mục Deadline Mới'}
                    </h4>
                    <button className={styles.btnClose} onClick={handleClose}>&times;</button>
                </div>

                {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#1b2d75', fontWeight: 600 }}>Đang nạp dữ liệu cấu hình...</div>}

                {!loading && (
                    <div className={styles.folderBody}>
                        <div className={styles.folderRow}>
                            <div className={styles.folderGroup}>
                                <label className={styles.folderLabel}>Tên Thư Mục (Tiêu Đề) <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    className={styles.folderInput}
                                    value={folderTitle}
                                    onChange={e => setFolderTitle(e.target.value)}
                                    placeholder="Ví dụ: Luyện Speaking Tuần 12..."
                                />
                            </div>
                            <div className={styles.folderGroup}>
                                <label className={styles.folderLabel}>Hạn Nộp Bài <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="datetime-local"
                                    className={styles.folderInput}
                                    value={folderDueDate}
                                    onChange={e => setFolderDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.folderGroup}>
                            <label className={styles.folderLabel}>Mô tả / Lời dặn dò</label>
                            <textarea
                                className={styles.folderTextarea}
                                value={folderDescription}
                                onChange={e => setFolderDescription(e.target.value)}
                                placeholder="Nội dung hướng dẫn chung cho học viên..."
                            />
                        </div>

                        <div className={styles.deadlineReminderRow}>
                            <div className={styles.allowLateOption}>
                                <input
                                    id="allow-late-checkbox"
                                    type="checkbox"
                                    checked={folderAllowLate}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setFolderAllowLate(checked);
                                        if (checked && folderReminderAt && !folderReminderProcessedAt) {
                                            setReminderDirty(true);
                                        }
                                    }}
                                />
                                <label htmlFor="allow-late-checkbox">
                                    Cho phép học sinh nộp muộn (Late Submission)
                                </label>
                            </div>

                            {!folderAllowLate && (
                                <div className={styles.reminderControl}>
                                    <button
                                        type="button"
                                        className={styles.btnDeadlineReminder}
                                        onClick={handleDeadlineReminder}
                                    >
                                        <i className="bi bi-bell-fill"></i>
                                        {folderReminderProcessedAt
                                            ? 'Nhắc deadline lần nữa'
                                            : (folderReminderAt ? 'Đổi lịch nhắc' : 'Nhắc deadline')}
                                    </button>
                                    {folderReminderAt && (
                                        <span className={styles.reminderStatus}>
                                            {folderReminderProcessedAt ? 'Đã nhắc' : 'Sẽ nhắc'} lúc {formatReminderTime(
                                                folderReminderProcessedAt || folderReminderAt
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.folderTasksSection}>
                            <div className={styles.folderTasksTitle}>
                                <span>
                                    <i className="bi bi-collection-fill" style={{ color: '#1b2d75', marginRight: '0.35rem' }}></i>
                                    Các bài tập bên trong thư mục ({folderItems.length})
                                </span>
                                <div className={styles.folderActionBtns}>
                                    <button
                                        type="button"
                                        className={styles.btnActionOutline}
                                        onClick={handleImportScript}
                                    >
                                        <i className="bi bi-code-square"></i> Nhập bằng Script
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnActionOutline}
                                        onClick={() => {
                                            setShowInlineCreator(prev => !prev);
                                            setShowOldSelector(false);
                                        }}
                                    >
                                        <i className="bi bi-plus-circle-fill"></i> Tạo Task Mới
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnActionOutline}
                                        onClick={() => {
                                            setShowOldSelector(prev => !prev);
                                            setShowInlineCreator(false);
                                        }}
                                    >
                                        <i className="bi bi-database-fill-add"></i> Lấy từ bài cũ
                                    </button>
                                </div>
                            </div>

                            <div className={styles.folderTasksList}>
                                {folderItems.length === 0 ? (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                                        Chưa có bài tập nào trong thư mục này. Hãy tạo mới hoặc chèn từ Ngân Hàng đề bên trên.
                                    </div>
                                ) : (
                                    folderItems.map((it, itemIndex) => {
                                        const type = (it.itemType || '').toUpperCase();
                                        const parsedContent = parseItemContent(it.content);
                                        const prompt = getItemPrompt(parsedContent);
                                        const isExpanded = expandedItemId === it.id;
                                        const sourceLabel = it.exerciseId ? `Ngân hàng · #${it.exerciseId}` : 'Tạo trong thư mục';
                                        const partOrTask = it.type;
                                        const attachments = it.payloads || [];
                                        let badgeClass = styles.badgeGeneral;
                                        let badgeLabel = 'General';

                                        if (type === 'AI_SPEAKING' || type === 'SPEAKING') {
                                            badgeClass = styles.badgeSpeaking;
                                            badgeLabel = 'Speaking';
                                        } else if (type === 'FILESUBMISSION' || type === 'FILE_SUBMISSION') {
                                            badgeClass = styles.badgeFile;
                                            badgeLabel = 'Nộp File';
                                        }

                                        return (
                                            <div
                                                key={it.id}
                                                className={`${styles.folderTaskCard} ${isExpanded ? styles.folderTaskCardExpanded : ''}`}
                                            >
                                                <div className={styles.folderTaskHeader}>
                                                    <button
                                                        type="button"
                                                        className={styles.folderTaskToggle}
                                                        onClick={() => setExpandedItemId(isExpanded ? null : it.id)}
                                                        aria-expanded={isExpanded}
                                                        aria-controls={`folder-task-detail-${it.id}`}
                                                    >
                                                        <span className={styles.folderTaskIndex}>{itemIndex + 1}</span>
                                                        <span className={styles.folderTaskInfo}>
                                                            <span className={styles.folderTaskMetaRow}>
                                                                <span className={`${styles.folderTaskBadge} ${badgeClass}`}>
                                                                    {badgeLabel}
                                                                </span>
                                                                <span className={styles.folderTaskSource}>{sourceLabel}</span>
                                                            </span>
                                                            <span className={styles.folderTaskText}>{it._displayLabel}</span>
                                                        </span>
                                                        <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} ${styles.folderTaskChevron}`}></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.btnActionDanger}
                                                        onClick={() => handleRemoveItem(it.id)}
                                                        title="Xóa khỏi thư mục"
                                                        aria-label={`Xóa bài tập ${itemIndex + 1} khỏi thư mục`}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>

                                                {isExpanded && (
                                                    <div
                                                        id={`folder-task-detail-${it.id}`}
                                                        className={styles.folderTaskDetails}
                                                    >
                                                        <div className={styles.folderTaskDetailMeta}>
                                                            {partOrTask && (
                                                                <span><i className="bi bi-bookmark-fill"></i> {partOrTask}</span>
                                                            )}
                                                            {(type === 'AI_SPEAKING' || type === 'SPEAKING') && (
                                                                <span>
                                                                    <i className="bi bi-arrow-repeat"></i>{' '}
                                                                    {it.maxAttempts ? `Tối đa ${it.maxAttempts} lượt nộp` : 'Không giới hạn lượt nộp'}
                                                                </span>
                                                            )}
                                                            <span><i className="bi bi-box-arrow-in-down"></i> {sourceLabel}</span>
                                                        </div>

                                                        <div className={styles.folderTaskPromptLabel}>Nội dung / Yêu cầu</div>
                                                        {prompt ? (
                                                            <div className={styles.folderTaskPrompt} style={{ whiteSpace: 'pre-wrap' }}>{prompt}</div>
                                                        ) : (
                                                            <div className={styles.folderTaskEmptyDetail}>Không có nội dung chi tiết.</div>
                                                        )}

                                                        {attachments.length > 0 && (
                                                            <div className={styles.folderTaskAttachments}>
                                                                <div className={styles.folderTaskPromptLabel}>
                                                                    Tài liệu đính kèm ({attachments.length})
                                                                </div>
                                                                <ul>
                                                                    {attachments.map((file, fileIndex) => (
                                                                        <li key={`${file.dataValue || file.fileName || 'file'}-${fileIndex}`}>
                                                                            <i className="bi bi-paperclip"></i>
                                                                            <span>{file.originalFileName || file.fileName || `Tài liệu ${fileIndex + 1}`}</span>
                                                                            {file.dataType && <small>{file.dataType}</small>}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Spot Task Creator (Tạo tại chỗ) */}
                            <SpotTaskCreator
                                ref={creatorRef}
                                show={showInlineCreator}
                                onClose={() => setShowInlineCreator(false)}
                                onAddTask={handleAddTask}
                                onDirtyChange={setIsCreatorDirty}
                                styles={styles}
                            />

                            {/* Exercise Selector (Lọc ngân hàng đề) */}
                            <ExerciseSelector
                                show={showOldSelector}
                                onClose={() => setShowOldSelector(false)}
                                oldExercises={oldExercises}
                                onSelectTasks={handleSelectOldTasks}
                                styles={styles}
                            />
                        </div>
                    </div>
                )}

                {!loading && (
                    <div className={styles.folderFooter}>
                        <button type="button" className={styles.btnActionOutline} onClick={handleClose}>Hủy bỏ</button>

                        {folderIsPublished ? (
                            <>
                                <button
                                    type="button"
                                    className={styles.btnActionOutline}
                                    style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', padding: '0.5rem 1.25rem' }}
                                    onClick={() => saveFolder(false)}
                                >
                                    <i className="bi bi-file-earmark-lock2" style={{ marginRight: '0.35rem' }}></i>
                                    Gỡ xuất bản (Lưu nháp)
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnMiniAdd}
                                    style={{ background: '#101d54', padding: '0.5rem 1.25rem' }}
                                    onClick={() => saveFolder(true)}
                                >
                                    <i className="bi bi-send-check-fill" style={{ marginRight: '0.35rem' }}></i>
                                    Lưu thay đổi
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={styles.btnActionOutline}
                                    style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', padding: '0.5rem 1.25rem' }}
                                    onClick={() => saveFolder(false)}
                                >
                                    <i className="bi bi-file-earmark-fill" style={{ marginRight: '0.35rem' }}></i>
                                    Lưu Bản Nháp
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnMiniAdd}
                                    style={{ background: '#1b2d75', padding: '0.5rem 1.25rem' }}
                                    onClick={() => saveFolder(true)}
                                >
                                    <i className="bi bi-send-fill" style={{ marginRight: '0.35rem' }}></i>
                                    Lưu & Xuất Bản
                                </button>
                            </>
                        )}
                    </div>
                )}

                <DeadlineReminderModal
                    show={showReminderModal}
                    dueDate={folderDueDate}
                    currentReminderAt={folderReminderAt}
                    processedAt={folderReminderProcessedAt}
                    styles={styles}
                    onClose={() => setShowReminderModal(false)}
                    onApply={(reminderAt) => {
                        setFolderReminderAt(toDateTimeLocalValue(reminderAt));
                        setFolderReminderProcessedAt('');
                        setReminderDirty(true);
                        setShowReminderModal(false);
                    }}
                    onCancelSchedule={() => {
                        setFolderReminderAt('');
                        setFolderReminderProcessedAt('');
                        setReminderDirty(true);
                        setShowReminderModal(false);
                    }}
                />
            </div>
        </div>
    );
}
