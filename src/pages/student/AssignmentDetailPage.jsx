import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from '../../features/student/StudentAssignmentModal.module.css';
import Swal from 'sweetalert2';
import { showToastError } from '../../utils/toast';
import Skeleton from '../../components/common/Skeleton';
import AttemptDetailView from '../../features/student/AttemptDetailView';
import { SpeakingAssessmentPipeline } from '../../features/student/speakingAssessmentPipeline';
import FileSubmissionItem from '../../features/student/FileSubmissionItem';
import SpeakingSubmissionItem from '../../features/student/SpeakingSubmissionItem';
import SpeakingPractice from '../../features/student/SpeakingPractice';

const detectPartNumber = (type, formattedContent) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('part 2') || typeLower.includes('part2') || typeLower.includes('speaking2')) return 2;
    if (typeLower.includes('part 3') || typeLower.includes('part3') || typeLower.includes('speaking3')) return 3;
    if (typeLower.includes('part 1') || typeLower.includes('part1') || typeLower.includes('speaking1')) return 1;

    if (formattedContent) {
        try {
            const parsed = typeof formattedContent === 'string' ? JSON.parse(formattedContent) : formattedContent;
            const pType = (parsed.type || parsed.part || '').toString().toLowerCase();
            if (pType.includes('part 2') || pType.includes('part2') || pType.includes('2')) return 2;
            if (pType.includes('part 3') || pType.includes('part3') || pType.includes('3')) return 3;
            if (pType.includes('part 1') || pType.includes('part1') || pType.includes('1')) return 1;

            const pContent = (parsed.passageHtml || parsed.htmlContent || parsed.textPrompt || parsed.prompt || '').toLowerCase();
            if (pContent.includes('part 2') || pContent.includes('part2')) return 2;
            if (pContent.includes('part 3') || pContent.includes('part3')) return 3;
            if (pContent.includes('part 1') || pContent.includes('part1')) return 1;
        } catch (e) { }
    }
    return 1;
};

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submittingItemId, setSubmittingItemId] = useState(null);

    // Lưu lịch sử bài nộp của học sinh theo từng ItemId
    const [histories, setHistories] = useState({});

    // Lưu file đang chuẩn bị nộp theo từng ItemId
    const [pendingFiles, setPendingFiles] = useState({});

    // Lưu ID của submission đang được chỉnh sửa
    const [editingSubmissionId, setEditingSubmissionId] = useState(null);

    // --- SPEAKING STUDIO STATES ---
    const [activeSpeakingItemId, setActiveSpeakingItemId] = useState(null);
    const [selectedPartFilter, setSelectedPartFilter] = useState('All');
    const [isRecording, setIsRecording] = useState(false);
    const [speakingStatus, setSpeakingStatus] = useState({}); // itemId => 'idle' | 'recording' | 'processing' | 'completed'
    const [speakingTimer, setSpeakingTimer] = useState(0);
    const [speakingResults, setSpeakingResults] = useState({}); // itemId => results object (feedback)
    const [activeSubmissionId, setActiveSubmissionId] = useState({}); // itemId => active attempt submission ID
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

    // Shared Soniox transcription and audio capture pipeline
    const assessmentPipelineRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            assessmentPipelineRef.current?.dispose();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!assignmentId) return;
        fetchAssignmentDetails();
    }, [assignmentId]);

    const fetchAssignmentDetails = async () => {
        try {
            setLoading(true);
            const data = await axiosClient.get(`/student/assignment/${assignmentId}`);
            setAssignment(data);

            // Sau khi lấy được chi tiết assignment, fetch lịch sử nộp bài của từng hạng mục
            if (data?.items) {
                const historyPromises = data.items.map(async (item) => {
                    try {
                        const historyData = await axiosClient.get(`/student/assignment/items/${item.itemId}/submissions`);
                        return { itemId: item.itemId, history: historyData || [] };
                    } catch (e) {
                        console.error(`Failed to fetch history for item ${item.itemId}:`, e);
                        return { itemId: item.itemId, history: [] };
                    }
                });

                const results = await Promise.all(historyPromises);
                const historiesMap = {};
                results.forEach(res => {
                    historiesMap[res.itemId] = res.history;
                });
                setHistories(historiesMap);
            }
        } catch (err) {
            console.error("Failed to fetch assignment detail:", err);
            showToastError('Không thể tải chi tiết bài tập. Vui lòng kiểm tra lại kết nối.');
            navigate('/student/classrooms');
        } finally {
            setLoading(false);
        }
    };

    const fetchItemHistory = async (itemId) => {
        try {
            const historyData = await axiosClient.get(`/student/assignment/items/${itemId}/submissions`);
            setHistories(prev => ({
                ...prev,
                [itemId]: historyData || []
            }));
        } catch (e) {
            console.error(`Failed to refresh history for item ${itemId}:`, e);
        }
    };

    const handleFileChange = (itemId, files) => {
        setPendingFiles(prev => ({
            ...prev,
            [itemId]: files
        }));
    };

    const handleRemoveSubmission = async (itemId, submissionId) => {
        const targetSubmission = histories[itemId]?.find(s => s.submissionId === submissionId);
        const isGraded = targetSubmission?.status?.toLowerCase() === 'completed'
            || targetSubmission?.feedback?.responderType?.toLowerCase() === 'teacher';
        if (isGraded) {
            await Swal.fire('Không thể xóa', 'Bài nộp đã được chấm nên không thể xóa.', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn có chắc chắn muốn hủy và xóa bài nộp này? Thao tác này không thể hoàn tác.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Có, xóa bài nộp',
            cancelButtonText: 'Hủy bỏ'
        });

        if (!result.isConfirmed) return;

        try {
            setSubmittingItemId(itemId);
            await axiosClient.delete(`/student/submissions/${submissionId}`);

            Swal.fire({
                icon: 'success',
                title: 'Đã xóa bài nộp!',
                timer: 1500,
                showConfirmButton: false
            });

            if (editingSubmissionId === submissionId) {
                setEditingSubmissionId(null);
            }

            await fetchItemHistory(itemId);
        } catch (err) {
            console.error("Failed to delete submission:", err);
            showToastError(err?.code === 'SUBMISSION_ALREADY_GRADED'
                ? err.message
                : 'Không thể xóa bài nộp. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    const handleEditSubmission = (itemId, submissionId) => {
        const targetSubmission = histories[itemId]?.find(s => s.submissionId === submissionId);
        const isGraded = targetSubmission?.status?.toLowerCase() === 'completed'
            || targetSubmission?.feedback?.responderType?.toLowerCase() === 'teacher';
        if (isGraded) {
            Swal.fire('Không thể sửa', 'Bài nộp đã được chấm nên không thể cập nhật.', 'info');
            return;
        }

        setEditingSubmissionId(submissionId);
        setPendingFiles(prev => ({
            ...prev,
            [itemId]: []
        }));
    };

    const handleSaveEditedSubmission = async (itemId, submissionId) => {
        const targetSubmission = histories[itemId]?.find(s => s.submissionId === submissionId);
        const isGraded = targetSubmission?.status?.toLowerCase() === 'completed'
            || targetSubmission?.feedback?.responderType?.toLowerCase() === 'teacher';
        if (isGraded) {
            await Swal.fire('Không thể sửa', 'Bài nộp đã được chấm nên không thể cập nhật.', 'info');
            setEditingSubmissionId(null);
            return;
        }

        const filesToSubmit = pendingFiles[itemId] || [];
        if (filesToSubmit.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Chưa chọn file mới',
                text: 'Vui lòng tải lên một file mới trước khi cập nhật bài nộp!',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        try {
            setSubmittingItemId(itemId);

            // Serialize all uploaded files to JSON array
            const serializedPayloads = JSON.stringify(filesToSubmit.map(f => ({
                dataValue: f.dataValue,
                fileName: f.fileName,
                dataType: f.dataType
            })));

            const formData = new FormData();
            formData.append('audioBlobUrl', serializedPayloads);

            await axiosClient.put(`/student/submissions/${submissionId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Cập nhật thành công!',
                text: 'Bài làm của bạn đã được cập nhật thành công.',
                timer: 2000,
                showConfirmButton: false
            });

            setEditingSubmissionId(null);
            setPendingFiles(prev => ({ ...prev, [itemId]: [] }));

            await fetchItemHistory(itemId);
        } catch (err) {
            console.error("Failed to edit submission:", err);
            showToastError(err?.code === 'SUBMISSION_ALREADY_GRADED'
                ? err.message
                : 'Cập nhật bài nộp thất bại. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    const handleSubmitHomework = async (itemId) => {
        const filesToSubmit = pendingFiles[itemId] || [];
        if (filesToSubmit.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Chưa chọn file',
                text: 'Vui lòng tải lên ít nhất một file trước khi nộp bài!',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        try {
            setSubmittingItemId(itemId);

            // Serialize all uploaded files to JSON array
            const serializedPayloads = JSON.stringify(filesToSubmit.map(f => ({
                dataValue: f.dataValue,
                fileName: f.fileName,
                dataType: f.dataType
            })));

            const formData = new FormData();
            formData.append('AssignmentItemId', itemId);
            formData.append('AudioBlobUrl', serializedPayloads);
            formData.append('AudioDurationSeconds', 0);

            await axiosClient.post('/student/submissions/file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Nộp bài thành công!',
                text: 'Bài làm của bạn đã được ghi nhận vào hệ thống.',
                timer: 2000,
                showConfirmButton: false
            });

            setPendingFiles(prev => ({
                ...prev,
                [itemId]: []
            }));

            await fetchItemHistory(itemId);
        } catch (err) {
            console.error("Failed to submit homework:", err);
            showToastError('Nộp bài thất bại. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(false);
        }
    };

    const formatDateTime = (isoStr) => {
        if (!isoStr) return "N/A";
        const d = new Date(isoStr);
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const renderContent = (jsonStr) => {
        if (!jsonStr) return "";
        try {
            const parsed = JSON.parse(jsonStr);
            return parsed.passageHtml || parsed.htmlContent || parsed.textPrompt || parsed.question || jsonStr;
        } catch (e) {
            return jsonStr;
        }
    };

    const stripHtml = (html) => {
        if (!html) return "";
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        } catch (e) {
            return html.replace(/<\/?[^>]+(>|$)/g, "").trim();
        }
    };

    const getCleanTextQuestion = (jsonStr) => {
        if (!jsonStr) return "";
        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.textPrompt) {
                return parsed.textPrompt.trim();
            }
            const html = parsed.passageHtml || parsed.htmlContent || jsonStr;
            return stripHtml(html).trim();
        } catch (e) {
            return stripHtml(jsonStr).trim();
        }
    };

    const startSpeakingRecording = async (itemId, itemType, formattedContent) => {
        try {
            try {
                const checkData = await axiosClient.get(`/student/PracticeSpeaking/check-attempts/${itemId}`);
                if (checkData.isLimitReached) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Giới hạn số lần nộp bài',
                        text: `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần).`,
                        confirmButtonColor: '#ef4444'
                    });
                    setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                    setIsRecording(false);
                    return;
                }
            } catch (err) {
                console.error("Failed to check attempt limit:", err);
            }

            let tokenData;
            try {
                tokenData = await axiosClient.get('/student/PracticeSpeaking/token');
            } catch (err) {
                console.error("Failed to fetch Speech Token:", err);
                showToastError('Không thể lấy token xác thực micro từ máy chủ. Vui lòng thử lại!');
                setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                setIsRecording(false);
                return;
            }

            const pipeline = new SpeakingAssessmentPipeline({
                credentials: tokenData,
                question: getCleanTextQuestion(formattedContent),
                partNumber: detectPartNumber(itemType, formattedContent)
            });
            assessmentPipelineRef.current = pipeline;
            await pipeline.start();

            setIsRecording(true);
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'recording' }));
            setSpeakingTimer(0);
            timerRef.current = setInterval(() => setSpeakingTimer(prev => prev + 1), 1000);

        } catch (err) {
            console.error(err);
            assessmentPipelineRef.current = null;
            showToastError('Không thể bắt đầu ghi âm. Vui lòng thử lại.');
        }
    };

    const stopSpeakingRecording = async (itemId, itemType, formattedContent) => {
        if (!assessmentPipelineRef.current) return;

        setSpeakingStatus(prev => ({ ...prev, [itemId]: 'processing' }));
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const outcome = await assessmentPipelineRef.current.stop();
            assessmentPipelineRef.current = null;
            const duration = outcome.durationSeconds;

            // Trích xuất transcript từ chunks và đếm số từ
            const transcript = outcome.transcript;
            const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

            // 1. Kiểm tra từ = 0 (lỗi mic)
            if (wordCount === 0) {
                setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));

                Swal.fire({
                    icon: 'warning',
                    title: 'Không nhận diện được giọng nói',
                    text: 'Vui lòng kiểm tra lại micro hoặc thiết bị thu âm của bạn. Hãy đảm bảo bạn đã cho phép trình duyệt truy cập micro và nói rõ ràng.',
                    confirmButtonText: 'Cấp quyền & Thử lại',
                    showCancelButton: true,
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#4f46e5'
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigator.mediaDevices.getUserMedia({ audio: true })
                            .then(stream => {
                                stream.getTracks().forEach(track => track.stop());
                                Swal.fire('Thành công', 'Micro đã sẵn sàng hoạt động! Hãy bắt đầu ghi âm lại nhé.', 'success');
                            })
                            .catch(err => {
                                console.error(err);
                                Swal.fire('Thất bại', 'Không thể truy cập micro. Vui lòng bật quyền truy cập Micro trong cài đặt trình duyệt của bạn.', 'error');
                            });
                    }
                });
                return;
            }

            // 2. Kiểm tra độ dài bài nói dựa trên Part
            const partNum = detectPartNumber(itemType, formattedContent);
            const minWords = partNum === 2 ? 20 : 10;
            if (wordCount < minWords) {
                setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: 'Hãy nói dài hơn để có điểm số chính xác',
                    showConfirmButton: false,
                    timer: 4500,
                    timerProgressBar: true,
                    background: '#fffbeb',
                    iconColor: '#d97706',
                    didOpen: (toast) => {
                        toast.style.border = '1.5px solid #fde68a';
                        toast.style.boxShadow = '0 10px 15px -3px rgba(180, 83, 9, 0.15)';
                        toast.style.color = '#b45309';
                        toast.style.fontSize = '0.9rem';
                        toast.style.fontWeight = '600';
                    }
                });
                return;
            }

            await submitSpeakingToBackend(
                itemId,
                itemType,
                formattedContent,
                duration,
                outcome.audioBlob,
                outcome.transcript,
                outcome.tokens,
                outcome.sessionId
            );
        } catch (err) {
            console.error(err);
            assessmentPipelineRef.current = null;
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
            showToastError('Không thể xử lý bài nói. Vui lòng thử lại.');
        }
    };

    const submitSpeakingToBackend = async (
        itemId,
        itemType,
        formattedContent,
        duration,
        audioBlob = null,
        sonioxTranscript = '',
        sonioxTokens = [],
        sessionId = ''
    ) => {
        try {
            const formData = new FormData();

            formData.append("AssignmentItemId", itemId);
            formData.append("type", (itemType || '').toUpperCase() === 'AI_SPEAKING' ? 'AI_SPEAKING' : 'SPEAKING');
            formData.append("question", getCleanTextQuestion(formattedContent));
            formData.append("audioDurationSeconds", duration);
            formData.append("sonioxTranscript", sonioxTranscript);
            formData.append("sonioxTokensJson", JSON.stringify(sonioxTokens));
            formData.append("sonioxFinalized", "true");
            formData.append("speechSessionId", sessionId || "");

            if (audioBlob) {
                formData.append("file", audioBlob, `speaking_${Date.now()}.webm`);
            }

            const resp = await axiosClient.post('/student/submissions/speaking', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            pollSpeakingResults(itemId, resp.submissionId);
            await fetchItemHistory(itemId);
        } catch (err) {
            console.error(err);
            if (err.code === 'OFF_TOPIC') {
                showToastError(
                    `${err.reason || err.message} Còn ${err.remainingRetries || 0} lần thử lại.`
                );
            } else {
                showToastError(
                    err.message || 'Không thể nộp bài. Vui lòng thử lại.'
                );
            }
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
        }
    };

    const pollSpeakingResults = async (itemId, subId) => {
        const check = async () => {
            try {
                const data = await axiosClient.get(`/student/submissions/${subId}`);
                if (data.status === 'Completed') {
                    setSpeakingResults(prev => ({ ...prev, [itemId]: data.feedback }));
                    setSpeakingStatus(prev => ({ ...prev, [itemId]: 'completed' }));
                    await fetchItemHistory(itemId);
                    return true;
                } else if (data.status === 'Failed') {
                    showToastError('AI không thể xử lý bài nói của bạn.');
                    setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                    return true;
                }
                return false;
            } catch (err) {
                console.error(err);
                return true;
            }
        };

        const interval = setInterval(async () => {
            const done = await check();
            if (done) clearInterval(interval);
        }, 3000);
    };

    const handleSelectSpeakingHistory = async (itemId, subId) => {
        try {
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'processing' }));
            setActiveSubmissionId(prev => ({ ...prev, [itemId]: subId }));
            const data = await axiosClient.get(`/student/submissions/${subId}`);
            setSpeakingResults(prev => ({ ...prev, [itemId]: data.feedback }));
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'completed' }));
        } catch (err) {
            showToastError('Không thể xem chi tiết bài nộp cũ');
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
        }
    };

    if (loading) {
        return <Skeleton type="assignment-detail" />;
    }

    if (!assignment) return null;

    const isOverdue = new Date(assignment.dueDate) < new Date();
    const isBlockedByDeadline = isOverdue && !assignment.allowLateSubmission;

    // --- SPEAKING STUDIO VIEW MODE ---
    if (activeSpeakingItemId) {
        return (
            <div style={{ background: '#f8fafc', height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
                <SpeakingPractice
                    isAssignmentMode={true}
                    assignmentId={assignmentId}
                    assignmentItemId={activeSpeakingItemId}
                    assignment={assignment}
                    onBack={() => {
                        setActiveSpeakingItemId(null);
                        // Refresh assignment details to fetch updated history list on return
                        fetchAssignmentDetails();
                    }}
                />
            </div>
        );
    }

    // --- STANDARD ASSIGNMENT LIST VIEW ---
    return (
        <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div className={styles.modalHeader} style={{ borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div className={styles.modalHeaderLeft}>
                    <button className={styles.backBtn} onClick={() => navigate('/student/classrooms')} style={{ marginBottom: '0.75rem' }}>
                        <i className="bi bi-arrow-left" /> Quay lại lớp học
                    </button>
                    <h3 style={{ margin: '0.5rem 0' }}>{assignment.title}</h3>
                    <div className={styles.modalMeta}>
                        <span className={isOverdue ? styles.dueDate : styles.dueDateOk}>
                            <i className="bi bi-calendar-event"></i> Hạn nộp: {formatDateTime(assignment.dueDate)}
                        </span>
                        {isOverdue && (
                            <span className="badge bg-danger rounded-pill">Quá hạn nộp</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Hướng dẫn chi tiết từ giáo viên */}
                {assignment.description && (
                    <div className={styles.instructionSection}>
                        <h5><i className="bi bi-info-circle-fill text-primary"></i> Hướng dẫn từ giáo viên</h5>
                        <div
                            className={styles.instructionContent}
                            dangerouslySetInnerHTML={{ __html: assignment.description }}
                        />
                    </div>
                )}

                {/* Danh sách các Hạng mục bài tập con */}
                <div className={styles.itemsSection}>
                    <h4 className={styles.sectionTitle}>
                        <i className="bi bi-list-check text-success"></i> Hạng mục cần thực hiện ({assignment.items?.length || 0})
                    </h4>

                    {assignment.items?.map((item, index) => {
                        const itemHistory = histories[item.itemId] || [];
                        const isSpeaking = (item.itemType || '').toUpperCase() === 'AI_SPEAKING' || (item.itemType || '').toUpperCase() === 'SPEAKING';

                        if (isSpeaking) {
                            return (
                                <SpeakingSubmissionItem
                                    key={item.itemId}
                                    item={item}
                                    index={index}
                                    itemHistory={itemHistory}
                                    setActiveSpeakingItemId={setActiveSpeakingItemId}
                                    setSpeakingResults={setSpeakingResults}
                                    formatDateTime={formatDateTime}
                                />
                            );
                        }

                        return (
                            <FileSubmissionItem
                                key={item.itemId}
                                item={item}
                                index={index}
                                itemHistory={itemHistory}
                                editingSubmissionId={editingSubmissionId}
                                isBlockedByDeadline={isBlockedByDeadline}
                                files={pendingFiles[item.itemId] || []}
                                submittingItemId={submittingItemId}
                                handleFileChange={handleFileChange}
                                setEditingSubmissionId={setEditingSubmissionId}
                                handleEditSubmission={handleEditSubmission}
                                handleRemoveSubmission={handleRemoveSubmission}
                                handleSaveEditedSubmission={handleSaveEditedSubmission}
                                handleSubmitHomework={handleSubmitHomework}
                                formatDateTime={formatDateTime}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
