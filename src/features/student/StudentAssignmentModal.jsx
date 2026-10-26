import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import assignmentService from '../../api/services/assignment.service';
import styles from './StudentAssignmentModal.module.css';
import Skeleton from '../../components/common/Skeleton';
import CommonAttachmentUploader from '../../components/CommonAttachmentUploader';
import Swal from 'sweetalert2';
import { showToastError } from '../../utils/toast';
import AttemptDetailView from './AttemptDetailView';
import { formatSpeakingPipelineError } from './speakingAssessmentPipeline';
import { createSpeakingPipeline } from './speakingPipelineFactory';
import SpeakingQuestionCard from '../../components/SpeakingQuestionCard';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import { parseAssignmentDueDate } from '../../utils/assignmentDate';

// Soniox credentials are issued by the backend for each recording session.

export default function StudentAssignmentModal({ assignmentId, onClose }) {
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submittingItemId, setSubmittingItemId] = useState(null);

    // Lịch sử chỉ được populate sau khi item detail được mở.
    const [histories, setHistories] = useState({});
    const [itemDetails, setItemDetails] = useState({});
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [itemDetailLoadingId, setItemDetailLoadingId] = useState(null);
    const [itemDetailErrors, setItemDetailErrors] = useState({});

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

    // Soniox realtime transcript plus local WebM capture.
    const assessmentPipelineRef = React.useRef(null);
    const stopInProgressRef = React.useRef(false);
    const timerRef = React.useRef(null);

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
            const data = await assignmentService.getStudentAssignmentSummary(assignmentId);
            setAssignment(data);
            setHistories({});
            setItemDetails({});
            setItemDetailErrors({});
            setExpandedItemId(null);
        } catch (err) {
            console.error("Failed to fetch assignment detail:", err);
            showToastError('Không thể tải chi tiết bài tập. Vui lòng kiểm tra lại kết nối.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const detectPartNumber = (type) => {
        const typeLower = (type || '').toLowerCase();
        if (typeLower.includes('part 2') || typeLower.includes('part2') || typeLower.includes('speaking2')) return 2;
        if (typeLower.includes('part 3') || typeLower.includes('part3') || typeLower.includes('speaking3')) return 3;
        if (typeLower.includes('part 1') || typeLower.includes('part1') || typeLower.includes('speaking1')) return 1;

        return 1;
    };

    const activeSpeakingItemForLimit = assignment?.items?.find(it => it.itemId === activeSpeakingItemId);
    const activeSpeakingItemDetail = activeSpeakingItemId ? itemDetails[activeSpeakingItemId] : null;
    const activeSpeakingItemData = activeSpeakingItemForLimit
        ? { ...activeSpeakingItemForLimit, ...activeSpeakingItemDetail }
        : null;
    const partNum = activeSpeakingItemData ? detectPartNumber(activeSpeakingItemData.type) : 1;
    const getRecordingTimeLimit = (part) => {
        if (part === 2) return 150; // 2 minutes 30 seconds
        if (part === 3) return 60;  // 1 minute
        return 45;                  // 45 seconds for Part 1 / default
    };
    const timeLimit = getRecordingTimeLimit(partNum);

    // Tự động dừng ghi âm khi hết thời gian
    useEffect(() => {
        if (isRecording && speakingTimer >= timeLimit && activeSpeakingItemId) {
            stopSpeakingRecording(activeSpeakingItemId, activeSpeakingItemData?.type, activeSpeakingItemData?.content);
            Swal.fire({
                icon: 'info',
                title: 'Hết thời gian ghi âm',
                text: `Thời gian ghi âm tối đa cho Part ${partNum} là ${formatTime(timeLimit)}. Hệ thống đang chấm bài của bạn.`,
                timer: 4000,
                showConfirmButton: false
            });
        }
    }, [speakingTimer, isRecording, timeLimit, partNum, activeSpeakingItemId]);

    const fetchItemDetail = async (itemId, force = false) => {
        if (!force && itemDetails[itemId]) {
            setExpandedItemId(itemId);
            return itemDetails[itemId];
        }

        setExpandedItemId(itemId);
        setItemDetailLoadingId(itemId);
        setItemDetailErrors(prev => ({ ...prev, [itemId]: null }));
        try {
            const detail = await assignmentService.getStudentAssignmentItemDetail(assignmentId, itemId);
            setItemDetails(prev => ({ ...prev, [itemId]: detail }));
            setHistories(prev => ({
                ...prev,
                [itemId]: detail?.history || []
            }));
            return detail;
        } catch (e) {
            console.error(`Failed to load item detail ${itemId}:`, e);
            setItemDetailErrors(prev => ({
                ...prev,
                [itemId]: 'Không thể tải chi tiết hạng mục. Vui lòng thử lại.'
            }));
            return null;
        } finally {
            setItemDetailLoadingId(null);
        }
    };

    const fetchItemHistory = async (itemId) => fetchItemDetail(itemId, true);

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
        // Hiện tại hệ thống lưu mỗi attempt là 1 file (FILE_URL)
        const filePayload = filesToSubmit[0];

        try {
            setSubmittingItemId(itemId);

            // Đóng gói data nộp bài qua FormData
            const formData = new FormData();
            formData.append('AssignmentItemId', itemId);
            formData.append('AudioBlobUrl', filePayload.dataValue);

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

            // Xóa file tạm trong state
            setPendingFiles(prev => ({
                ...prev,
                [itemId]: []
            }));

            // Cập nhật lại lịch sử nộp bài của hạng mục này
            await fetchItemHistory(itemId);
        } catch (err) {
            console.error("Failed to submit homework:", err);
            showToastError('Nộp bài thất bại. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(false);
        }
    };

    const formatDateTime = (isoStr, isDueDate = false) => {
        if (!isoStr) return "N/A";
        const d = isDueDate ? parseAssignmentDueDate(isoStr) : new Date(isoStr);
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

    const startSpeakingRecording = async (itemId, itemType, content) => {
        if (assessmentPipelineRef.current || stopInProgressRef.current) return;
        try {
            // Kiểm tra giới hạn số lần nộp bài trước khi bắt đầu ghi âm
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

            const pipeline = createSpeakingPipeline();
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

    const stopSpeakingRecording = async (itemId, itemType, content) => {
        if (!assessmentPipelineRef.current || stopInProgressRef.current) return;
        stopInProgressRef.current = true;

        setSpeakingStatus(prev => ({ ...prev, [itemId]: 'processing' }));
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const outcome = await assessmentPipelineRef.current.stop();
            assessmentPipelineRef.current = null;
            const duration = outcome.durationSeconds;

            if (!outcome.audioBlob?.size) {
                setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));

                Swal.fire({
                    icon: 'warning',
                    title: 'Không nhận diện được giọng nói',
                    text: 'Vui lòng kiểm tra lại micro hoặc thiết bị thu âm của bạn. Hãy đảm bảo bạn đã cho phép trình duyệt truy cập micro và nói rõ ràng.',
                    confirmButtonText: 'Kiểm tra micro',
                    showCancelButton: true,
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#101d54'
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigator.mediaDevices.getUserMedia({ audio: true })
                            .then(stream => {
                                stream.getTracks().forEach(track => track.stop());
                                Swal.fire('Đã truy cập được micro', 'Nếu vẫn không nhận diện được giọng nói, hãy kiểm tra thiết bị đầu vào và âm lượng micro rồi ghi âm lại.', 'info');
                            })
                            .catch(err => {
                                console.error(err);
                                Swal.fire('Thất bại', 'Không thể truy cập micro. Vui lòng bật quyền truy cập Micro trong cài đặt trình duyệt của bạn.', 'error');
                            });
                    }
                });
                return;
            }

            await submitSpeakingToBackend(itemId, duration, outcome.audioBlob);
        } catch (err) {
            console.error(err);
            assessmentPipelineRef.current = null;
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
            showToastError(formatSpeakingPipelineError(err));
        } finally {
            stopInProgressRef.current = false;
        }
    };

    const submitSpeakingToBackend = async (
        itemId,
        duration,
        audioBlob = null
    ) => {
        try {
            const formData = new FormData();

            formData.append("AssignmentItemId", itemId);
            formData.append(
                "audioDurationMilliseconds",
                String(Math.round(duration * 1000)),
            );

            if (audioBlob) {
                formData.append("file", audioBlob, `speaking_${Date.now()}.webm`);
            }

            const resp = await axiosClient.post('/student/submissions/speaking', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            pollSpeakingResults(itemId, resp.submissionId);
            await fetchItemHistory(itemId);
            return true;
        } catch (err) {
            console.error(err);
            if (err.code === 'OFF_TOPIC') {
                showToastError(err.message);
            } else {
                showToastError(
                    err.message || 'Không thể nộp bài. Vui lòng thử lại.'
                );
            }
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
            return false;
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
                    showToastError('Bài nói chưa được xử lý. Vui lòng thử lại.');
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
            Swal.fire('Lỗi', 'Không thể xem chi tiết bài nộp cũ', 'error');
            setSpeakingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
        }
    };



    if (loading) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} style={{ maxWidth: '1000px', width: '90%' }}>
                    <Skeleton type="assignment-detail" />
                </div>
            </div>
        );
    }

    if (!assignment) return null;

    const isOverdue = parseAssignmentDueDate(assignment.dueDate) < new Date();
    const isBlockedByDeadline = isOverdue && !assignment.allowLateSubmission;

    // --- SPEAKING STUDIO VIEW MODE ---
    if (activeSpeakingItemId) {
        const activeSpeakingItem = assignment.items?.find(it => it.itemId === activeSpeakingItemId);
        const activeSpeakingItemData = activeSpeakingItem
            ? { ...activeSpeakingItem, ...itemDetails[activeSpeakingItemId] }
            : null;
        const activeItemParsed = normalizeSpeakingContent(activeSpeakingItemData?.content);
        const activeItemHistory = histories[activeSpeakingItemId] || [];
        const speakingItems = assignment.items?.filter(it => {
            const typeUpper = (it.itemType || '').toUpperCase();
            return typeUpper === 'AI_SPEAKING' || typeUpper === 'SPEAKING';
        }) || [];

        const getPartFromType = (type) => {
            if (!type) return 'Part 1';
            if (type.includes('2') || type.includes('Part 2')) return 'Part 2';
            if (type.includes('3') || type.includes('Part 3')) return 'Part 3';
            return 'Part 1';
        };

        const activePart = getPartFromType(activeSpeakingItemData?.type);

        return (
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={`${styles.modalContainer} ${styles.wideModal}`} onClick={e => e.stopPropagation()}>

                    {/* Header phòng thu */}
                    <div className={styles.modalHeader}>
                        <div className={styles.modalHeaderLeft}>
                            <button
                                className={styles.btnBackToList}
                                onClick={() => {
                                    setActiveSpeakingItemId(null);
                                    setLeftSidebarOpen(false);
                                    setRightSidebarOpen(false);
                                }}
                            >
                                <i className="bi bi-arrow-left"></i> Quay lại danh sách
                            </button>
                            <span className={styles.studioHeaderTitle}>
                                <strong>Phòng thu âm:</strong> {assignment.title}
                            </span>
                        </div>
                        <button className={styles.btnClose} onClick={onClose}>&times;</button>
                    </div>

                    {/* Body Studio 3 Cột */}
                    <div className={styles.studioBody}>

                        {/* CỘT 1: DANH SÁCH CÂU HỎI (Trái) */}
                        <aside className={`${styles.questionSidebar} ${leftSidebarOpen ? styles.isOpen : ''}`}>
                            <div className={styles.sidebarContent}>
                                <div className={styles.sidebarHeader}>
                                    <h2 className={styles.sidebarTitle}>Danh sách câu hỏi</h2>
                                    <p className={styles.sidebarSubtitle}>{assignment.title}</p>
                                </div>

                                <div className={styles.filterContainer}>
                                    {['All', 'Part 1', 'Part 2', 'Part 3'].map((part) => (
                                        <button
                                            key={part}
                                            className={`${styles.filterTab} ${selectedPartFilter === part ? styles.activeFilterTab : ''}`}
                                            onClick={() => setSelectedPartFilter(part)}
                                        >
                                            {part === 'All' ? 'Tất cả' : part}
                                        </button>
                                    ))}
                                </div>

                                <div className={styles.questionPickerList}>
                                    {speakingItems
                                        .filter(ex => selectedPartFilter === 'All' || getPartFromType(ex.type) === selectedPartFilter)
                                        .map((ex, idx) => {
                                             const itemData = { ...ex, ...itemDetails[ex.itemId] };
                                             const itemParsed = normalizeSpeakingContent(itemData.content);
                                            return (
                                                <button
                                                    key={ex.itemId}
                                                     onClick={async () => {
                                                         const detail = await fetchItemDetail(ex.itemId);
                                                         if (detail) {
                                                             setActiveSpeakingItemId(ex.itemId);
                                                             setLeftSidebarOpen(false);
                                                         }
                                                     }}
                                                    className={`${styles.questionPickerItem} ${ex.itemId === activeSpeakingItemId ? styles.activeQuestion : ''}`}
                                                >
                                                    <div className={styles.qCircle}>Q{idx + 1}</div>
                                                    <div className={styles.qInfo}>
                                                        <div className={styles.qTitleText}>{itemParsed.question || 'Speaking'}</div>
                                                        <div className={styles.qPartText}>{ex.type || 'Part 1'}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        </aside>

                        {/* LAYER MỜ CHO MOBILE KHI MỞ CỘT 1 */}
                        {leftSidebarOpen && <div className={styles.leftBackdrop} onClick={() => setLeftSidebarOpen(false)}></div>}

                        {/* CỘT 2: MAIN WORKSPACE (Giữa) */}
                        <main className={styles.mainWorkspace}>
                            <div className={styles.mainStudioArea}>
                                {speakingResults[activeSpeakingItemId] ? (
                                    <div className={styles.feedbackReportContainer}>
                                        <AttemptDetailView
                                            results={speakingResults[activeSpeakingItemId]}
                                            onBack={() => {
                                                setSpeakingResults(prev => ({ ...prev, [activeSpeakingItemId]: null }));
                                                setActiveSubmissionId(prev => ({ ...prev, [activeSpeakingItemId]: null }));
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.recordingCard}>
                                        {/* Header của workspace */}
                                        <div className={styles.cardHeader}>
                                            <div className={styles.partBadge}>
                                                Speaking Part <span className={styles.headerPartNum}>{partNum}</span>
                                            </div>
                                            <button className={styles.historyBtn} onClick={() => setRightSidebarOpen(true)}>
                                                <i className="bi bi-clock-history"></i> Xem lịch sử
                                            </button>
                                        </div>

                                        {/* Câu hỏi & Micro */}
                                        <div className={styles.cardBody}>
                                            <div className={styles.questionCardWrapper}>
                                                <div className={styles.questionContentCard}>
                                                     <SpeakingQuestionCard content={activeSpeakingItemData?.content} type={activeSpeakingItemData?.type} />
                                                </div>
                                            </div>

                                            {/* Bộ đếm giờ & Nút ghi âm */}
                                            {isBlockedByDeadline ? (
                                                <div className="alert alert-warning text-center mx-auto" style={{ maxWidth: '500px', fontSize: '0.9rem', marginTop: '1.5rem' }}>
                                                    <i className="bi bi-exclamation-triangle-fill"></i> Hạn nộp bài tập đã kết thúc và không cho phép nộp muộn. Bạn không thể ghi âm hoặc làm câu hỏi này nữa.
                                                </div>
                                            ) : (
                                                <div className={styles.controlDock}>
                                                    {isRecording && (
                                                        <div className={styles.timerContainer}>
                                                            <div className={styles.timerLabels}>
                                                                <span>Thời gian ghi âm:</span>
                                                                <span className={styles.timeRemaining}>{formatTime(speakingTimer)} / {formatTime(timeLimit)}</span>
                                                            </div>
                                                            <div className={styles.timerBarContainer}>
                                                                <div className={styles.timerBar} style={{ width: `${Math.min(100, (speakingTimer / timeLimit) * 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={styles.recordArea}>
                                                        <p className={styles.recordPrompt}>
                                                            {speakingStatus[activeSpeakingItemId] === 'recording'
                                                                ? 'Đang ghi âm...'
                                                                : speakingStatus[activeSpeakingItemId] === 'processing'
                                                                    ? 'Đang chấm bài...'
                                                                    : 'Nhấn để bắt đầu ghi âm'}
                                                        </p>
                                                        <button
                                                            className={`${styles.recordBtn} ${speakingStatus[activeSpeakingItemId] === 'recording' ? styles.isRecordingBtn : ''}`}
                                                            onClick={speakingStatus[activeSpeakingItemId] === 'recording'
                                                                 ? () => stopSpeakingRecording(activeSpeakingItemId, activeSpeakingItemData?.type, activeSpeakingItemData?.content)
                                                                 : () => startSpeakingRecording(activeSpeakingItemId, activeSpeakingItemData?.type, activeSpeakingItemData?.content)}
                                                            disabled={speakingStatus[activeSpeakingItemId] === 'processing'}
                                                        >
                                                            <i className={`bi ${speakingStatus[activeSpeakingItemId] === 'recording' ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </main>

                        {/* CỘT 3: HISTORY SIDEBAR (Phải) */}
                        <aside className={`${styles.historySidebar} ${rightSidebarOpen ? styles.isOpen : ''}`}>
                            <div className={styles.sidebarHeaderRight}>
                                <h2 className={styles.sidebarTitle}>Lịch sử bài làm</h2>
                                <button className={styles.closeBtn} onClick={() => setRightSidebarOpen(false)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                            <div className={styles.historyList}>
                                {activeItemHistory.length === 0 ? (
                                    <div className={styles.emptyHistory}>
                                        <div className={styles.emptyHistoryIcon}>
                                            <i className="bi bi-mic"></i>
                                        </div>
                                        <div className={styles.emptyHistoryTitle}>Chưa có attempt nào</div>
                                        <p>Ghi âm bài nói đầu tiên để lịch sử luyện tập xuất hiện ở đây.</p>
                                    </div>
                                ) : (
                                    activeItemHistory.map((att, idx) => (
                                        <button
                                            key={att.submissionId}
                                            className={`${styles.historyCard} ${activeSubmissionId[activeSpeakingItemId] === att.submissionId ? styles.activeHistory : ''}`}
                                            onClick={() => {
                                                handleSelectSpeakingHistory(activeSpeakingItemId, att.submissionId);
                                                if (window.innerWidth < 1024) setRightSidebarOpen(false);
                                            }}
                                        >
                                            <div className={styles.historyTop}>
                                                <div className={styles.attName}>Attempt #{activeItemHistory.length - idx}</div>
                                                <div className={styles.attDate}>{formatDateTime(att.createdAt)}</div>
                                            </div>
                                            <div className={styles.historyBottom}>
                                                {att.status === 'Completed' ? (
                                                    <span className={styles.bandBadge}>Band {att.overallScore?.toFixed(1) || '--'}</span>
                                                ) : (
                                                    <span className={styles.statusBadge}>{att.status}</span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </aside>

                        {/* LAYER MỜ CHO MOBILE KHI MỞ CỘT 3 */}
                        {rightSidebarOpen && <div className={styles.rightBackdrop} onClick={() => setRightSidebarOpen(false)}></div>}

                        {/* NÚT MỞ SIDEBAR TRÁI TRÊN MOBILE */}
                        <button className={styles.mobileMenuBtn} onClick={() => setLeftSidebarOpen(true)}>
                            <i className="bi bi-list"></i>
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    // --- STANDARD ASSIGNMENT LIST VIEW ---
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderLeft}>
                        <h3>{assignment.title}</h3>
                        <div className={styles.modalMeta}>
                            <span className={isOverdue ? styles.dueDate : styles.dueDateOk}>
                                <i className="bi bi-calendar-event"></i> Hạn nộp: {formatDateTime(assignment.dueDate, true)}
                            </span>
                            {isOverdue && (
                                <span className="badge bg-danger rounded-pill">Quá hạn nộp</span>
                            )}
                        </div>
                    </div>
                    <button className={styles.btnClose} onClick={onClose}>&times;</button>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>

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

                                        {assignment.items?.map((summaryItem, index) => {
                                            const itemDetail = itemDetails[summaryItem.itemId];
                                            const isSpeaking = (summaryItem.itemType || '').toUpperCase() === 'AI_SPEAKING' || (summaryItem.itemType || '').toUpperCase() === 'SPEAKING';
                                            const itemTitle = summaryItem.title || (isSpeaking ? 'Bài tập Speaking' : 'Nộp tài liệu tự luận');
                                            const itemDescription = summaryItem.description || (isSpeaking
                                                ? 'Nhấn nút bên dưới để vào phòng thu âm và làm bài nói.'
                                                : 'Vui lòng làm bài và tải lên file bài làm theo đúng yêu cầu bên dưới.');

                                            if (!itemDetail || itemDetailLoadingId === summaryItem.itemId || itemDetailErrors[summaryItem.itemId]) {
                                                return (
                                                    <div key={summaryItem.itemId} className={styles.itemCard}>
                                                        <button
                                                            type="button"
                                                            onClick={() => itemDetailErrors[summaryItem.itemId]
                                                                ? fetchItemDetail(summaryItem.itemId, true)
                                                                : fetchItemDetail(summaryItem.itemId)}
                                                            className={styles.itemSummaryButton}
                                                            style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                                                        >
                                                            <div className={styles.itemHeader}>
                                                                <div className={styles.itemInfo}>
                                                                    <h4>Hạng mục {index + 1}: {itemTitle}</h4>
                                                                    <p className={styles.itemDesc}>{itemDescription}</p>
                                                                    {summaryItem.hasSubmission && (
                                                                        <span className={styles.statusCellSubmitted}>
                                                                            <i className="bi bi-check-circle-fill"></i> Đã nộp bài
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <i className={`bi bi-chevron-down ${styles.itemSummaryChevron}`} aria-hidden="true"></i>
                                                            </div>
                                                        </button>
                                                        {itemDetailLoadingId === summaryItem.itemId && (
                                                            <div className="d-flex align-items-center gap-2 text-muted p-3">
                                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                                Đang tải chi tiết hạng mục...
                                                            </div>
                                                        )}
                                                        {itemDetailErrors[summaryItem.itemId] && (
                                                            <div className="alert alert-danger m-3 mb-0">
                                                                {itemDetailErrors[summaryItem.itemId]} Vui lòng bấm vào item để thử lại.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            const item = { ...summaryItem, ...itemDetail };
                                            const itemHistory = histories[item.itemId] || itemDetail.history || [];
                                            const parsedContent = item.content && typeof item.content === 'object' ? item.content : {};
                                            const files = pendingFiles[item.itemId] || [];

                                            return (
                                                <div key={item.itemId} className={`${styles.itemCard} ${styles.itemDetailPanel}`}>

                                                    <button type="button" className={`${styles.collapseItemButton} mb-2`} onClick={() => setExpandedItemId(null)}>
                                                        <i className="bi bi-chevron-up"></i> Thu gọn hạng mục
                                                    </button>

                                                    {/* Tiêu đề & Loại bài tập */}
                                    <div className={styles.itemHeader}>
                                        <div className={styles.itemInfo}>
                                            <h4>Hạng mục {index + 1}: {parsedContent.title || (isSpeaking ? 'Bài tập Speaking' : 'Nộp tài liệu tự luận')}</h4>
                                            <p className={styles.itemDesc}>{parsedContent.description || (isSpeaking ? 'Nhấn nút bên dưới để vào phòng thu âm và làm bài nói.' : 'Vui lòng làm bài và tải lên file bài làm theo đúng yêu cầu bên dưới.')}</p>

                                            {isSpeaking && (
                                                <div className={item.maxAttempts && itemHistory.length >= item.maxAttempts ? styles.attemptLimitBadgeError : styles.attemptLimitBadge}>
                                                    <i className="bi bi-info-circle"></i> Số lần nộp: <strong>{itemHistory.length}</strong>
                                                    {item.maxAttempts ? (
                                                        <span> / Tối đa <strong>{item.maxAttempts}</strong> lần</span>
                                                    ) : (
                                                        <span> (Không giới hạn)</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {(item.itemType || '').toLowerCase() === 'filesubmission' && (
                                            <span className={styles.itemBadge}>
                                                <i className="bi bi-folder-symlink"></i> File Submission
                                            </span>
                                        )}
                                        {isSpeaking && (
                                            <span className={styles.speakingBadge}>
                                                <i className="bi bi-mic-fill"></i> Bài nói
                                            </span>
                                        )}
                                    </div>

                                    {/* Tài liệu đính kèm mẫu từ Giáo viên (Nếu có) */}
                                    {item.payloads && item.payloads.length > 0 && (
                                        <div>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                                <i className="bi bi-paperclip"></i> Tài liệu đính kèm của giáo viên:
                                            </p>
                                            <div className={styles.attachmentList}>
                                                {item.payloads.map((payload, idx) => {
                                                    const rawName = (payload && payload.dataValue) ? payload.dataValue.substring(payload.dataValue.lastIndexOf('/') + 1) : '';

                                                    const cleanFileName = (raw) => {
                                                        if (!raw) return '';
                                                        const lastDot = raw.lastIndexOf('.');
                                                        if (lastDot === -1) return raw;

                                                        const ext = raw.substring(lastDot);
                                                        let nameWithoutExt = raw.substring(0, lastDot);

                                                        const guidRegex = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
                                                        if (guidRegex.test(nameWithoutExt)) {
                                                            nameWithoutExt = nameWithoutExt.replace(guidRegex, '');
                                                        }

                                                        const prefixIdRegex = /^[0-9]+_/;
                                                        if (prefixIdRegex.test(nameWithoutExt)) {
                                                            nameWithoutExt = nameWithoutExt.replace(prefixIdRegex, '');
                                                        }

                                                        return nameWithoutExt + ext;
                                                    };

                                                    const fileName = payload.originalFileName || cleanFileName(rawName) || 'Tài liệu đính kèm';
                                                    return (
                                                        <a
                                                            key={idx}
                                                            href={payload.downloadUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.attachmentCard}
                                                            title="Bấm để tải về"
                                                        >
                                                            <i className="bi bi-file-earmark-arrow-down-fill"></i>
                                                            <span className="text-truncate">{fileName}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Khu vực nộp bài (Chỉ hiện nếu là fileSubmission) */}
                                    {(item.itemType || '').toLowerCase() === 'filesubmission' && (() => {
                                        const latestSub = itemHistory[0];
                                        const isEditing = latestSub && editingSubmissionId === latestSub.submissionId;
                                        const isGraded = latestSub?.status?.toLowerCase() === 'completed'
                                            || latestSub?.feedback?.responderType?.toLowerCase() === 'teacher';

                                        // Nếu hết hạn nộp bài và không cho phép nộp muộn
                                        if (isBlockedByDeadline) {
                                            if (itemHistory.length === 0) {
                                                return (
                                                    <div className="alert alert-warning d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.9rem' }}>
                                                        <i className="bi bi-exclamation-triangle-fill"></i> Hạn nộp bài tập đã kết thúc. Bạn không thể nộp bài tập này nữa.
                                                    </div>
                                                );
                                            }
                                        }

                                        // Nếu chưa nộp lần nào HOẶC đang trong chế độ chỉnh sửa (isEditing === true)
                                        if (itemHistory.length === 0 || (isEditing && !isGraded)) {
                                            return (
                                                <div className={styles.submitArea}>
                                                    {isEditing && (
                                                        <div className={styles.editBanner}>
                                                            <i className="bi bi-pencil-square"></i>
                                                            Đang sửa bài làm: Lần nộp #{latestSub.attemptNumber}. Bạn hãy tải lên file mới để thay thế bài cũ.
                                                        </div>
                                                    )}
                                                    <h5 className={styles.submitAreaTitle}>
                                                        <i className="bi bi-cloud-arrow-up"></i> {isEditing ? 'Tải lên file bài làm mới' : 'Tải lên bài làm của bạn'}
                                                    </h5>

                                                    {/* Uploader dùng chung tự động định dạng role */}
                                                    <CommonAttachmentUploader
                                                        files={files}
                                                        onChange={(updatedFiles) => handleFileChange(item.itemId, updatedFiles)}
                                                        maxCount={1}
                                                        allowedTypes={['.pdf', '.doc', '.docx', '.zip', '.rar']}
                                                    />

                                                    <div className={styles.actionButtonRow} style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
                                                        {isEditing && (
                                                            <button
                                                                className={styles.btnCancelEdit}
                                                                onClick={() => setEditingSubmissionId(null)}
                                                                disabled={submittingItemId === item.itemId}
                                                            >
                                                                Hủy bỏ
                                                            </button>
                                                        )}
                                                        <button
                                                            className={styles.btnSubmitHomework}
                                                            onClick={() => isEditing ? handleSaveEditedSubmission(item.itemId, latestSub.submissionId) : handleSubmitHomework(item.itemId)}
                                                            disabled={submittingItemId === item.itemId || files.length === 0}
                                                        >
                                                            {submittingItemId === item.itemId ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                                    Đang nộp bài...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-check2-circle"></i> {isEditing ? 'Lưu thay đổi' : 'Nộp bài làm'}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Ngược lại, nếu đã nộp và không phải đang sửa => Hiện Submission Status Panel và nút Edit / Remove
                                        return (
                                            <div className={styles.statusPanel}>
                                                <h5 className={styles.statusPanelTitle}>Trạng thái nộp bài</h5>

                                                {!isBlockedByDeadline && !isGraded && (
                                                    <div className={styles.actionButtonRow}>
                                                        <button
                                                            className={styles.btnEditSubmission}
                                                            onClick={() => handleEditSubmission(item.itemId, latestSub.submissionId)}
                                                        >
                                                            <i className="bi bi-pencil-square"></i> Edit submission
                                                        </button>
                                                        <button
                                                            className={styles.btnRemoveSubmission}
                                                            onClick={() => handleRemoveSubmission(item.itemId, latestSub.submissionId)}
                                                        >
                                                            <i className="bi bi-trash-fill"></i> Remove submission
                                                        </button>
                                                    </div>
                                                )}

                                                {isGraded && (
                                                    <div className="alert alert-info d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.9rem' }}>
                                                        <i className="bi bi-lock-fill"></i> Bài nộp đã được chấm nên không thể sửa hoặc xóa.
                                                    </div>
                                                )}

                                                <div className={styles.statusTable}>
                                                    <div className={styles.statusTableRow}>
                                                        <div className={styles.statusTableCellLabel}>Submission status</div>
                                                        <div className={styles.statusTableCellValue}>
                                                            <span className={styles.statusCellSubmitted}>Submitted for grading</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.statusTableRow}>
                                                        <div className={styles.statusTableCellLabel}>Grading status</div>
                                                        <div className={styles.statusTableCellValue}>
                                                            {latestSub.status === 'Completed' ? (
                                                                <span className={styles.statusCellGraded}>Graded (Band {latestSub.overallScore?.toFixed(1) || '--'})</span>
                                                            ) : (
                                                                <span className={styles.statusCellNotGraded}>Not graded</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.statusTableRow}>
                                                        <div className={styles.statusTableCellLabel}>Last modified</div>
                                                        <div className={styles.statusTableCellValue}>
                                                            {formatDateTime(latestSub.createdAt)}
                                                        </div>
                                                    </div>
                                                    <div className={styles.statusTableRow}>
                                                        <div className={styles.statusTableCellLabel}>File submissions</div>
                                                        <div className={styles.statusTableCellValue}>
                                                            {latestSub.payloads && latestSub.payloads.map((p, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={p.secureUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={styles.submittedFileLink}
                                                                >
                                                                    <i className="bi bi-file-earmark-text-fill text-primary"></i>
                                                                    {p.fileName || 'Bài nộp'}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Nút bắt đầu làm bài nói Speaking */}
                                    {isSpeaking && (
                                        <div className={styles.speakingStartArea}>
                                            <button
                                                className={styles.btnStartSpeaking}
                                                onClick={async () => {
                                                    try {
                                                        const checkData = await axiosClient.get(`/student/PracticeSpeaking/check-attempts/${item.itemId}`);
                                                        if (checkData.isLimitReached) {
                                                            Swal.fire({
                                                                icon: 'warning',
                                                                title: 'Giới hạn số lần nộp bài',
                                                                text: `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần) cho phần này.`,
                                                                confirmButtonColor: '#ef4444'
                                                            });
                                                            return;
                                                        }
                                                        setActiveSpeakingItemId(item.itemId);
                                                        setSpeakingResults(prev => ({ ...prev, [item.itemId]: null }));
                                                    } catch (err) {
                                                        console.error(err);
                                                        Swal.fire('Lỗi', 'Không thể kiểm tra giới hạn nộp bài. Vui lòng thử lại sau.', 'error');
                                                    }
                                                }}
                                            >
                                                <i className="bi bi-mic-fill"></i> Làm bài
                                            </button>
                                        </div>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <button className={styles.btnFooterClose} onClick={onClose}>Đóng lại</button>
                </div>

            </div>
        </div >
    );
}
