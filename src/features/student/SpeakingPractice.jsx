import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './SpeakingPractice.module.css';
import Swal from 'sweetalert2';
import AttemptDetailView from './AttemptDetailView';
import { SonioxSdkSpeakingPipeline, formatSpeakingPipelineError } from './soniox/SonioxSdkSpeakingPipeline';
import { createAttempt, logSpeaking, finishAttempt, speakingErrorCode } from './speaking-monitor';
import { getSpeakingPrompt, normalizeSpeakingContent } from '../../utils/speakingContent';
import { parseAssignmentDueDate } from '../../utils/assignmentDate';
import PageSkeleton from '../../components/common/PageSkeleton';

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

    // UI State for sidebars
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
    const [selectedPartFilter, setSelectedPartFilter] = useState('All');

    // Soniox realtime transcript and local WebM capture.
    const assessmentPipelineRef = useRef(null);
    const speakingAttemptRef = useRef(null);
    const timerRef = useRef(null);
    const pollTimeoutRef = useRef(null);
    const pollGenerationRef = useRef(0);
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
            stopRecording();
            Swal.fire({
                icon: 'info',
                title: 'Hết thời gian ghi âm',
                text: `Thời gian ghi âm tối đa cho Part ${partNum} là ${formatTime(timeLimit)}. Hệ thống đang chấm bài của bạn.`,
                timer: 4000,
                showConfirmButton: false
            });
        }
    }, [timer, isRecording, timeLimit, partNum]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Reset states khi chuyển câu hỏi để kết quả cũ không bị giữ lại
                setResults(null);
                setSubmissionId(null);
                setStatus('idle');

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
                        loadHistory(activeSpeakingItem.itemId);
                        if (requestedSubmissionId) {
                            handleSelectHistory(requestedSubmissionId);
                        }
                    }
                } else {
                    if (!practiceExerciseId) return;
                    // 1. Tải chi tiết bài tập hiện tại
                    const data = await axiosClient.get(`/student/exercise/${practiceExerciseId}`);
                    setExercise(data);

                    // 2. Tải lịch sử nộp bài cho bài tập này (Cột trái)
                    loadHistory(practiceExerciseId);
                    if (requestedSubmissionId) {
                        handleSelectHistory(requestedSubmissionId);
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
        if (!id) return;
        try {
            setLoadingHistory(true);
            if (isAssignmentMode) {
                const currentAssignmentId = assignmentId || assignment?.assignmentId;
                if (!currentAssignmentId) {
                    setHistory([]);
                    return;
                }

                const itemDetail = await axiosClient.get(
                    `/student/assignment/${currentAssignmentId}/items/${id}`
                );
                setHistory(itemDetail?.history || []);
            } else {
                const data = await axiosClient.get(`/student/PracticeSpeaking/history/${id}`);
                setHistory(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        return () => {
            pollGenerationRef.current += 1;
            if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
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
        ) return;

        startInProgressRef.current = true;
        setStatus('starting');

        try {
            // Kiểm tra giới hạn số lượt làm bài trước khi ghi âm
            try {
                const checkUrl = isAssignmentMode
                    ? `/student/PracticeSpeaking/check-attempts/${currentItemId}`
                    : `/student/PracticeSpeaking/check-exercise-attempts/${practiceExerciseId}`;
                const checkData = await axiosClient.get(checkUrl);
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
                console.error("Failed to check attempt limit:", err);
            }

            const attempt = createAttempt('legacy');
            speakingAttemptRef.current = attempt;
            void logSpeaking(attempt, 'STARTED');

            // Gọi api lấy speech token động bảo mật từ backend theo Part (Task)
            let tokenData;
            try {
                tokenData = await axiosClient.get(`/student/PracticeSpeaking/token?speakingTask=${partNum}`);
            } catch (err) {
                console.error("Failed to fetch Speech Token:", err);
                finishAttempt(speakingAttemptRef.current, 'FAILED', speakingErrorCode(err, 'SUBMISSION_FAILED'));
                speakingAttemptRef.current = null;
                Swal.fire('Lỗi', 'Không thể bắt đầu ghi âm. Vui lòng thử lại sau.', 'error');
                setStatus('idle');
                setIsRecording(false);
                return;
            }

            const pipeline = new SonioxSdkSpeakingPipeline({
                credentials: tokenData,
                question: getSpeakingPrompt(exercise?.content),
                partNumber: partNum
            });
            assessmentPipelineRef.current = pipeline;
            await pipeline.start();

            setIsRecording(true);
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
            console.error('Speaking recording could not start:', err);
            finishAttempt(speakingAttemptRef.current, 'FAILED', speakingErrorCode(err, 'MIC_RECORDING_FAILED'));
            speakingAttemptRef.current = null;
            assessmentPipelineRef.current = null;
            setStatus('idle');
            Swal.fire('Không thể bắt đầu ghi âm', formatSpeakingPipelineError(err), 'error');
        } finally {
            startInProgressRef.current = false;
        }
    };

    const stopRecording = async () => {
        if (stopInProgressRef.current || !assessmentPipelineRef.current) return;

        stopInProgressRef.current = true;
        const pipeline = assessmentPipelineRef.current;

        setStatus('processing');
        setIsSubmissionQueueing(true);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        recordingStartedAtRef.current = null;

        try {
            const outcome = await pipeline.stop();
            if (assessmentPipelineRef.current === pipeline) {
                assessmentPipelineRef.current = null;
            }
            const duration = outcome.durationSeconds;

            // Trích xuất transcript từ chunks và đếm số từ
            const transcript = outcome.transcript;
            const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

            // 1. Kiểm tra từ = 0 (lỗi mic)
            if (wordCount === 0) {
                finishAttempt(speakingAttemptRef.current, 'FAILED', 'SONIOX_NO_TRANSCRIPT');
                speakingAttemptRef.current = null;
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

            // 2. Kiểm tra độ dài bài nói dựa trên Part
            const minWords = partNum === 2 ? 20 : 10;
            if (wordCount < minWords) {
                finishAttempt(speakingAttemptRef.current, 'FAILED', 'UNKNOWN');
                speakingAttemptRef.current = null;
                setStatus('idle');
                setIsSubmissionQueueing(false);
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

            await submitToBackend(
                duration,
                outcome.audioBlob,
                outcome.transcript,
                outcome.tokens,
                outcome.sessionId
            );
        } catch (err) {
            console.error('Speaking recording could not finish:', err);
            finishAttempt(speakingAttemptRef.current, 'FAILED', speakingErrorCode(err, 'MIC_RECORDING_FAILED'));
            speakingAttemptRef.current = null;
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

    const submitToBackend = async (
        duration,
        audioBlob = null,
        sonioxTranscript = '',
        sonioxTokens = [],
        sessionId = ''
    ) => {
        try {
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
            formData.append("sonioxTranscript", sonioxTranscript);
            formData.append("sonioxTokensJson", JSON.stringify(sonioxTokens));
            formData.append("sonioxFinalized", "true");
            formData.append("speechSessionId", sessionId || "");

            // Append file vật lý nếu có
            if (audioBlob) {
                formData.append("file", audioBlob, `speaking_${Date.now()}.webm`);
            }

            const resp = await axiosClient.post('/student/submissions/speaking', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Backend đã nhận và queue bài thành công: trả nút record về ngay,
            // việc chấm điểm tiếp tục chạy nền qua pollResults.
            setIsSubmissionQueueing(false);
            setStatus('processing');
            setSubmissionId(resp.submissionId);
            const attempt = speakingAttemptRef.current;
            speakingAttemptRef.current = null;
            pollResults(resp.submissionId, attempt);
            loadHistory(isAssignmentMode ? currentItemId : practiceExerciseId);
            return true;
        } catch (err) {
            console.error(err);
            finishAttempt(speakingAttemptRef.current, 'FAILED', speakingErrorCode(err, 'SUBMISSION_FAILED'));
            speakingAttemptRef.current = null;
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

    const pollResults = (subId, attempt) => {
        pollGenerationRef.current += 1;
        const generation = pollGenerationRef.current;
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
        const check = async () => {
            try {
                const data = await axiosClient.get(`/student/submissions/${subId}`);
                if (generation !== pollGenerationRef.current) return true;
                if (data.feedback?.pronunciationReport) {
                    setResults(current => ({
                        ...(current || {}),
                        ...data.feedback,
                        __partial: data.status !== 'Completed'
                    }));
                }
                if (data.status === 'Completed') {
                    setResults(data.feedback);
                    setStatus('completed');
                    finishAttempt(attempt, 'SUCCESS');
                    loadHistory(isAssignmentMode ? currentItemId : practiceExerciseId); // Cập nhật lại lịch sử khi đã chấm xong
                    return true;
                } else if (data.status === 'Failed') {
                    finishAttempt(attempt, 'FAILED', speakingErrorCode(data, 'UNKNOWN'));
                    Swal.fire('Không thể xử lý', 'Bài nói chưa được xử lý. Vui lòng thử lại.', 'error');
                    setStatus('idle');
                    return true;
                }
                if (data.status === 'Grading') {
                    setStatus('processing');
                }
                return false;
            } catch (err) {
                if (generation !== pollGenerationRef.current) return true;
                console.error('Speaking result polling failed; retrying:', err);
                return false;
            }
        };

        const poll = async () => {
            const done = await check();
            if (!done && generation === pollGenerationRef.current) {
                pollTimeoutRef.current = setTimeout(poll, 3000);
            }
        };
        pollTimeoutRef.current = setTimeout(poll, 3000);
    };

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSelectHistory = async (subId) => {
        try {
            setStatus('processing');
            setSubmissionId(subId); // Sét active ID để chỉ duy nhất bài làm này sáng lên trong cột lịch sử
            const data = await axiosClient.get(`/student/submissions/${subId}`);
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
                            history.map((att, idx) => (
                                <button
                                    key={att.submissionId}
                                    className={`${styles.historyCard} ${submissionId === att.submissionId ? styles.activeHistory : ''}`}
                                    onClick={() => {
                                        handleSelectHistory(att.submissionId);
                                        setLeftSidebarOpen(false);
                                    }}
                                >
                                    <div className={styles.historyTop}>
                                        <div className={styles.attName}>Attempt #{history.length - idx}</div>
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
                                            <div className={styles.recordBtnWrapper}>
                                                {isRecording && (
                                                    <div className={styles.waveRipples}>
                                                        <span className={styles.ripple1}></span>
                                                        <span className={styles.ripple2}></span>
                                                        <span className={styles.ripple3}></span>
                                                    </div>
                                                )}
                                                <button
                                                    className={`${styles.recordBtn} ${isRecording ? styles.isRecordingBtn : ''}`}
                                                    onClick={isRecording ? stopRecording : startRecording}
                                                    disabled={status === 'starting' || status === 'processing' || isSubmissionQueueing}
                                                    title={isSubmissionQueueing ? 'Đang gửi bài lên hệ thống' : isRecording ? 'Dừng ghi âm & nộp bài' : 'Nhấn để bắt đầu nói'}
                                                >
                                                    {isSubmissionQueueing ? (
                                                        <span className="spinner-border" role="status" aria-label="Đang nộp bài"></span>
                                                    ) : (
                                                        <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                                                    )}
                                                </button>
                                            </div>
                                            <p className={`${styles.recordPrompt} ${isRecording ? styles.promptRecording : ''}`}>
                                                {isRecording ? 'Đang ghi âm bài nói... Nhấn để hoàn thành' : status === 'starting' ? 'Đang chuẩn bị micro...' : isSubmissionQueueing ? 'Đang nộp bài...' : status === 'processing' ? 'Bài đã được gửi và đang được chấm điểm...' : 'Nhấn vào micro để bắt đầu làm bài'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

        </div>
    );
}
