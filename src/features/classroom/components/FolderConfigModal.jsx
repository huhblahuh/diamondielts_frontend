import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import axiosClient from '../../../api/axiosClient';
import SpotTaskCreator from './SpotTaskCreator';
import ExerciseSelector from './ExerciseSelector';

export default function FolderConfigModal({ show, onClose, assignmentId, classId, oldExercises = [], onSaved, styles }) {
    const [folderTitle, setFolderTitle] = useState('');
    const [folderDueDate, setFolderDueDate] = useState('');
    const [folderDescription, setFolderDescription] = useState('');
    const [folderAllowLate, setFolderAllowLate] = useState(false);
    const [folderIsPublished, setFolderIsPublished] = useState(false);
    const [folderItems, setFolderItems] = useState([]);

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

                    if (assignData.dueDate) {
                        const date = new Date(assignData.dueDate);
                        const pad = (num) => String(num).padStart(2, '0');
                        const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                        setFolderDueDate(formatted);
                    } else {
                        setFolderDueDate('');
                    }

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
                        } else if (item.itemType === 'AI_SPEAKING') {
                            let parsed = {};
                            try { parsed = JSON.parse(item.contentJson || '{}'); } catch (e) { }
                            label = `🗣️ [Tự do] ${parsed.part || 'Part 1'} - ${(parsed.prompt || '').substring(0, 30)}...${item.maxAttempts ? ` (Tối đa ${item.maxAttempts} lần)` : ''}`;
                        } else if (item.itemType === 'AI_WRITING') {
                            let parsed = {};
                            try { parsed = JSON.parse(item.contentJson || '{}'); } catch (e) { }
                            label = `✍️ [Tự do] ${parsed.task || 'Task 1'} - ${(parsed.prompt || '').substring(0, 30)}...`;
                        } else if (item.itemType === 'GENERAL') {
                            let parsed = {};
                            try { parsed = JSON.parse(item.contentJson || '{}'); } catch (e) { }
                            label = `📝 [Tự do] ${parsed.title || 'General'} - ${(parsed.prompt || '').substring(0, 30)}...`;
                        } else if (item.itemType === 'fileSubmission') {
                            let parsed = {};
                            try { parsed = JSON.parse(item.contentJson || '{}'); } catch (e) { }
                            label = `📁 [Nộp File] ${(parsed.description || '').replace(/<[^>]*>/g, '').substring(0, 30)}... (${item.payloads?.length || 0} files)`;
                        }
                        return {
                            id: Date.now() + Math.random(),
                            dbId: item.itemId,
                            exerciseId: item.exerciseId,
                            itemType: item.itemType,
                            contentJson: item.contentJson,
                            maxAttempts: item.maxAttempts,
                            payloads: item.payloads || [],
                            _displayLabel: label
                        };
                    });
                    setFolderItems(mappedItems);
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
                setFolderItems([]);

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
                contentJson: ex.contentJson || "{}",
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
    };

    const saveFolder = async (shouldPublish, overrideItems = null) => {
        let itemsToSave = overrideItems ? [...overrideItems] : [...folderItems];

        if (!overrideItems && showInlineCreator && isCreatorDirty && creatorRef.current) {
            const result = await Swal.fire({
                title: 'Bài tập chưa được thêm vào thư mục',
                text: 'Bạn có bài tập đang được tạo nhưng chưa thêm vào thư mục. Bạn có muốn tiếp tục lưu và tự động thêm bài tập này không?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
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
                        confirmButtonColor: '#3b82f6'
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
            contentJson: it.contentJson || "{}",
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
            if (assignmentId) {
                await axiosClient.put(`/teacher/assignment/${assignmentId}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: shouldPublish ? 'Đã xuất bản & lưu thay đổi!' : 'Đã chuyển thành bản nháp & lưu thay đổi!',
                    timer: 1800,
                    showConfirmButton: false
                });
            } else {
                payload.classId = classId;
                await axiosClient.post('/teacher/assignment', payload);
                Swal.fire({
                    icon: 'success',
                    title: shouldPublish ? 'Đã xuất bản thư mục deadline mới!' : 'Đã lưu bản nháp thành công!',
                    timer: 1800,
                    showConfirmButton: false
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error("Error saving folder:", err);
            Swal.fire('Lỗi', err.message || 'Không thể lưu thư mục deadline.', 'error');
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
                confirmButtonColor: '#2563eb',
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
                        confirmButtonColor: '#3b82f6'
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

                {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6366f1', fontWeight: 600 }}>Đang nạp dữ liệu cấu hình...</div>}

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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                id="allow-late-checkbox"
                                type="checkbox"
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                checked={folderAllowLate}
                                onChange={e => setFolderAllowLate(e.target.checked)}
                            />
                            <label htmlFor="allow-late-checkbox" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                                Cho phép học sinh nộp muộn (Late Submission)
                            </label>
                        </div>

                        <div className={styles.folderTasksSection}>
                            <div className={styles.folderTasksTitle}>
                                <span>
                                    <i className="bi bi-collection-fill" style={{ color: '#6366f1', marginRight: '0.35rem' }}></i>
                                    Các bài tập bên trong thư mục ({folderItems.length})
                                </span>
                                <div className={styles.folderActionBtns}>
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
                                    folderItems.map((it) => {
                                        const type = (it.itemType || '').toUpperCase();
                                        let badgeClass = styles.badgeGeneral;
                                        let badgeLabel = 'General';

                                        if (type === 'AI_SPEAKING' || type === 'SPEAKING') {
                                            badgeClass = styles.badgeSpeaking;
                                            badgeLabel = 'Speaking';
                                        } else if (type === 'AI_WRITING' || type === 'WRITING') {
                                            badgeClass = styles.badgeWriting;
                                            badgeLabel = 'Writing';
                                        } else if (type === 'READING') {
                                            badgeClass = styles.badgeReading;
                                            badgeLabel = 'Reading';
                                        } else if (type === 'LISTENING') {
                                            badgeClass = styles.badgeListening;
                                            badgeLabel = 'Listening';
                                        } else if (type === 'FILESUBMISSION' || type === 'FILE_SUBMISSION') {
                                            badgeClass = styles.badgeFile;
                                            badgeLabel = 'Nộp File';
                                        }

                                        return (
                                            <div key={it.id} className={styles.folderTaskCard}>
                                                <div className={styles.folderTaskInfo}>
                                                    <span className={`${styles.folderTaskBadge} ${badgeClass}`}>
                                                        {badgeLabel}
                                                    </span>
                                                    <span className={styles.folderTaskText}>{it._displayLabel}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.btnActionDanger}
                                                    onClick={() => handleRemoveItem(it.id)}
                                                    title="Xóa khỏi thư mục"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
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
                                    style={{ background: '#2563eb', padding: '0.5rem 1.25rem' }}
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
                                    style={{ background: '#6366f1', padding: '0.5rem 1.25rem' }}
                                    onClick={() => saveFolder(true)}
                                >
                                    <i className="bi bi-send-fill" style={{ marginRight: '0.35rem' }}></i>
                                    Lưu & Xuất Bản
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
