import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../../api/axiosClient';
import Swal from 'sweetalert2';
import AttemptDetailView from '../../student/AttemptDetailView';
import s from './SubmissionReviewModal.module.css';
import Skeleton from '../../../components/common/Skeleton';

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
function SpeakingSubmissionViewer({ attempt, onGrade }) {
    const [view, setView] = useState('overview'); // 'overview' | 'detail'
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);

    const audioPayload = attempt.payloads?.find(p => p.dataType === 'AUDIO_URL');
    const jsonPayload  = attempt.payloads?.find(p => p.dataType === 'JSON_RESULT');
    const results = jsonPayload ? tryParseJson(jsonPayload.dataValue) : null;
    const hasAIResult = results && (results.fluency_coherence || results.pronunciationReport);

    if (view === 'detail' && results) {
        return (
            <div>
                <button className={s.backLink} onClick={() => setView('overview')}>
                    <i className="bi bi-arrow-left" /> Quay lại tổng quan
                </button>
                <AttemptDetailView
                    results={{
                        ...results,
                        audioBlobUrl: audioPayload?.downloadUrl || audioPayload?.dataValue,
                        overallScore: attempt.overallScore
                    }}
                    onBack={null}
                />
            </div>
        );
    }

    return (
        <div className={s.speakingViewer}>
            {/* Audio Player */}
            {audioPayload?.downloadUrl ? (
                <div className={s.audioPlayer}>
                    <button
                        className={`${s.playBtn} ${playing ? s.playing : ''}`}
                        onClick={() => {
                            const a = audioRef.current;
                            if (!a) return;
                            a.paused ? a.play() : a.pause();
                        }}
                    >
                        <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                    </button>
                    <div className={s.audioMeta}>
                        <span className={s.audioLabel}>Bài ghi âm của học sinh</span>
                        <audio
                            ref={audioRef}
                            src={audioPayload.downloadUrl}
                            preload="metadata"
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                            onEnded={() => setPlaying(false)}
                        />
                        <audio src={audioPayload.downloadUrl} controls className={s.nativeAudio} />
                    </div>
                </div>
            ) : (
                <div className={s.noAudio}>
                    <i className="bi bi-mic-mute" /> Không có file âm thanh
                </div>
            )}

            {/* AI Score Summary */}
            {hasAIResult && (
                <div className={s.aiScoreRow}>
                    {[
                        { label: 'Fluency', val: results.fluency_coherence?.score },
                        { label: 'Lexical', val: results.lexical_resource?.score },
                        { label: 'Grammar', val: results.grammar?.score },
                        { label: 'Pron', val: results.pronunciationReport?.overall?.pronunciationScore != null
                            ? results.pronunciationReport.overall.pronunciationScore / 10 : null },
                    ].map(m => (
                        <div key={m.label} className={s.scoreChip}>
                            <span className={s.scoreChipVal}>{m.val != null ? m.val.toFixed(1) : '--'}</span>
                            <span className={s.scoreChipLabel}>{m.label}</span>
                        </div>
                    ))}
                    <button className={s.detailBtn} onClick={() => setView('detail')}>
                        <i className="bi bi-search" /> Chi tiết AI
                    </button>
                </div>
            )}

            {!hasAIResult && (
                <div className={s.noAiNote}>
                    <i className="bi bi-robot" /> Chưa có kết quả AI cho lần nộp này.
                </div>
            )}

            {/* Teacher Grade */}
            <TeacherGradePanel attempt={attempt} onGrade={onGrade} />
        </div>
    );
}

// ─────────────────────────────────────────────
//  Sub-Viewer: File Submission
// ─────────────────────────────────────────────
function FileSubmissionViewer({ attempt, onGrade }) {
    const filePayloads = attempt.payloads?.filter(p => p.dataType === 'FILE_URL') || [];

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginBottom: '1.5rem' }}>
                    {filePayloads.map((payload, idx) => {
                        const fileName = payload.originalFileName || (payload.dataValue ? payload.dataValue.split('/').pop() : `file-${idx + 1}`);
                        const iconCls = getIconClass(fileName);
                        return (
                            <a
                                key={idx}
                                href={payload.downloadUrl || payload.dataValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.fileDownloadBtn}
                                download
                                style={{ margin: 0 }}
                            >
                                <i className={`bi ${iconCls} ${s.fileIcon}`} />
                                <div className={s.fileInfo}>
                                    <span className={s.fileName}>{decodeURIComponent(fileName)}</span>
                                    <span className={s.fileAction}>Nhấn để tải xuống</span>
                                </div>
                                <i className="bi bi-download" />
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

    const fileInputRef = React.useRef(null);

    // Reset state when switching between attempts
    React.useEffect(() => {
        setEditing(!existing);
        setScore(existing?.overallScore ?? '');
        setComment(existing?.responseDetail ?? '');
        setPendingAttachments([]);
        setPayloadsToDelete([]);
    }, [attempt.submissionId]);

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

    // Icon helper
    const getAttachIcon = (dataType) => {
        if (dataType === 'AUDIO_URL') return 'bi-file-earmark-music-fill text-primary';
        if (dataType === 'IMAGE_URL') return 'bi-file-earmark-image-fill text-success';
        return 'bi-file-earmark-pdf-fill text-danger';
    };

    // Existing attachments NOT marked for deletion
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
                    {/* Existing attachments in view mode */}
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
                    {/* Score */}
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

                    {/* Comment */}
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

                    {/* Existing attachments (with toggle delete) */}
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

                    {/* Pending new attachments */}
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

                    {/* Upload button */}
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

                    {/* Actions */}
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
//  MAIN MODAL
// ─────────────────────────────────────────────
export default function SubmissionReviewModal({ assignmentId, onClose }) {
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
            if (result?.items?.length > 0) {
                setSelectedItemId(result.items[0].itemId);
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu bài nộp.', 'error');
            onClose();
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

    useEffect(() => {
        setSelectedAttemptIdx(0);
    }, [selectedStudentId]);

    const selectedItem = data?.items?.find(i => i.itemId === selectedItemId);
    const selectedStudentData = selectedItem?.studentAttempts?.find(sa => sa.studentId === selectedStudentId)
        || selectedItem?.studentAttempts?.[0];
    const selectedAttempt = selectedStudentData?.attempts?.[selectedAttemptIdx];

    const Viewer = selectedItem ? getViewer(selectedItem.itemType) : null;

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
        return item?.studentAttempts?.length || 0;
    };

    const getLatestAttemptStatus = (studentData) => {
        if (!studentData?.attempts?.length) return null;
        return studentData.attempts[studentData.attempts.length - 1]?.status;
    };

    if (loading) {
        return (
            <div className={s.overlay}>
                <div className={s.modal} style={{ maxWidth: '1000px', width: '90%' }}>
                    <Skeleton type="assignment-detail" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>

                {/* ── HEADER ── */}
                <div className={s.header}>
                    <div className={s.headerLeft}>
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
                            </p>
                        </div>
                    </div>
                    <button className={s.closeBtn} onClick={onClose}>
                        <i className="bi bi-x-lg" />
                    </button>
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
                                                <i className="bi bi-people-fill" /> {submitted}
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

                    {/* COL 2: Students */}
                    <aside className={s.studentsCol}>
                        <div className={s.colHeader}>
                            <i className="bi bi-people-fill" /> Học sinh
                            {selectedItem && (
                                <span className={s.colHeaderCount}>
                                    {countSubmitted(selectedItem)} đã nộp
                                </span>
                            )}
                        </div>
                        <div className={s.studentsList}>
                            {selectedItem?.studentAttempts?.length === 0 && (
                                <div className={s.emptyStudents}>
                                    <i className="bi bi-inbox" />
                                    <p>Chưa có học sinh nào nộp bài</p>
                                </div>
                            )}
                            {selectedItem?.studentAttempts?.map(sa => {
                                const isActive = (selectedStudentId === sa.studentId) ||
                                    (!selectedStudentId && selectedItem?.studentAttempts?.[0]?.studentId === sa.studentId);
                                const latestStatus = getLatestAttemptStatus(sa);
                                const statusInfo = STATUS_LABELS[latestStatus] || {};
                                return (
                                    <button
                                        key={sa.studentId}
                                        className={`${s.studentBtn} ${isActive ? s.studentBtnActive : ''}`}
                                        onClick={() => setSelectedStudentId(sa.studentId)}
                                    >
                                        <div className={s.studentAvatar}>
                                            {(sa.studentName || '?')[0].toUpperCase()}
                                        </div>
                                        <div className={s.studentInfo}>
                                            <span className={s.studentName}>{sa.studentName}</span>
                                            <span className={s.studentEmail}>{sa.studentEmail}</span>
                                        </div>
                                        <div className={s.studentRight}>
                                            <span className={s.attemptCount}>{sa.attempts?.length} lần</span>
                                            {latestStatus && (
                                                <span className={`${s.statusBadge} ${statusInfo.cls || ''}`}>
                                                    {statusInfo.label || latestStatus}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* COL 3: Attempt Detail */}
                    <main className={s.detailCol}>
                        {!selectedStudentData && (
                            <div className={s.emptyDetail}>
                                <div className={s.emptyDetailIcon}>
                                    <i className="bi bi-mouse2" />
                                </div>
                                <h3>Chọn học sinh để xem bài nộp</h3>
                                <p>Chọn hạng mục và học sinh từ cột bên trái để xem chi tiết bài làm và chấm điểm.</p>
                            </div>
                        )}

                        {selectedStudentData && (
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
                                        <span className={s.totalAttempts}>
                                            {selectedStudentData.attempts?.length} lần nộp
                                        </span>
                                    </div>
                                </div>

                                {/* Attempt Tabs */}
                                {selectedStudentData.attempts?.length > 0 && (
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
        </div>
    );
}
