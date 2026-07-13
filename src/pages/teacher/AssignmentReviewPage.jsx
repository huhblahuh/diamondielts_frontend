import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import AttemptDetailView from '../../features/student/AttemptDetailView';
import s from '../../features/classroom/components/SubmissionReviewModal.module.css';
import Skeleton from '../../components/common/Skeleton';

// ─────────────────────────────────────────────
//  Helper: parse JSON safely
// ─────────────────────────────────────────────
const tryParseJson = (str) => {
    if (!str) return {};
    try { return JSON.parse(str); } catch { return {}; }
};

const fmtDateTime = (iso) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const STATUS_LABELS = {
    Pending: { label: 'Chờ chấm', cls: s.statusPending },
    Grading: { label: 'Đang chấm', cls: s.statusGrading },
    Completed: { label: 'Hoàn thành', cls: s.statusCompleted },
};

// ─────────────────────────────────────────────
//  Sub-Viewer: Speaking AI
// ─────────────────────────────────────────────
function SpeakingSubmissionViewer({ attempt }) {
    const audioPayload = attempt.payloads?.find(p =>
        p.dataType === 'AUDIO_URL' ||
        (p.dataType === 'FILE_URL' && /\.(mp3|wav|webm|m4a|ogg)(\?|$)/i.test(
            p.originalFileName || p.dataValue || ''
        ))
    );
    const aiFeedback = attempt.aiFeedback ||
        (attempt.feedback?.responderType === 'AI' ? attempt.feedback : null);
    const results = aiFeedback ? tryParseJson(aiFeedback.responseDetail) : null;
    const hasAIResult = results && (results.fluency_coherence || results.pronunciationReport);

    if (hasAIResult) {
        return (
            <div className={s.speakingViewer}>
                <AttemptDetailView
                    results={{
                        ...results,
                        audioBlobUrl: audioPayload?.downloadUrl || audioPayload?.dataValue,
                        overallScore: aiFeedback.overallScore
                    }}
                    onBack={null}
                />
            </div>
        );
    }

    return (
        <div className={s.speakingViewer}>
            <div className={s.noAiNote}>
                <i className="bi bi-robot" /> Chưa có kết quả AI cho lần nộp này.
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
//  Sub-Viewer: File Submission
// ─────────────────────────────────────────────
function FileSubmissionViewer({ attempt, onGrade }) {
    const filePayloads = attempt.payloads?.filter(p => {
        const type = p.dataType || p.datatype || p.DataType;
        return type === 'FILE_URL';
    }) || [];

    const iconMap = {
        pdf: 'bi-file-earmark-pdf-fill text-danger',
        doc: 'bi-file-earmark-word-fill text-primary',
        docx: 'bi-file-earmark-word-fill text-primary',
        zip: 'bi-file-earmark-zip-fill text-warning',
        rar: 'bi-file-earmark-zip-fill text-warning',
    };

    const getIconClass = (fileName) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return iconMap[ext] || 'bi-file-earmark-fill text-secondary';
    };

    return (
        <div className={s.fileViewer}>
            {filePayloads.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.75rem', width: '100%', marginBottom: '1.5rem' }}>
                    {filePayloads.map((payload, idx) => {
                        const fileName = payload.originalFileName || payload.originalfilename || payload.OriginalFileName || (payload.dataValue ? payload.dataValue.split('/').pop() : `file-${idx + 1}`);
                        const iconCls = getIconClass(fileName);
                        const downloadUrl = payload.downloadUrl || payload.downloadurl || payload.DownloadUrl || payload.dataValue;
                        return (
                            <a
                                key={idx}
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.fileDownloadBtn}
                                download
                                style={{
                                    margin: 0,
                                    width: '150px',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    padding: '0.75rem 0.5rem',
                                    gap: '0.5rem'
                                }}
                            >
                                <i className={`bi ${iconCls} ${s.fileIcon}`} style={{ fontSize: '1.75rem', margin: 0 }} />
                                <div className={s.fileInfo} style={{ width: '100%', alignItems: 'center' }}>
                                    <span className={s.fileName} style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        width: '100%',
                                        display: 'block'
                                    }}>
                                        {decodeURIComponent(fileName)}
                                    </span>
                                    <span className={s.fileAction} style={{ fontSize: '0.7rem' }}>Tải về</span>
                                </div>
                            </a>
                        );
                    })}
                </div>
            ) : (
                <div className={s.noFile}>
                    <i className="bi bi-file-earmark-x" /> Không tìm thấy file đính kèm.
                </div>
            )}

            {/* Teacher Grade */}
            <TeacherGradePanel attempt={attempt} onGrade={onGrade} />
        </div>
    );
}

// ─────────────────────────────────────────────
//  Teacher Grade Panel (shared) - with attachment support
// ─────────────────────────────────────────────
function TeacherGradePanel({ attempt, onGrade }) {
    const existing = attempt.feedback?.responderType === 'Teacher' ? attempt.feedback : null;
    const [editing, setEditing] = useState(!existing);
    const [score, setScore] = useState(existing?.overallScore ?? '');
    const [comment, setComment] = useState(existing?.responseDetail ?? '');
    const [submitting, setSubmitting] = useState(false);

    // Pending attachments to add (not yet submitted)
    const [pendingAttachments, setPendingAttachments] = useState([]); // [{dataType, dataValue, fileName}]
    const [uploadingFile, setUploadingFile] = useState(false);
    // IDs of existing attachments marked for deletion
    const [payloadsToDelete, setPayloadsToDelete] = useState([]);

    const fileInputRef = useRef(null);

    // Reset state when switching between attempts
    useEffect(() => {
        setEditing(!existing);
        setScore(existing?.overallScore ?? '');
        setComment(existing?.responseDetail ?? '');
        setPendingAttachments([]);
        setPayloadsToDelete([]);
    }, [attempt.submissionId, attempt, existing]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        try {
            setUploadingFile(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await axiosClient.post(
                '/teacher/assignment/upload-feedback-attachment',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setPendingAttachments(prev => [...prev, {
                dataType: res.dataType,
                dataValue: res.dataValue,
                originalFileName: res.fileName
            }]);
        } catch (err) {
            Swal.fire('Lỗi upload', err?.response?.data || 'Không thể tải file lên.', 'error');
        } finally {
            setUploadingFile(false);
        }
    };

    const removePending = (idx) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const toggleDeleteExisting = (payloadId) => {
        setPayloadsToDelete(prev =>
            prev.includes(payloadId)
                ? prev.filter(id => id !== payloadId)
                : [...prev, payloadId]
        );
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await axiosClient.post(`/teacher/assignment/grade/${attempt.submissionId}`, {
                overallScore: score !== '' ? parseFloat(score) : null,
                comment: comment.trim(),
                payloads: pendingAttachments,
                payloadsToDelete
            });
            Swal.fire({ icon: 'success', title: 'Chấm điểm thành công!', timer: 1500, showConfirmButton: false });
            setEditing(false);
            setPendingAttachments([]);
            setPayloadsToDelete([]);
            onGrade && onGrade(attempt.submissionId);
        } catch (err) {
            Swal.fire('Lỗi', err?.response?.data?.message || 'Không thể lưu điểm', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getAttachIcon = (dataType) => {
        if (dataType === 'AUDIO_URL') return 'bi-file-earmark-music-fill text-primary';
        if (dataType === 'IMAGE_URL') return 'bi-file-earmark-image-fill text-success';
        return 'bi-file-earmark-pdf-fill text-danger';
    };

    const existingPayloads = existing?.payloads || [];

    return (
        <div className={s.gradePanel}>
            <div className={s.gradePanelHeader}>
                <i className="bi bi-star-fill" style={{ color: '#f59e0b' }} />
                <span>Nhận xét của giáo viên</span>
                {existing && !editing && (
                    <button className={s.editGradeBtn} onClick={() => setEditing(true)}>
                        <i className="bi bi-pencil" /> Sửa
                    </button>
                )}
            </div>

            {/* ── VIEW MODE ── */}
            {!editing && existing ? (
                <div className={s.gradeDisplay}>
                    <div className={s.gradeScoreDisplay}>
                        <span className={s.gradeScoreNum}>{existing.overallScore?.toFixed(1) ?? '--'}</span>
                        <span className={s.gradeScoreUnit}>điểm</span>
                    </div>
                    <p className={s.gradeComment}>
                        {existing.responseDetail || <em style={{ color: '#94a3b8' }}>Không có nhận xét</em>}
                    </p>
                    {existingPayloads.length > 0 && (
                        <div className={s.attachList}>
                            {existingPayloads.map(p => (
                                <a
                                    key={p.responsePayloadId}
                                    href={p.downloadUrl || p.dataValue}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={s.attachChip}
                                    download
                                >
                                    <i className={`bi ${getAttachIcon(p.dataType)}`} />
                                    <span>{p.originalFileName || p.dataValue.split('/').pop()}</span>
                                    <i className="bi bi-download" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
                                </a>
                            ))}
                        </div>
                    )}
                    <span className={s.gradeDate}>Chấm lúc: {fmtDateTime(existing.createdAt)}</span>
                </div>
            ) : (
                /* ── EDIT/CREATE MODE ── */
                <div className={s.gradeForm}>
                    <div className={s.gradeFormRow}>
                        <div className={s.gradeFormGroup}>
                            <label className={s.gradeLabel}>Điểm số (tùy chọn)</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="0 – 10"
                                value={score}
                                onChange={e => setScore(e.target.value)}
                                className={s.gradeInput}
                            />
                        </div>
                    </div>

                    <div className={s.gradeFormGroup}>
                        <label className={s.gradeLabel}>Nhận xét / Phản hồi</label>
                        <textarea
                            rows={3}
                            placeholder="Nhập nhận xét cho học sinh..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            className={s.gradeTextarea}
                        />
                    </div>

                    {existingPayloads.length > 0 && (
                        <div className={s.gradeFormGroup}>
                            <label className={s.gradeLabel}>File đính kèm hiện tại</label>
                            <div className={s.attachList}>
                                {existingPayloads.map(p => {
                                    const markedDel = payloadsToDelete.includes(p.responsePayloadId);
                                    return (
                                        <div
                                            key={p.responsePayloadId}
                                            className={`${s.attachChipEditable} ${markedDel ? s.attachMarkedDel : ''}`}
                                        >
                                            <i className={`bi ${getAttachIcon(p.dataType)}`} />
                                            <span className={s.attachName}>
                                                {p.originalFileName || p.dataValue.split('/').pop()}
                                            </span>
                                            <button
                                                type="button"
                                                className={s.attachDelBtn}
                                                onClick={() => toggleDeleteExisting(p.responsePayloadId)}
                                                title={markedDel ? 'Hoàn tác xóa' : 'Đánh dấu xóa'}
                                            >
                                                <i className={`bi ${markedDel ? 'bi-arrow-counterclockwise' : 'bi-x-lg'}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {pendingAttachments.length > 0 && (
                        <div className={s.gradeFormGroup}>
                            <label className={s.gradeLabel}>File sẽ được thêm</label>
                            <div className={s.attachList}>
                                {pendingAttachments.map((p, idx) => (
                                    <div key={idx} className={s.attachChipPending}>
                                        <i className={`bi ${getAttachIcon(p.dataType)}`} />
                                        <span className={s.attachName}>{p.originalFileName}</span>
                                        <button
                                            type="button"
                                            className={s.attachDelBtn}
                                            onClick={() => removePending(idx)}
                                            title="Bỏ file này"
                                        >
                                            <i className="bi bi-x-lg" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={s.gradeFormGroup}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.mp3,.webm,.wav,.jpg,.jpeg,.png,.zip,.rar"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            className={s.uploadAttachBtn}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                        >
                            {uploadingFile
                                ? <><i className="bi bi-hourglass-split" /> Đang tải lên...</>
                                : <><i className="bi bi-paperclip" /> Đính kèm file</>
                            }
                        </button>
                        <span className={s.uploadHint}>PDF, Word, MP3, WAV, ảnh JPG/PNG, ZIP — tối đa 50MB</span>
                    </div>

                    <div className={s.gradeFormActions}>
                        {existing && (
                            <button
                                className={s.cancelGradeBtn}
                                onClick={() => {
                                    setEditing(false);
                                    setPendingAttachments([]);
                                    setPayloadsToDelete([]);
                                }}
                            >
                                Hủy
                            </button>
                        )}
                        <button
                            className={s.saveGradeBtn}
                            onClick={handleSubmit}
                            disabled={submitting || uploadingFile}
                        >
                            {submitting
                                ? <><i className="bi bi-hourglass-split" /> Đang lưu...</>
                                : <><i className="bi bi-check-lg" /> Lưu nhận xét</>
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
//  Component Registry
// ─────────────────────────────────────────────
const SUBMISSION_VIEWERS = {
    AI_SPEAKING: SpeakingSubmissionViewer,
    SPEAKING: SpeakingSubmissionViewer,
    fileSubmission: FileSubmissionViewer,
    FILE_UPLOAD: FileSubmissionViewer,
};

function getViewer(itemType) {
    const key = Object.keys(SUBMISSION_VIEWERS).find(
        k => k.toUpperCase() === (itemType || '').toUpperCase()
    ) || itemType;
    return SUBMISSION_VIEWERS[key] || null;
}

// ─────────────────────────────────────────────
//  MAIN PAGE COMPONENT
// ─────────────────────────────────────────────
export default function AssignmentReviewPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Navigation state
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedAttemptIdx, setSelectedAttemptIdx] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await axiosClient.get(`/teacher/assignment/${assignmentId}/student-submissions`);
            setData(result);
            
            // Check if we came from dashboard with a selected item and student
            const stateItemId = location.state?.itemId;
            const stateStudentId = location.state?.studentId;
            
            if (stateItemId && result?.items?.some(i => i.itemId === stateItemId)) {
                setSelectedItemId(stateItemId);
            } else if (result?.items?.length > 0) {
                setSelectedItemId(result.items[0].itemId);
            }
            
            if (stateStudentId) {
                setSelectedStudentId(stateStudentId);
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu bài nộp.', 'error');
            navigate('/teacher/classrooms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (assignmentId) fetchData();
    }, [assignmentId]);

    // Reset student/attempt when item changes
    useEffect(() => {
        setSelectedStudentId(null);
        setSelectedAttemptIdx(0);
    }, [selectedItemId]);

    const selectedItem = data?.items?.find(i => i.itemId === selectedItemId);
    const currentStudentInfo = data?.allStudents?.find(s => s.studentId === selectedStudentId);

    // Check if the student has submitted attempts for currently selected item
    const hasSubmittedCurrentItem = currentStudentInfo?.submittedByItem?.[selectedItemId] || false;

    // Load attempt data if submitted
    const selectedStudentData = hasSubmittedCurrentItem
        ? selectedItem?.studentAttempts?.find(sa => sa.studentId === selectedStudentId)
        : null;

    const selectedAttempt = selectedStudentData?.attempts?.[selectedAttemptIdx];
    const Viewer = selectedItem ? getViewer(selectedItem.itemType) : null;

    useEffect(() => {
        if (selectedStudentData?.attempts?.length > 0) {
            setSelectedAttemptIdx(selectedStudentData.attempts.length - 1);
        } else {
            setSelectedAttemptIdx(0);
        }
    }, [selectedStudentId, selectedStudentData]);

    const isFileSub = selectedItem && (selectedItem.itemType === 'fileSubmission' || selectedItem.itemType === 'FILE_UPLOAD');

    const getItemTypeLabel = (type) => {
        const t = (type || '').toUpperCase();
        if (t === 'AI_SPEAKING' || t === 'SPEAKING') return 'Speaking AI';
        if (t === 'FILESUBMISSION' || t === 'FILE_UPLOAD') return 'Nộp File';
        return type;
    };

    const getItemTypeBadgeClass = (type) => {
        const t = (type || '').toUpperCase();
        if (t === 'AI_SPEAKING' || t === 'SPEAKING') return s.badgeSpeaking;
        return s.badgeFile;
    };

    const parseItemTitle = (contentJson) => {
        const parsed = tryParseJson(contentJson);
        return parsed.title || parsed.textPrompt?.slice(0, 40) || 'Không có tiêu đề';
    };

    const countSubmitted = (item) => {
        // Count how many students in roster have submitted this specific item
        return data?.allStudents?.filter(std => std.submittedByItem?.[item.itemId]).length || 0;
    };

    const getLatestAttemptStatus = (studentData) => {
        if (!studentData?.attempts?.length) return null;
        return studentData.attempts[studentData.attempts.length - 1]?.status;
    };

    if (loading) {
        return <Skeleton type="assignment-detail" />;
    }

    if (!data) return null;

    return (
        <div className={s.pageShell}>

            {/* ── HEADER ── */}
            <div className={s.header}>
                <div className={s.headerLeft}>
                    <button className={s.backBtn} onClick={() => navigate('/teacher/classrooms', { state: { classId: data.classId } })}>
                        <i className="bi bi-arrow-left" /> Quay lại lớp học
                    </button>
                    <div className={s.headerBadge}>
                        <i className="bi bi-journal-check" />
                    </div>
                    <div>
                        <h2 className={s.headerTitle}>{data.title}</h2>
                        <p className={s.headerMeta}>
                            <i className="bi bi-calendar-event" />
                            Hạn nộp: {fmtDateTime(data.dueDate)}
                            <span className={s.metaSep}>·</span>
                            <i className="bi bi-list-check" />
                            {data.items?.length} hạng mục
                            <span className={s.metaSep}>·</span>
                            <i className="bi bi-people" />
                            Nộp bài: <strong style={{ color: '#4f46e5' }}>{data.submittedStudents}/{data.totalStudents}</strong> học sinh
                        </p>
                    </div>
                </div>
            </div>

            {/* ── BODY: 3-column layout ── */}
            <div className={s.body}>

                {/* COL 1: Assignment Items */}
                <aside className={s.itemsCol}>
                    <div className={s.colHeader}>
                        <i className="bi bi-layout-text-sidebar-reverse" /> Hạng mục
                    </div>
                    <div className={s.itemsList}>
                        {data.items?.map((item, idx) => {
                            const submitted = countSubmitted(item);
                            const isActive = item.itemId === selectedItemId;
                            return (
                                <button
                                    key={item.itemId}
                                    className={`${s.itemBtn} ${isActive ? s.itemBtnActive : ''}`}
                                    onClick={() => setSelectedItemId(item.itemId)}
                                >
                                    <div className={s.itemBtnTop}>
                                        <span className={`${s.itemTypeBadge} ${getItemTypeBadgeClass(item.itemType)}`}>
                                            {getItemTypeLabel(item.itemType)}
                                        </span>
                                        <span className={s.submittedCount}>
                                            <i className="bi bi-people-fill" /> {submitted}/{data.totalStudents}
                                        </span>
                                    </div>
                                    <div className={s.itemBtnTitle}>
                                        #{idx + 1} {parseItemTitle(item.contentJson)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* COL 2: Students Roster (All students in class) */}
                <aside className={s.studentsCol}>
                    <div className={s.colHeader}>
                        <i className="bi bi-people-fill" /> Học sinh
                        {selectedItem && (
                            <span className={s.colHeaderCount}>
                                {countSubmitted(selectedItem)}/{data.totalStudents} đã nộp
                            </span>
                        )}
                    </div>
                    <div className={s.studentsList}>
                        {data.allStudents?.length === 0 && (
                            <div className={s.emptyStudents}>
                                <i className="bi bi-inbox" />
                                <p>Lớp học chưa có học sinh</p>
                            </div>
                        )}
                        {data.allStudents?.map(student => {
                            const isActive = selectedStudentId === student.studentId;
                            const submitted = student.submittedByItem?.[selectedItemId] || false;

                            // Get attempt details if submitted
                            const studentAttemptGroup = submitted
                                ? selectedItem?.studentAttempts?.find(sa => sa.studentId === student.studentId)
                                : null;
                            const latestStatus = studentAttemptGroup ? getLatestAttemptStatus(studentAttemptGroup) : null;
                            const statusInfo = latestStatus ? (STATUS_LABELS[latestStatus] || {}) : {};

                            return (
                                <button
                                    key={student.studentId}
                                    className={`${s.studentBtn} ${isActive ? s.studentBtnActive : ''}`}
                                    onClick={() => setSelectedStudentId(student.studentId)}
                                >
                                    <div className={s.studentAvatar}>
                                        {(student.studentName || '?')[0].toUpperCase()}
                                    </div>
                                    <div className={s.studentInfo}>
                                        <span className={s.studentName}>{student.studentName}</span>
                                        <span className={s.studentEmail}>{student.studentEmail}</span>
                                    </div>
                                    <div className={s.studentRight}>
                                        {submitted ? (
                                            <>
                                                {isFileSub ? (
                                                    <span className={s.attemptCount} style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                                        Đã nộp
                                                    </span>
                                                ) : (
                                                    <span className={s.attemptCount} style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                                        {studentAttemptGroup?.attempts?.length} lần
                                                    </span>
                                                )}
                                                {latestStatus && (
                                                    <span className={`${s.statusBadge} ${statusInfo.cls || ''}`}>
                                                        {statusInfo.label || latestStatus}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className={`${s.statusBadge} ${s.statusNotSubmitted}`}>
                                                Chưa nộp
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* COL 3: Attempt Detail / No submission view */}
                <main className={s.detailCol}>
                    {!selectedStudentId && (
                        <div className={s.emptyDetail}>
                            <div className={s.emptyDetailIcon}>
                                <i className="bi bi-mouse2" />
                            </div>
                            <h3>Chọn học sinh để xem bài nộp</h3>
                            <p>Chọn hạng mục và học sinh từ cột bên trái để xem chi tiết bài làm và chấm điểm.</p>
                        </div>
                    )}

                    {selectedStudentId && !hasSubmittedCurrentItem && currentStudentInfo && (
                        <div className={s.emptyDetail}>
                            <div className={s.emptyDetailIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
                                <i className="bi bi-x-lg" />
                            </div>
                            <h3>Chưa nộp bài làm</h3>
                            <p>Học sinh <strong>{currentStudentInfo.studentName}</strong> chưa nộp bài làm cho hạng mục bài tập này.</p>
                        </div>
                    )}

                    {selectedStudentId && hasSubmittedCurrentItem && selectedStudentData && (
                        <>
                            {/* Student info bar */}
                            <div className={s.studentBar}>
                                <div className={s.studentBarAvatar}>
                                    {(selectedStudentData.studentName || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className={s.studentBarName}>{selectedStudentData.studentName}</div>
                                    <div className={s.studentBarEmail}>{selectedStudentData.studentEmail}</div>
                                </div>
                                <div className={s.studentBarRight}>
                                    {!isFileSub && (
                                        <span className={s.totalAttempts}>
                                            {selectedStudentData.attempts?.length} lần nộp
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Attempt Tabs */}
                            {!isFileSub && selectedStudentData.attempts?.length > 0 && (
                                <div className={s.attemptTabs}>
                                    {selectedStudentData.attempts.map((att, idx) => {
                                        const statusInfo = STATUS_LABELS[att.status] || {};
                                        return (
                                            <button
                                                key={att.submissionId}
                                                className={`${s.attemptTab} ${selectedAttemptIdx === idx ? s.attemptTabActive : ''}`}
                                                onClick={() => setSelectedAttemptIdx(idx)}
                                            >
                                                <span>Lần {att.attemptNumber}</span>
                                                <span className={`${s.attemptStatusDot} ${statusInfo.cls || ''}`} />
                                                {att.feedback?.overallScore != null && (
                                                    <span className={s.attemptScore}>
                                                        {att.feedback.overallScore.toFixed(1)}đ
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Attempt details */}
                            {selectedAttempt && Viewer ? (
                                <div className={s.attemptContent}>
                                    <div className={s.attemptMeta}>
                                        <i className="bi bi-clock" />
                                        Nộp lúc: {fmtDateTime(selectedAttempt.createdAt)}
                                        <span className={`${s.statusPill} ${STATUS_LABELS[selectedAttempt.status]?.cls || ''}`}>
                                            {STATUS_LABELS[selectedAttempt.status]?.label || selectedAttempt.status}
                                        </span>
                                    </div>
                                    <Viewer
                                        attempt={selectedAttempt}
                                        onGrade={() => fetchData()}
                                    />
                                </div>
                            ) : selectedAttempt && !Viewer ? (
                                <div className={s.unknownType}>
                                    <i className="bi bi-question-circle" />
                                    <p>Loại bài tập "<strong>{selectedItem?.itemType}</strong>" chưa được hỗ trợ hiển thị.</p>
                                </div>
                            ) : (
                                <div className={s.emptyDetail}>
                                    <i className="bi bi-inbox" />
                                    <p>Chưa có bài nộp nào.</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
