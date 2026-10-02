import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import assignmentService from '../../api/services/assignment.service';
import exerciseService from '../../api/services/exercise.service';
import classroomService from '../../api/services/classroom.service';
import AssignmentForm from './components/AssignmentForm';
import AssignmentBuilder from './components/AssignmentBuilder';
import ExerciseBankModal from './components/ExerciseBankModal';
import styles from './CreateAssignment.module.css';
import Skeleton from '../../components/common/Skeleton';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import { toAssignmentDateTimeLocal } from '../../utils/assignmentDate';

export default function CreateAssignment() {
    const { assignmentId } = useParams();
    const isEdit = !!assignmentId;
    const navigate = useNavigate();
    const location = useLocation();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [classId, setClassId] = useState(location.state?.prefilledClassId?.toString() || '1');
    const [classes, setClasses] = useState([]);
    const [items, setItems] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showBank, setShowBank] = useState(false);

    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                const exData = await exerciseService.getAll();
                setExercises(exData || []);

                const classData = await classroomService.getTeacherClasses();
                setClasses(classData || []);

                if (!isEdit && !location.state?.prefilledClassId && classData && classData.length > 0) {
                    setClassId(classData[0].classId.toString());
                }

                if (isEdit) {
                    const assignData = await assignmentService.getById(assignmentId);
                    if (assignData) {
                        setTitle(assignData.title || '');
                        setDescription(assignData.description || '');
                        setDueDate(toAssignmentDateTimeLocal(assignData.dueDate));
                        
                        const mappedItems = (assignData.items || []).map(item => {
                            let label = `Item #${item.itemId}`;
                            const parsedSettings = item.content || {};

                            if (item.exerciseId) {
                                const ex = (exData || []).find(e => e.exerciseId === item.exerciseId);
                                label = ex ? `[Ngân hàng] ${ex.type} - ${ex.skillType}` : `[Bài tập cũ #${item.exerciseId}]`;
                            } else if (item.itemType === 'AI_SPEAKING' || item.itemType === 'SPEAKING') {
                                const rawPart = item.type || 'Speaking';
                                const rawTxt = normalizeSpeakingContent(parsedSettings).question.substring(0, 40);
                                label = `🗣️ [Tự do] ${rawPart} - ${rawTxt}...`;
                            } else if (item.itemType === 'FILE_UPLOAD') {
                                label = '📁 Yêu cầu Nộp File bài làm';
                            } else if (item.itemType === 'fileSubmission') {
                                const desc = (parsedSettings.description || '').substring(0, 40);
                                label = `📁 [Nộp File] ${desc}... (${item.payloads?.length || 0} files)`;
                            }
                            
                            return {
                                id: Date.now() + Math.random(),
                                dbId: item.itemId,
                                exerciseId: item.exerciseId,
                                itemType: item.itemType,
                                type: item.type || '',
                                content: item.content || {},
                                payloads: item.payloads || [],
                                _displayLabel: label
                            };
                        });
                        setItems(mappedItems);
                    }
                }
            } catch (error) {
                console.error("Init Failed", error);
                Swal.fire('Lỗi', 'Không thể tải cấu hình', 'error');
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [assignmentId, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) {
            Swal.fire('Chú ý', 'Vui lòng nhập Tiêu đề và Hạn chót!', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const formattedItems = items.map(it => ({
                exerciseId: it.exerciseId || null,
                itemType: it.itemType,
                type: it.type || '',
                content: it.content || {},
                payloads: it.payloads || []
            }));

            const payload = {
                title,
                description,
                dueDate: new Date(dueDate).toISOString(),
                items: formattedItems
            };

            if (isEdit) {
                await assignmentService.update(assignmentId, payload);
                Swal.fire('Thành công', 'Đã lưu cấu hình deadline!', 'success');
            } else {
                payload.classId = parseInt(classId);
                await assignmentService.create(payload);
                Swal.fire('Thành công', 'Đã tạo Deadline Builder thành công!', 'success');
            }
            setTimeout(() => navigate(-1), 1200);
        } catch (err) {
            console.error("Submit error", err);
            Swal.fire('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <Skeleton type="form" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <button onClick={() => navigate(-1)} className={styles.backBtn}>
                    <i className="bi bi-arrow-left"></i> Quay lại
                </button>
                <h3>🛠️ {isEdit ? 'Cấu Hình Deadline (Builder)' : 'Tạo Deadline Mới'}</h3>
                <p>Lắp ghép bài giảng, bài tự luận & Speaking tích hợp tương tự Moodle.</p>
            </header>

            <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
                <AssignmentForm 
                    title={title} setTitle={setTitle}
                    description={description} setDescription={setDescription}
                    dueDate={dueDate} setDueDate={setDueDate}
                    classId={classId} setClassId={setClassId}
                    isEdit={isEdit}
                    classes={classes}
                />

                <AssignmentBuilder 
                    items={items} 
                    setItems={setItems}
                    onOpenBank={() => setShowBank(true)}
                />

                <div style={{display:'flex', justifyContent:'flex-end', gap:'1rem'}}>
                    <button type="button" className={styles.btnSecondary} onClick={() => navigate(-1)}>Hủy bỏ</button>
                    <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                        {submitting ? 'Đang lưu...' : '🚀 Lưu Cấu Hình'}
                    </button>
                </div>
            </form>

            {showBank && (
                <ExerciseBankModal 
                    exercises={exercises} 
                    onClose={() => setShowBank(false)}
                    onSelect={(selectedExs) => {
                        const newItems = selectedExs.map((ex, index) => ({
                            id: Date.now() + index + Math.random(),
                            exerciseId: ex.exerciseId,
                            itemType: ex.skillType,
                            type: ex.type,
                            content: ex.content,
                            _displayLabel: `[Ngân hàng] ${ex.type} - ${ex.skillType}`
                        }));
                        setItems([...items, ...newItems]);
                        setShowBank(false);
                        Swal.fire({ icon: 'success', title: `Đã chèn ${selectedExs.length} bài tập thành công!`, timer: 1000, showConfirmButton: false });
                    }}
                />
            )}
        </div>
    );
}
