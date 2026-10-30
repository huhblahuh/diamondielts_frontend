import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './SpeakingPractice.module.css';
import { isRejectedOffTopic, isUnviewableSpeakingSubmission } from './speakingSubmissionStatus';
import { addSpeakingHistoryCard } from './gradingHistory';
import Swal from 'sweetalert2';
import AttemptDetailView from './AttemptDetailView';
import { formatSpeakingPipelineError } from './speakingAssessmentPipeline';
import { createSpeakingPipeline } from './speakingPipelineFactory';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import { parseAssignmentDueDate } from '../../utils/assignmentDate';
import PageSkeleton from '../../components/common/PageSkeleton';
import SpeakingDebugPanel from './SpeakingDebugPanel';
import { logSpeakingDiagnostic } from './speakingDiagnostics';
import useSpeakingAvailability from './useSpeakingAvailability';

export default function SpeakingPractice({
    isAssignmentMode = false,
    assignmentId = null,
    assignmentItemId = null,
    assignment = null,
    assignmentItemDetail = null,
    initialSubmissionId = null,
    onBack = null,
    embedded = false
}) {
    const { exerciseId: routeExerciseId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const outletContext = useOutletContext();
    const registerBackHandler = outletContext?.registerBackHandler;

    // Ưu tiên query param (khi render trong trang practice), fallback sang path param (route cũ)
    const practiceExerciseId = searchParams.get('exerciseId') || routeExerciseId;

    const [currentItemId, setCurrentItemId] = useState(assignmentItemId || null);

    // Sync currentItemId if assignmentItemId changes
    useEffect(() => {
        if (isAssignmentMode && assignmentItemId) {
            setCurrentItemId(assignmentItemId);
        }
    }, [assignmentItemId, isAssignmentMode]);

    const activeId = isAssignmentMode ? currentItemId : practiceExerciseId;

    const [exercise, setExercise] = useState(null);
    const [history, setHistory] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('idle');
    const [timer, setTimer] = useState(0);
    const [results, setResults] = useState(null);
    const [submissionId, setSubmissionId] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSubmissionQueueing, setIsSubmissionQueueing] = useState(false);
    const [pendingRecording, setPendingRecording] = useState(null);
    const availability = useSpeakingAvailability(isAssignmentMode
        ? { assignmentItemId: currentItemId }
        : { exerciseId: practiceExerciseId });
    const isAcceptedSubmissionProcessing = availability.status === 'processing';
    const speakingProcessingLabel = availability.displayStatus === 'Grading'
        ? 'Đang chấm bài, bạn có thể thoát' : 'Đang kiểm tra bài nói, bạn có thể thoát';

    // UI State for sidebars
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
    const [selectedPartFilter, setSelectedPartFilter] = useState('All');

    // WebM capture; transcription runs on the backend after upload.
    const assessmentPipelineRef = useRef(null);
    const timerRef = useRef(null);
    const recordingStartedAtRef = useRef(null);
    const startInProgressRef = useRef(false);
    const stopInProgressRef = useRef(false);
    const resultWasVisibleRef = useRef(false);
    const resultMarkerWasActiveRef = useRef(false);

    const resultMarkerActive = !embedded && location.state?.speakingResultOpen === true;
    const requestedSubmissionId = initialSubmissionId
        || (resultMarkerActive ? location.state?.speakingSubmissionId : null);

    // A result is a real screen from the user's perspective. Keep the URL the
    // same, but push a history entry so browser Back and swipe Back can close it.
    useEffect(() => {
        const markerWasActive = resultMarkerWasActiveRef.current;
        resultMarkerWasActiveRef.current = resultMarkerActive;

        if (markerWasActive && !resultMarkerActive && results) {
            setResults(null);
            setSubmissionId(null);
        }
    }, [resultMarkerActive, results]);

    useEffect(() => {
        const resultIsVisible = Boolean(results);

        if (resultIsVisible && !resultWasVisibleRef.current && !resultMarkerActive && !embedded) {
            navigate(`${location.pathname}${location.search}${location.hash}`, {
                state: {
                    ...(location.state || {}),
                    speakingResultOpen: true,
                    speakingSubmissionId: submissionId,
                },
            });
        }

        resultWasVisibleRef.current = resultIsVisible;
    }, [location.hash, location.pathname, location.search, location.state, navigate, resultMarkerActive, results]);

    const closeResultView = useCallback(() => {
        if (embedded) {
            setResults(null);
            setSubmissionId(null);
            return;
        }
        if (resultMarkerActive && Number(window.history.state?.idx) > 0) {
            navigate(-1);
            return;
        }

        setResults(null);
        setSubmissionId(null);
        if (resultMarkerActive) {
            const {
                speakingResultOpen: _discardedMarker,
                speakingSubmissionId: _discardedSubmission,
                ...nextState
            } = location.state || {};
            navigate(`${location.pathname}${location.search}${location.hash}`, {
                replace: true,
                state: nextState,
            });
        }
    }, [embedded, location.hash, location.pathname, location.search, location.state, navigate, resultMarkerActive]);

    const handlePageBack = useCallback(() => {
        if (rightSidebarOpen) {
            setRightSidebarOpen(false);
            return;
        }
        if (leftSidebarOpen) {
            setLeftSidebarOpen(false);
            return;
        }
        if (results) {
            closeResultView();
            return;
        }
        onBack?.();
    }, [closeResultView, leftSidebarOpen, onBack, results, rightSidebarOpen]);

    useEffect(() => {
        if (!registerBackHandler) return undefined;

        return registerBackHandler({
            canHandleBack: () => Boolean(rightSidebarOpen || leftSidebarOpen || results || onBack),
            canSwipeBack: () => !isRecording && !isSubmissionQueueing && status !== 'starting' && status !== 'processing',
            handleBack: handlePageBack,
        });
    }, [handlePageBack, isRecording, isSubmissionQueueing, leftSidebarOpen, onBack, registerBackHandler, results, rightSidebarOpen, status]);

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

    const partNum = exercise ? detectPartNumber(exercise.type, exercise.content) : 1;

    const getRecordingTimeLimit = (part) => {
        if (part === 2) return 150; // 2 minutes 30 seconds
        if (part === 3) return 60;  // 1 minute
        return 45;                  // 45 seconds for Part 1 / default
    };
    const timeLimit = getRecordingTimeLimit(partNum);

    // Tự động dừng ghi âm khi hết thời gian
    useEffect(() => {
        if (isRecording && timer >= timeLimit) {
            void stopRecording(false);
        }
    }, [timer, isRecording, timeLimit, partNum]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Reset states khi chuyển câu hỏi để kết quả cũ không bị giữ lại
                setResults(null);
                setSubmissionId(null);
                setStatus('idle');
                setPendingRecording(null);

                if (isAssignmentMode) {
                    if (!currentItemId) return;
                    const activeSpeakingItem = assignment?.items?.find(it => it.itemId === parseInt(currentItemId));
                    if (activeSpeakingItem) {
                        let itemDetail = assignmentItemDetail;
                        if (!itemDetail?.content && assignmentId) {
                            itemDetail = await axiosClient.get(
                                `/student/assignment/${assignmentId}/items/${currentItemId}`
                            );
                        }

                        const itemData = { ...activeSpeakingItem, ...(itemDetail || {}) };
                        const typeUpper = (itemData.itemType || '').toUpperCase();
                        setExercise({
                            itemId: itemData.itemId,
                            type: itemData.type || (typeUpper === 'AI_SPEAKING' ? 'AI_SPEAKING' : 'SPEAKING'),
                            content: itemData.content,
                            maxAttempts: itemData.maxAttempts,
                            topicName: assignment?.title,
                            topicId: null
                        });
                        const historyItems = await loadHistory(activeSpeakingItem.itemId);
                        if (requestedSubmissionId) {
                            handleSelectHistory(requestedSubmissionId, historyItems);
                        }
                    }
                } else {
                    if (!practiceExerciseId) return;
                    // 1. Tải chi tiết bài tập hiện tại
                    const data = await axiosClient.get(`/student/exercise/${practiceExerciseId}`);
                    setExercise(data);

                    // 2. Tải lịch sử nộp bài cho bài tập này (Cột trái)
                    const historyItems = await loadHistory(practiceExerciseId);
                    if (requestedSubmissionId) {
                        handleSelectHistory(requestedSubmissionId, historyItems);
                    }
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể tải dữ liệu bài tập', 'error');
            }
        };
        loadData();
    }, [practiceExerciseId, currentItemId, isAssignmentMode, assignmentId, assignment, assignmentItemDetail, requestedSubmissionId]);

    const loadHistory = async (targetId = null) => {
        const id = targetId || activeId;
        if (!id) return [];
        try {
            setLoadingHistory(true);
            if (isAssignmentMode) {
                const currentAssignmentId = assignmentId || assignment?.assignmentId;
                if (!currentAssignmentId) {
                    setHistory([]);
                    return [];
                }

                const itemDetail = await axiosClient.get(
                    `/student/assignment/${currentAssignmentId}/items/${id}`
                );
                const items = itemDetail?.history || [];
                setHistory(items);
                return items;
            } else {
                const data = await axiosClient.get(`/student/PracticeSpeaking/history/${id}`);
                const items = data || [];
                setHistory(items);
                return items;
            }
        } catch (err) {
            console.error(err);
            return [];
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        return () => {
            logSpeakingDiagnostic('speaking_view_unmounted', {
                hadPipeline: Boolean(assessmentPipelineRef.current),
            });
            assessmentPipelineRef.current?.dispose();
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
        };
    }, []);

    const startRecording = async () => {
        // Prevent rapid double-clicks from starting multiple pipelines/timers.
        if (
            startInProgressRef.current
            || stopInProgressRef.current
            || assessmentPipelineRef.current
            || availability.status !== 'available'
        ) return;

        startInProgressRef.current = true;
        setStatus('starting');
        logSpeakingDiagnostic('recording_requested', { part: partNum, assignmentMode: isAssignmentMode });

        try {
            // Kiểm tra giới hạn số lượt làm bài trước khi ghi âm
            try {
                const checkUrl = isAssignmentMode
                    ? `/student/PracticeSpeaking/check-attempts/${currentItemId}`
                    : `/student/PracticeSpeaking/check-exercise-attempts/${practiceExerciseId}`;
                const checkData = await axiosClient.get(checkUrl);
                logSpeakingDiagnostic('attempt_check_complete', { limitReached: Boolean(checkData.isLimitReached) });
                if (checkData.isLimitReached) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Giới hạn số lần làm bài',
                        text: isAssignmentMode
                            ? `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần) cho phần này.`
                            : 'Bạn không còn đủ kim cương để luyện Speaking tự do.',
                        confirmButtonColor: '#ef4444'
                    });
                    setStatus('idle');
                    setIsRecording(false);
                    return;
                }
            } catch (err) {
                logSpeakingDiagnostic('attempt_check_failed', { code: err?.code ?? null, status: err?.status ?? null });
                console.error("Failed to check attempt limit:", err);
            }

            const pipeline = createSpeakingPipeline();
            assessmentPipelineRef.current = pipeline;
            await pipeline.start();
            logSpeakingDiagnostic('recording_started', pipeline.diagnosticState());

            setIsRecording(true);
            setPendingRecording(null);
            setStatus('recording');
            setTimer(0);
            recordingStartedAtRef.current = performance.now();

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                const startedAt = recordingStartedAtRef.current;
                if (startedAt === null) return;

                const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
                setTimer(Math.min(elapsedSeconds, timeLimit));
            }, 250);

        } catch (err) {
            logSpeakingDiagnostic('recording_start_failed', { code: err?.code || err?.name || 'UNKNOWN' });
            console.error('Speaking recording could not start:', err);
            assessmentPipelineRef.current = null;
            setStatus('idle');
            Swal.fire('Không thể bắt đầu ghi âm', formatSpeakingPipelineError(err), 'error');
        } finally {
            startInProgressRef.current = false;
        }
    };

    const stopRecording = async (submitImmediately = true) => {
        if (stopInProgressRef.current || !assessmentPipelineRef.current) return;

        stopInProgressRef.current = true;
        const pipeline = assessmentPipelineRef.current;
        logSpeakingDiagnostic('recording_stop_requested', pipeline.diagnosticState());

        setStatus('processing');
        setIsSubmissionQueueing(true);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        recordingStartedAtRef.current = null;

        try {
            const outcome = await pipeline.stop();
            logSpeakingDiagnostic('recording_finalized', {
                durationMs: Math.round(outcome.durationSeconds * 1000),
                fileBytes: outcome.audioBlob?.size ?? 0,
                fileMimeType: outcome.audioBlob?.type ?? null,
            });
            if (assessmentPipelineRef.current === pipeline) {
                assessmentPipelineRef.current = null;
            }
            const duration = outcome.durationSeconds;

            if (!outcome.audioBlob?.size) {
                setStatus('idle');
                setIsSubmissionQueueing(false);

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

            if (submitImmediately) {
                await submitToBackend(duration, outcome.audioBlob);
            } else {
                setPendingRecording({ duration, audioBlob: outcome.audioBlob });
                setStatus('ready');
                setIsSubmissionQueueing(false);
            }
        } catch (err) {
            logSpeakingDiagnostic('recording_stop_failed', {
                code: err?.code || err?.name || 'UNKNOWN',
                ...pipeline.diagnosticState(),
            });
            console.error('Speaking recording could not finish:', err);
            if (assessmentPipelineRef.current === pipeline) {
                assessmentPipelineRef.current = null;
            }
            setStatus('idle');
            setIsSubmissionQueueing(false);
            Swal.fire('Chưa thể nộp bài nói', formatSpeakingPipelineError(err), 'error');
        } finally {
            stopInProgressRef.current = false;
        }
    };

    const submitPendingRecording = async () => {
        if (!pendingRecording || isSubmissionQueueing) return;
        setStatus('processing');
        setIsSubmissionQueueing(true);
        const submitted = await submitToBackend(pendingRecording.duration, pendingRecording.audioBlob);
        if (submitted) setPendingRecording(null);
        else setStatus('ready');
    };

    const submitToBackend = async (
        duration,
        audioBlob = null
    ) => {
        if (!availability.beginSubmit()) {
            setIsSubmissionQueueing(false);
            setStatus('idle');
            void availability.refresh();
            Swal.fire('Chưa thể nộp bài', 'Vui lòng kiểm tra lại trạng thái bài nói trước khi nộp.', 'warning');
            return false;
        }
        const uploadStartedAt = performance.now();
        try {
            logSpeakingDiagnostic('submission_upload_started', {
                durationMs: Math.round(duration * 1000),
                fileBytes: audioBlob?.size ?? 0,
                fileMimeType: audioBlob?.type ?? null,
            });
            const formData = new FormData();

            // Append các thông tin cơ bản
            if (isAssignmentMode) {
                formData.append("AssignmentItemId", parseInt(currentItemId));
            } else {
                formData.append("exerciseId", parseInt(practiceExerciseId));
            }
            formData.append(
                "audioDurationMilliseconds",
                String(Math.round(duration * 1000)),
            );

            // Append file vật lý nếu có
            if (audioBlob) {
                formData.append("file", audioBlob, `speaking_${Date.now()}.webm`);
            }

            const resp = await axiosClient.post('/student/submissions/speaking', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            logSpeakingDiagnostic('submission_upload_accepted', {
                requestId: resp.requestId,
                elapsedMs: Math.round(performance.now() - uploadStartedAt),
            });

            setHistory(previous => addSpeakingHistoryCard(previous, {
                submissionId: resp.submissionId,
                displayStatus: 'Checking',
            }));
            void loadHistory(activeId);
            setIsSubmissionQueueing(false);
            setStatus('idle');
            availability.submitted();
            return true;
        } catch (err) {
            logSpeakingDiagnostic('submission_upload_failed', {
                code: err?.code ?? null,
                status: err?.status ?? null,
                elapsedMs: Math.round(performance.now() - uploadStartedAt),
            });
            console.error(err);
            availability.submitFailed(err.code === 'SUBMISSION_IN_PROGRESS');
            if (err.code === 'OFF_TOPIC') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Nội dung chưa phù hợp',
                    text: err.message,
                    confirmButtonText: 'Nói lại'
                });
            } else if (err.code === 'OFF_TOPIC_RETRY_LIMIT') {
                Swal.fire(
                    'Chưa thể gửi bài',
                    err.message,
                    'warning'
                );
            } else {
                Swal.fire(
                    'Lỗi',
                    err.message || 'Không thể nộp bài. Vui lòng thử lại.',
                    'error'
                );
            }
            setStatus('idle');
            setIsSubmissionQueueing(false);
            return false;
        }
    };

    useEffect(() => {
        if (!activeId) return undefined;
        const updateCard = event => {
            const detail = event.detail;
            if (isAssignmentMode
                ? Number(detail?.assignmentItemId) !== Number(currentItemId)
                : Number(detail?.exerciseId) !== Number(practiceExerciseId) || detail?.assignmentItemId) return;
            setHistory(previous => addSpeakingHistoryCard(previous, detail));
        };
        const refresh = event => {
            const detail = event?.detail;
            if (detail?.type && !['SpeakingCompleted', 'SpeakingFailed', 'SpeakingOffTopic'].includes(detail.type)) return;
            if (detail?.assignmentItemId && isAssignmentMode
                && Number(detail.assignmentItemId) !== Number(currentItemId)) return;
            if (detail?.exerciseId && !isAssignmentMode
                && Number(detail.exerciseId) !== Number(practiceExerciseId)) return;
            if (detail?.assignmentItemId && !isAssignmentMode) return;
            if (detail?.exerciseId && isAssignmentMode) return;
            void loadHistory(activeId);
        };
        window.addEventListener('diamond:notification-received', refresh);
        window.addEventListener('diamond:speaking-history-refresh', refresh);
        window.addEventListener('diamond:speaking-availability-changed', updateCard);
        return () => {
            window.removeEventListener('diamond:notification-received', refresh);
            window.removeEventListener('diamond:speaking-history-refresh', refresh);
            window.removeEventListener('diamond:speaking-availability-changed', updateCard);
        };
    }, [activeId, isAssignmentMode, currentItemId, practiceExerciseId]);

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSelectHistory = async (subId, historyItems = history) => {
        const selected = historyItems.find(item => String(item.submissionId) === String(subId));
        if (isUnviewableSpeakingSubmission(selected?.status)) return;
        try {
            setStatus('processing');
            setSubmissionId(subId); // Sét active ID để chỉ duy nhất bài làm này sáng lên trong cột lịch sử
            const data = await axiosClient.get(`/student/submissions/speaking/${subId}`);
            setResults(data.feedback);
            setStatus('completed');
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể xem chi tiết bài nộp cũ', 'error');
            setStatus('idle');
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

    if (!exercise) return <PageSkeleton variant="speaking" />;

    const isOverdue = assignment?.dueDate ? parseAssignmentDueDate(assignment.dueDate) < new Date() : false;
    const isBlockedByDeadline = isAssignmentMode && isOverdue && !assignment?.allowLateSubmission;
    const speakingContent = normalizeSpeakingContent(exercise.content);

    return (
        <div className={`${styles.studioContainer} ${results ? styles.resultsActive : ''} ${embedded ? styles.embedded : ''}`}>
            {/* CỘT 1: HISTORY SIDEBAR (Trái) */}
            <aside className={`${styles.questionSidebar} ${leftSidebarOpen ? styles.isOpen : ''}`}>
                <div className={styles.sidebarContent}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.sidebarHeaderTop}>
                            <button
                                type="button"
                                onClick={onBack ? onBack : () => navigate('/student/practice')}
                                className={styles.sidebarBackBtn}
                            >
                                <i className="bi bi-chevron-left"></i> {isAssignmentMode ? 'Quay lại' : 'Kho Tự Do'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftSidebarOpen(false)}
                                className={styles.sidebarCloseBtn}
                                aria-label="Đóng lịch sử"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <h2 className={styles.sidebarTitle}>Lịch sử nộp bài</h2>
                        <p className={styles.sidebarSubtitle}>{isAssignmentMode ? assignment?.title : exercise.topicName}</p>
                    </div>

                    <div className={styles.historyList}>
                        {loadingHistory ? (
                            <div className={styles.loadingHistory}>
                                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                <span>Đang tải lịch sử...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className={styles.emptyHistory}>
                                <div className={styles.emptyHistoryIcon}>
                                    <i className="bi bi-mic"></i>
                                </div>
                                <div className={styles.emptyHistoryTitle}>Chưa có attempt nào</div>
                                <p>Ghi âm bài nói đầu tiên để lịch sử luyện tập xuất hiện ở đây.</p>
                            </div>
                        ) : (
                            history.map((att) => (
                                <button
                                    key={att.submissionId}
                                    className={`${styles.historyCard} ${submissionId === att.submissionId ? styles.activeHistory : ''}`}
                                    disabled={isUnviewableSpeakingSubmission(att.status)}
                                    onClick={() => {
                                        handleSelectHistory(att.submissionId);
                                        setLeftSidebarOpen(false);
                                    }}
                                >
                                    <div className={styles.historyTop}>
                                        <div className={styles.attName}>{isRejectedOffTopic(att.status) ? 'Bài nói lạc đề' : `Attempt #${att.attemptNumber}`}</div>
                                        <div className={styles.attDate}>{formatDateTime(att.createdAt)}</div>
                                    </div>
                                    <div className={styles.historyBottom}>
                                        {isRejectedOffTopic(att.status) ? (
                                            <span className={styles.statusBadge}>Off Topic</span>
                                        ) : att.status === 'Completed' ? (
                                            <span className={styles.bandBadge}>Band {att.overallScore?.toFixed(1) || '--'}</span>
                                        ) : (
                                            <span className={styles.statusBadge}>{att.status}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </aside>

            {/* LAYER MỜ CHO MOBILE KHI MỞ CỘT 1 */}
            {leftSidebarOpen && <div className={styles.leftBackdrop} onClick={() => setLeftSidebarOpen(false)}></div>}

            {/* CỘT 2: MAIN WORKSPACE (Giữa) */}
            <main className={styles.mainWorkspace}>
                <div className={styles.mainStudioArea}>
                    {results ? (
                        <AttemptDetailView
                            results={results}
                            onBack={closeResultView}
                        />
                    ) : (
                        /* BỘ KHUNG GHI ÂM CHÍNH */
                        <div className={styles.recordingCard}>
                            {/* Header */}
                            <div className={styles.cardHeader}>
                                <div className={styles.cardHeaderLeft}>
                                    <div className={styles.partBadge}>
                                        Speaking Part <span className={styles.headerPartNum}>{partNum}</span>
                                    </div>
                                </div>
                                <div className={styles.cardHeaderRight}>
                                    <button
                                        type="button"
                                        className={styles.historyBtn}
                                        onClick={() => setLeftSidebarOpen(prev => !prev)}
                                        title="Xem danh sách bài đã nộp"
                                    >
                                        <i className="bi bi-clock-history"></i>
                                        <span>Lịch sử ({history.length})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div className={styles.cardBody}>
                                <div className={styles.questionCardWrapper}>
                                    <div className={styles.questionContentCard}>
                                        <div className={styles.questionText}>{speakingContent.question}</div>
                                        {speakingContent.suggestions.length > 0 && (
                                            <>
                                                <strong>You should say:</strong>
                                                <ul>
                                                    {speakingContent.suggestions.map((suggestion, index) => (
                                                        <li key={`${suggestion}-${index}`}>{suggestion}</li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Recording Controls */}
                                {isBlockedByDeadline ? (
                                    <div className="alert alert-warning text-center mx-auto" style={{ maxWidth: '500px', fontSize: '0.9rem', marginTop: '1.5rem' }}>
                                        <i className="bi bi-exclamation-triangle-fill"></i> Hạn nộp bài tập đã kết thúc và không cho phép nộp muộn. Bạn không thể ghi âm hoặc làm câu hỏi này nữa.
                                    </div>
                                ) : (
                                    <div className={styles.controlDock}>
                                        {/* Timer (Hiện khi đang record) */}
                                        {isRecording && (
                                            <div className={styles.timerContainer}>
                                                <div className={styles.timerLabels}>
                                                    <span className={styles.timerStatusText}>
                                                        <span className={styles.recordingDot}></span> Đang ghi âm:
                                                    </span>
                                                    <span className={styles.timeRemaining}>{formatTime(timer)} / {formatTime(timeLimit)}</span>
                                                </div>
                                                <div className={styles.timerBarContainer}>
                                                    <div className={styles.timerBar} style={{ width: `${Math.min(100, (timer / timeLimit) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Record Button Area */}
                                        <div className={styles.recordArea}>
                                            {pendingRecording && !isRecording ? (
                                                <div className={styles.recordingActions}>
                                                    <button type="button" className={styles.submitRecordingBtn}
                                                        onClick={() => void submitPendingRecording()}
                                                        disabled={isSubmissionQueueing || availability.status !== 'available'}>
                                                        <i className="bi bi-cloud-arrow-up-fill" aria-hidden="true" /> Nộp bài
                                                    </button>
                                                    <button type="button" className={styles.retakeRecordingBtn}
                                                        onClick={() => void startRecording()}
                                                        disabled={isSubmissionQueueing || availability.status !== 'available'}>
                                                        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Ghi âm lại
                                                    </button>
                                                </div>
                                            ) : availability.status !== 'loading' && availability.status !== 'error' && <div className={styles.recordBtnWrapper}>
                                                {isRecording && (
                                                    <div className={styles.waveRipples}>
                                                        <span className={styles.ripple1}></span>
                                                        <span className={styles.ripple2}></span>
                                                        <span className={styles.ripple3}></span>
                                                    </div>
                                                )}
                                                <button
                                                    className={`${styles.recordBtn} ${isRecording ? styles.isRecordingBtn : ''}`}
                                                    onClick={isRecording ? () => void stopRecording() : () => void startRecording()}
                                                    disabled={status === 'starting' || isSubmissionQueueing || (!isRecording && availability.status !== 'available')}
                                                    title={isAcceptedSubmissionProcessing ? speakingProcessingLabel : availability.status === 'loading' ? 'Đang kiểm tra trạng thái bài' : availability.status === 'error' ? 'Chưa thể kiểm tra trạng thái bài' : isSubmissionQueueing ? 'Đang gửi bài lên hệ thống' : isRecording ? 'Dừng ghi âm & nộp bài' : 'Nhấn để bắt đầu nói'}
                                                >
                                                    {isAcceptedSubmissionProcessing ? (
                                                        <span className="spinner-border" role="status" aria-label="Bài đang được xử lý"></span>
                                                    ) : isSubmissionQueueing ? (
                                                        <span className="spinner-border" role="status" aria-label="Đang nộp bài"></span>
                                                    ) : (
                                                        <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                                                    )}
                                                </button>
                                            </div>}
                                            <p className={`${styles.recordPrompt} ${isRecording ? styles.promptRecording : ''}`}>
                                                {isSubmissionQueueing ? 'Đang nộp bài...' : pendingRecording ? 'Đã hết thời gian. Chọn nộp bài hoặc ghi âm lại.' : isAcceptedSubmissionProcessing ? speakingProcessingLabel : isRecording ? 'Đang ghi âm bài nói... Nhấn để hoàn thành' : status === 'starting' ? 'Đang chuẩn bị micro...' : availability.status === 'loading' ? 'Đang kiểm tra trạng thái bài...' : availability.status === 'error' ? 'Chưa thể kiểm tra trạng thái bài. Vui lòng tải lại trang.' : availability.status === 'unavailable' ? 'Bạn đã hết lượt làm bài.' : 'Nhấn vào micro để bắt đầu làm bài'}
                                            </p>
                                            {availability.status === 'error' && (
                                                <button type="button" className="btn btn-outline-secondary mt-2" onClick={() => void availability.refresh()}>
                                                    Thử kiểm tra lại
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <SpeakingDebugPanel />
        </div>
    );
}
