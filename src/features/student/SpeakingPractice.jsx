import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import axiosClient from '../../api/axiosClient';
import styles from './SpeakingPractice.module.css';
import Swal from 'sweetalert2';
import AttemptDetailView from './AttemptDetailView';
import { buildSpeechChunk, createPronunciationAssessmentConfig } from './speechChunkUtils';

export default function SpeakingPractice({
    isAssignmentMode = false,
    assignmentId = null,
    assignmentItemId = null,
    assignment = null,
    onBack = null
}) {
    const { exerciseId: routeExerciseId } = useParams();
    const navigate = useNavigate();

    const [currentItemId, setCurrentItemId] = useState(assignmentItemId || null);

    // Sync currentItemId if assignmentItemId changes
    useEffect(() => {
        if (isAssignmentMode && assignmentItemId) {
            setCurrentItemId(assignmentItemId);
        }
    }, [assignmentItemId, isAssignmentMode]);

    const activeId = isAssignmentMode ? currentItemId : routeExerciseId;

    const [exercise, setExercise] = useState(null);
    const [history, setHistory] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('idle');
    const [timer, setTimer] = useState(0);
    const [results, setResults] = useState(null);
    const [submissionId, setSubmissionId] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // UI State for sidebars
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
    const [selectedPartFilter, setSelectedPartFilter] = useState('All');

    // Azure SDK Refs
    const recognizerRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const detectPartNumber = (type, contentJson) => {
        const typeLower = (type || '').toLowerCase();
        if (typeLower.includes('part 2') || typeLower.includes('part2') || typeLower.includes('speaking2')) return 2;
        if (typeLower.includes('part 3') || typeLower.includes('part3') || typeLower.includes('speaking3')) return 3;
        if (typeLower.includes('part 1') || typeLower.includes('part1') || typeLower.includes('speaking1')) return 1;

        if (contentJson) {
            try {
                const parsed = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
                const pType = (parsed.type || parsed.part || '').toString().toLowerCase();
                if (pType.includes('part 2') || pType.includes('part2') || pType.includes('2')) return 2;
                if (pType.includes('part 3') || pType.includes('part3') || pType.includes('3')) return 3;
                if (pType.includes('part 1') || pType.includes('part1') || pType.includes('1')) return 1;

                const pContent = (parsed.passageHtml || parsed.htmlContent || parsed.textPrompt || parsed.prompt || '').toLowerCase();
                if (pContent.includes('part 2') || pContent.includes('part2')) return 2;
                if (pContent.includes('part 3') || pContent.includes('part3')) return 3;
                if (pContent.includes('part 1') || pContent.includes('part1')) return 1;
            } catch (e) {}
        }
        return 1;
    };

    const partNum = exercise ? detectPartNumber(exercise.type, exercise.contentJson) : 1;

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
                        const typeUpper = (activeSpeakingItem.itemType || '').toUpperCase();
                        setExercise({
                            itemId: activeSpeakingItem.itemId,
                            type: typeUpper === 'AI_SPEAKING' ? 'AI_SPEAKING' : 'SPEAKING',
                            contentJson: activeSpeakingItem.contentJson,
                            maxAttempts: activeSpeakingItem.maxAttempts,
                            topicName: assignment?.title,
                            topicId: null
                        });
                        loadHistory(activeSpeakingItem.itemId);
                    }
                } else {
                    if (!routeExerciseId) return;
                    // 1. Tải chi tiết bài tập hiện tại
                    const data = await axiosClient.get(`/student/exercise/${routeExerciseId}`);
                    setExercise(data);

                    // 2. Tải lịch sử nộp bài cho bài tập này (Cột trái)
                    loadHistory(routeExerciseId);
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể tải dữ liệu bài tập', 'error');
            }
        };
        loadData();
    }, [routeExerciseId, currentItemId, isAssignmentMode, assignment]);

    const loadHistory = async (targetId = null) => {
        const id = targetId || activeId;
        if (!id) return;
        try {
            setLoadingHistory(true);
            const data = await axiosClient.get(`/student/PracticeSpeaking/history/${id}`);
            setHistory(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        return () => {
            if (recognizerRef.current) {
                recognizerRef.current.close();
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            // Kiểm tra giới hạn số lượt làm bài trước khi ghi âm
            try {
                const checkUrl = isAssignmentMode
                    ? `/student/PracticeSpeaking/check-attempts/${currentItemId}`
                    : `/student/PracticeSpeaking/check-exercise-attempts/${routeExerciseId}`;
                const checkData = await axiosClient.get(checkUrl);
                if (checkData.isLimitReached) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Giới hạn số lần làm bài',
                        text: isAssignmentMode
                            ? `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần) cho phần này.`
                            : `Bạn đã đạt tới giới hạn số lần làm bài tự luyện cho phép (${checkData.maxAttempts} lần).`,
                        confirmButtonColor: '#ef4444'
                    });
                    setStatus('idle');
                    setIsRecording(false);
                    return;
                }
            } catch (err) {
                console.error("Failed to check attempt limit:", err);
            }

            // Gọi api lấy speech token động bảo mật từ backend
            let tokenData;
            try {
                tokenData = await axiosClient.get('/student/PracticeSpeaking/token');
            } catch (err) {
                console.error("Failed to fetch Speech Token:", err);
                Swal.fire('Lỗi', 'Không thể lấy token xác thực micro từ máy chủ. Vui lòng thử lại!', 'error');
                setStatus('idle');
                setIsRecording(false);
                return;
            }

            const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(tokenData.token, tokenData.region);
            speechConfig.speechRecognitionLanguage = "en-US";

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(stream);

            const pronunciationConfig = createPronunciationAssessmentConfig();

            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);

            chunksRef.current = [];

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    chunksRef.current.push(buildSpeechChunk(e.result));
                }
            };

            recognizerRef.current = recognizer;

            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            startTimeRef.current = Date.now();
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;

            recognizer.startContinuousRecognitionAsync(
                () => {
                    setIsRecording(true);
                    setStatus('recording');
                    setTimer(0);
                    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
                },
                (err) => {
                    console.error(err);
                    Swal.fire('Lỗi', 'Không thể khởi động micro', 'error');
                }
            );

        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Lỗi khởi tạo Speech SDK', 'error');
        }
    };

    const stopRecording = () => {
        if (!recognizerRef.current) return;

        setStatus('processing');
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        recognizerRef.current.stopContinuousRecognitionAsync(
            async () => {
                const duration = (Date.now() - startTimeRef.current) / 1000;

                // Trích xuất transcript từ chunks và đếm số từ
                const transcript = (chunksRef.current || []).map(c => c.DisplayText || '').join(' ').trim();
                const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

                // 1. Kiểm tra từ = 0 (lỗi mic)
                if (wordCount === 0) {
                    setStatus('idle');
                    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    }

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
                const minWords = partNum === 2 ? 20 : 10;
                if (wordCount < minWords) {
                    setStatus('idle');
                    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    }
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

                // Dừng MediaRecorder và lấy Blob
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.onstop = async () => {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        await submitToBackend(duration, audioBlob);

                        // Tắt các track của micro để giải phóng thiết bị
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    };
                    mediaRecorderRef.current.stop();
                } else {
                    await submitToBackend(duration);
                }
            },
            (err) => {
                console.error(err);
                setStatus('idle');
            }
        );
    };

    const submitToBackend = async (duration, audioBlob = null) => {
        try {
            const formData = new FormData();

            // Append các thông tin cơ bản
            if (isAssignmentMode) {
                formData.append("AssignmentItemId", parseInt(currentItemId));
                formData.append("type", exercise?.type || "");
            } else {
                formData.append("exerciseId", parseInt(routeExerciseId));
                formData.append("type", exercise?.type || "");
            }
            formData.append("question", getCleanTextQuestion(exercise?.contentJson));
            formData.append("audioDurationSeconds", duration);

            // Append chunks (JSON)
            formData.append("chunksJson", JSON.stringify(chunksRef.current));

            // Append file vật lý nếu có
            if (audioBlob) {
                formData.append("file", audioBlob, `speaking_${Date.now()}.webm`);
            }

            const resp = await axiosClient.post('/student/PracticeSpeaking/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSubmissionId(resp.submissionId);
            pollResults(resp.submissionId);
            loadHistory(isAssignmentMode ? currentItemId : routeExerciseId);
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', err.response?.data?.message || 'Không thể nộp bài', 'error');
            setStatus('idle');
        }
    };

    const pollResults = async (subId) => {
        const check = async () => {
            try {
                const data = await axiosClient.get(`/student/PracticeSpeaking/${subId}`);
                if (data.status === 'Completed') {
                    setResults(data.feedback);
                    setStatus('completed');
                    loadHistory(isAssignmentMode ? currentItemId : routeExerciseId); // Cập nhật lại lịch sử khi đã chấm xong
                    return true;
                } else if (data.status === 'Failed') {
                    Swal.fire('Lỗi', 'AI không thể xử lý bài nói của bạn.', 'error');
                    setStatus('idle');
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

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Hàm xử lý parse nội dung từ TipTap (JSON string) hoặc format đơn giản
    const renderContent = (jsonStr) => {
        if (!jsonStr) return "";
        try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.passageHtml || parsed.htmlContent || parsed.textPrompt || parsed.prompt || parsed.question;
            if (content) {
                return content.replace(/\n/g, '<br />');
            }
            return jsonStr;
        } catch (e) {
            return jsonStr; // Không phải JSON thì cứ để nguyên (dữ liệu cũ)
        }
    };

    // Bóc tách HTML thô để nộp câu hỏi sạch nhất lên AI
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
            if (parsed.prompt) {
                return parsed.prompt.trim();
            }
            const html = parsed.passageHtml || parsed.htmlContent || jsonStr;
            return stripHtml(html).trim();
        } catch (e) {
            return stripHtml(jsonStr).trim();
        }
    };

    const handleSelectHistory = async (subId) => {
        try {
            setStatus('processing');
            setSubmissionId(subId); // Sét active ID để chỉ duy nhất bài làm này sáng lên trong cột lịch sử
            const data = await axiosClient.get(`/student/PracticeSpeaking/${subId}`);
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

    if (!exercise) return <div className={styles.loading}>Đang tải phòng thu...</div>;

    const isOverdue = assignment?.dueDate ? new Date(assignment.dueDate) < new Date() : false;
    const isBlockedByDeadline = isAssignmentMode && isOverdue && !assignment?.allowLateSubmission;

    return (
        <div className={`${styles.studioContainer} ${results ? styles.resultsActive : ''}`}>
            {/* CỘT 1: HISTORY SIDEBAR (Trái) */}
            <aside className={`${styles.questionSidebar} ${leftSidebarOpen ? styles.isOpen : ''}`}>
                <div className={styles.sidebarContent}>
                    <div className={styles.sidebarHeader}>
                        <button
                            type="button"
                            onClick={isAssignmentMode ? onBack : () => navigate('/student/practice', { state: { selectedTopicId: exercise.topicId } })}
                            className={styles.sidebarBackBtn}
                        >
                            <i className="bi bi-chevron-left"></i> {isAssignmentMode ? 'Quay lại danh sách' : 'Quay lại Kho Tự Do'}
                        </button>
                        <h2 className={styles.sidebarTitle}>Lịch sử nộp bài</h2>
                        <p className={styles.sidebarSubtitle}>{isAssignmentMode ? assignment?.title : exercise.topicName}</p>
                    </div>

                    <div className={styles.historyList}>
                        {loadingHistory ? (
                            <div className={styles.loadingHistory}>Đang tải...</div>
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
                            onBack={() => {
                                setResults(null);
                                setSubmissionId(null);
                            }}
                        />
                    ) : (
                        /* BỘ KHUNG GHI ÂM CHÍNH */
                        <div className={styles.recordingCard}>
                            {/* Header */}
                            <div className={styles.cardHeader}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div className={styles.partBadge}>
                                        Speaking Part <span className={styles.headerPartNum}>{partNum}</span>
                                    </div>
                                    <div className={exercise.maxAttempts && history.length >= exercise.maxAttempts ? styles.attemptLimitBadgeError : styles.attemptLimitBadge}>
                                        <i className="bi bi-info-circle"></i> Lượt làm: <strong>{history.length}</strong>
                                        {exercise.maxAttempts ? (
                                            <span> / Tối đa <strong>{exercise.maxAttempts}</strong> lần</span>
                                        ) : (
                                            <span> (Không giới hạn)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div className={styles.cardBody}>
                                <div className={styles.questionCardWrapper}>
                                    <div className={styles.questionContentCard}>
                                        <div dangerouslySetInnerHTML={{ __html: renderContent(exercise.contentJson) }} />
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
                                                    <span>Thời gian ghi âm:</span>
                                                    <span className={styles.timeRemaining}>{formatTime(timer)} / {formatTime(timeLimit)}</span>
                                                </div>
                                                <div className={styles.timerBarContainer}>
                                                    <div className={styles.timerBar} style={{ width: `${Math.min(100, (timer / timeLimit) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Record Button Area */}
                                        <div className={styles.recordArea}>
                                            <p className={styles.recordPrompt}>
                                                {isRecording ? 'Đang ghi âm...' : status === 'processing' ? 'Đang chấm bài...' : 'Nhấn để bắt đầu ghi âm'}
                                            </p>
                                            <button
                                                className={`${styles.recordBtn} ${isRecording ? styles.isRecordingBtn : ''}`}
                                                onClick={isRecording ? stopRecording : startRecording}
                                                disabled={status === 'processing'}
                                            >
                                                <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* NÚT MỞ SIDEBAR TRÁI TRÊN MOBILE */}
            <button className={styles.mobileMenuBtn} onClick={() => setLeftSidebarOpen(true)}>
                <i className="bi bi-list"></i>
            </button>
        </div>
    );
}
