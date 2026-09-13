import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation, useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import assignmentService from '../../api/services/assignment.service';
import styles from './AssignmentDetailPage.module.css';
import Swal from 'sweetalert2';
import { showToastError } from '../../utils/toast';
import Skeleton from '../../components/common/Skeleton';
import SpeakingPractice from '../../features/student/SpeakingPractice';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import CommonAttachmentUploader from '../../components/CommonAttachmentUploader';

const detectPartNumber = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('part 2') || typeLower.includes('part2') || typeLower.includes('speaking2')) return 2;
    if (typeLower.includes('part 3') || typeLower.includes('part3') || typeLower.includes('speaking3')) return 3;
    if (typeLower.includes('part 1') || typeLower.includes('part1') || typeLower.includes('speaking1')) return 1;
    return 1;
};

const formatDueDate = (isoStr) => {
    if (!isoStr) return 'Không thời hạn';
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} · ${date}`;
};

const getRemainingDaysText = (isoStr) => {
    if (!isoStr) return 'Không thời hạn';
    const diff = new Date(isoStr).getTime() - Date.now();
    if (diff <= 0) return 'Quá hạn nộp';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return 'Sắp hết hạn';
};

const formatDateTime = (isoStr) => {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} · ${date}`;
};

const truncateText = (text, maxLength = 80) => {
    const value = String(text || '').trim();
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength).trimEnd()}…`;
};

const cleanFileName = (raw) => {
    if (!raw) return 'Tài liệu đính kèm';
    const lastSlash = raw.lastIndexOf('/');
    const name = lastSlash !== -1 ? raw.substring(lastSlash + 1) : raw;
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return name;

    const ext = name.substring(lastDot);
    let nameWithoutExt = name.substring(0, lastDot);

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

const QuestionMarquee = ({ text }) => {
    const elRef = useRef(null);
    const [isOverflow, setIsOverflow] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (elRef.current) {
                const isOver = elRef.current.scrollWidth > elRef.current.clientWidth + 1;
                setIsOverflow(isOver);
            }
        };

        checkOverflow();

        let ro = null;
        if (typeof ResizeObserver !== 'undefined' && elRef.current) {
            ro = new ResizeObserver(checkOverflow);
            ro.observe(elRef.current);
        }
        return () => ro?.disconnect();
    }, [text]);

    const duration = Math.max(6, Math.round((text || '').length * 0.12));

    return (
        <div
            ref={elRef}
            className={`${styles.question} ${isOverflow ? styles.questionOverflow : ''}`}
            title={text}
            style={{ '--marquee-duration': `${duration}s` }}
        >
            <span className={styles.questionStatic}>{text}</span>
            {isOverflow && (
                <div className={styles.marqueeTrack}>
                    <span className={styles.marqueeContent}>{text}</span>
                    <span className={styles.marqueeDivider}>&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span className={styles.marqueeContent}>{text}</span>
                    <span className={styles.marqueeDivider}>&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;</span>
                </div>
            )}
        </div>
    );
};

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const outletContext = useOutletContext();
    const setCustomHeader = outletContext?.setCustomHeader;

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    // Drag-to-slide for filter buttons
    const filtersRef = useRef(null);
    const [isDraggingFilter, setIsDraggingFilter] = useState(false);
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);
    const hasDragged = useRef(false);

    const handleFilterMouseDown = (e) => {
        if (!filtersRef.current) return;
        setIsDraggingFilter(true);
        hasDragged.current = false;
        dragStartX.current = e.pageX - filtersRef.current.offsetLeft;
        dragScrollLeft.current = filtersRef.current.scrollLeft;
    };

    const handleFilterMouseMove = (e) => {
        if (!isDraggingFilter || !filtersRef.current) return;
        const x = e.pageX - filtersRef.current.offsetLeft;
        const walk = (x - dragStartX.current) * 1.3;
        if (Math.abs(walk) > 4) {
            hasDragged.current = true;
        }
        filtersRef.current.scrollLeft = dragScrollLeft.current - walk;
    };

    const handleFilterMouseUpOrLeave = () => {
        setIsDraggingFilter(false);
    };

    const handleFilterClick = (e, optKey) => {
        if (hasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        setActiveFilter(optKey);
    };

    // Details & histories per itemId
    const [histories, setHistories] = useState({});
    const [itemDetails, setItemDetails] = useState({});
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [closingItemId, setClosingItemId] = useState(null);
    const [itemDetailLoadingId, setItemDetailLoadingId] = useState(null);
    const [itemDetailErrors, setItemDetailErrors] = useState({});

    // File submissions
    const [pendingFiles, setPendingFiles] = useState({});
    const [editingSubmissionId, setEditingSubmissionId] = useState(null);
    const [submittingItemId, setSubmittingItemId] = useState(null);

    // Speaking Studio mode
    const [activeSpeakingItemId, setActiveSpeakingItemId] = useState(null);
    const [initialSubmissionId, setInitialSubmissionId] = useState(null);
    const lastSpeakingItemIdRef = useRef(null);

    const assignmentSpeakingState = location.state?.assignmentSpeaking;

    useEffect(() => {
        const itemId = assignmentSpeakingState?.itemId || null;

        if (itemId) {
            lastSpeakingItemIdRef.current = itemId;
            setActiveSpeakingItemId(itemId);
            setInitialSubmissionId(assignmentSpeakingState.submissionId || null);
            return;
        }

        const previousItemId = lastSpeakingItemIdRef.current;
        lastSpeakingItemIdRef.current = null;
        setActiveSpeakingItemId(null);
        setInitialSubmissionId(null);

        if (previousItemId) {
            fetchItemDetail(previousItemId, true);
        }
    }, [assignmentSpeakingState?.itemId, assignmentSpeakingState?.submissionId]);

    const openSpeakingView = (itemId, submissionId = null) => {
        navigate(`${location.pathname}${location.search}${location.hash}`, {
            state: {
                ...(location.state || {}),
                assignmentSpeaking: { itemId, submissionId },
                speakingResultOpen: false,
                speakingSubmissionId: null,
            },
        });
    };

    const closeSpeakingView = () => {
        if (assignmentSpeakingState && Number(window.history.state?.idx) > 0) {
            navigate(-1);
            return;
        }

        const previousItemId = activeSpeakingItemId;
        setActiveSpeakingItemId(null);
        setInitialSubmissionId(null);
        if (previousItemId) fetchItemDetail(previousItemId, true);

        if (assignmentSpeakingState) {
            const {
                assignmentSpeaking: _discardedMarker,
                speakingResultOpen: _discardedResult,
                speakingSubmissionId: _discardedSubmission,
                ...nextState
            } = location.state || {};
            navigate(`${location.pathname}${location.search}${location.hash}`, {
                replace: true,
                state: nextState,
            });
        }
    };

    useEffect(() => {
        if (!assignmentId) return;
        fetchAssignmentDetails();
    }, [assignmentId]);

    useEffect(() => {
        if (!setCustomHeader) return;
        if (assignment) {
            setCustomHeader(
                <nav className={styles.topHeaderBreadcrumb} aria-label="Breadcrumb">
                    <Link to="/student/assignments">Assignment</Link>
                    <span className={`${styles.breadcrumbSeparator} ${styles.separatorLast}`}>›</span>
                    <strong className={styles.assignmentName}>{assignment.title}</strong>
                </nav>
            );
        } else {
            setCustomHeader(null);
        }

        return () => {
            setCustomHeader?.(null);
        };
    }, [assignment, setCustomHeader]);

    const fetchAssignmentDetails = async () => {
        try {
            setLoading(true);
            const data = await assignmentService.getStudentAssignmentSummary(assignmentId);
            setAssignment(data);
            setHistories({});
            setItemDetails({});
            setItemDetailErrors({});
            setExpandedItemId(null);
            setClosingItemId(null);

            // Preload details for items in background to show attempts & bands immediately
            if (data?.items?.length > 0) {
                Promise.allSettled(
                    data.items.map(async (item) => {
                        try {
                            const detail = await assignmentService.getStudentAssignmentItemDetail(assignmentId, item.itemId);
                            if (detail) {
                                setItemDetails(prev => ({ ...prev, [item.itemId]: detail }));
                                setHistories(prev => ({ ...prev, [item.itemId]: detail.history || [] }));
                            }
                        } catch {
                            // Ignored: detail will load on click if prefetch fails
                        }
                    })
                );
            }
        } catch (err) {
            console.error('Failed to fetch assignment detail:', err);
            showToastError('Không thể tải chi tiết bài tập. Vui lòng thử lại sau.');
            navigate('/student/assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchItemDetail = async (itemId, force = false) => {
        if (!force && itemDetails[itemId]) {
            setExpandedItemId(itemId);
            return itemDetails[itemId];
        }

        setItemDetailLoadingId(itemId);
        setItemDetailErrors(prev => ({ ...prev, [itemId]: null }));
        try {
            const detail = await assignmentService.getStudentAssignmentItemDetail(assignmentId, itemId);
            setItemDetails(prev => ({ ...prev, [itemId]: detail }));
            setHistories(prev => ({
                ...prev,
                [itemId]: detail?.history || []
            }));
            setExpandedItemId(itemId);
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

    const handleToggleItem = async (itemId) => {
        if (expandedItemId === itemId) {
            setClosingItemId(itemId);
            setExpandedItemId(null);
            setTimeout(() => {
                setClosingItemId(prev => (prev === itemId ? null : prev));
            }, 360);
            return;
        }

        if (expandedItemId) {
            setClosingItemId(expandedItemId);
            setTimeout(() => {
                setClosingItemId(prev => (prev === expandedItemId ? null : prev));
            }, 360);
        }

        setExpandedItemId(itemId);
        await fetchItemDetail(itemId);
    };

    // Speaking actions
    const handleStartSpeaking = async (item) => {
        try {
            const checkData = await axiosClient.get(`/student/PracticeSpeaking/check-attempts/${item.itemId}`);
            if (checkData.isLimitReached) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Giới hạn số lần nộp bài',
                    text: `Bạn đã đạt tới giới hạn số lần nộp bài cho phép (${checkData.maxAttempts} lần) cho câu này.`,
                    confirmButtonColor: '#ef4444'
                });
                return;
            }
            openSpeakingView(item.itemId);
        } catch (err) {
            console.error('Failed to check attempt limit:', err);
            // Even if check fails, allow student to enter practice studio
            openSpeakingView(item.itemId);
        }
    };

    const handleViewSubmissionDetail = (itemId, submissionId) => {
        openSpeakingView(itemId, submissionId);
    };

    // File Submission actions
    const handleFileChange = (itemId, files) => {
        setPendingFiles(prev => ({ ...prev, [itemId]: files }));
    };

    const handleSubmitFileHomework = async (itemId) => {
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
            const serializedPayloads = JSON.stringify(filesToSubmit.map(f => ({
                dataValue: f.dataValue,
                fileName: f.fileName,
                dataType: f.dataType
            })));

            const formData = new FormData();
            formData.append('AssignmentItemId', itemId);
            formData.append('AudioBlobUrl', serializedPayloads);

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

            setPendingFiles(prev => ({ ...prev, [itemId]: [] }));
            await fetchItemDetail(itemId, true);
        } catch (err) {
            console.error('Failed to submit homework:', err);
            showToastError('Nộp bài thất bại. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    const handleEditFileSubmission = (itemId, submissionId) => {
        const targetSubmission = histories[itemId]?.find(s => s.submissionId === submissionId);
        const isGraded = targetSubmission?.status?.toLowerCase() === 'completed'
            || targetSubmission?.feedback?.responderType?.toLowerCase() === 'teacher';
        if (isGraded) {
            Swal.fire('Không thể sửa', 'Bài nộp đã được chấm nên không thể cập nhật.', 'info');
            return;
        }

        setEditingSubmissionId(submissionId);
        setPendingFiles(prev => ({ ...prev, [itemId]: [] }));
    };

    const handleSaveEditedFileSubmission = async (itemId, submissionId) => {
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
            await fetchItemDetail(itemId, true);
        } catch (err) {
            console.error('Failed to edit submission:', err);
            showToastError(err?.code === 'SUBMISSION_ALREADY_GRADED'
                ? err.message
                : 'Cập nhật bài nộp thất bại. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    const handleRemoveFileSubmission = async (itemId, submissionId) => {
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
            await fetchItemDetail(itemId, true);
        } catch (err) {
            console.error('Failed to delete submission:', err);
            showToastError('Không thể xóa bài nộp. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    if (loading) {
        return <Skeleton type="assignment-detail" />;
    }

    if (!assignment) return null;

    // --- SPEAKING STUDIO VIEW MODE ---
    if (activeSpeakingItemId) {
        return (
            <div style={{ background: 'var(--di-bg, #F5F9FF)', height: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
                <SpeakingPractice
                    isAssignmentMode={true}
                    assignmentId={assignmentId}
                    assignmentItemId={activeSpeakingItemId}
                    assignment={assignment}
                    assignmentItemDetail={itemDetails[activeSpeakingItemId]}
                    initialSubmissionId={initialSubmissionId}
                    onBack={closeSpeakingView}
                />
            </div>
        );
    }

    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
    const isBlockedByDeadline = isOverdue && !assignment.allowLateSubmission;
    const totalItems = assignment.items?.length || 0;

    // Count items completed: either item has submission flag or history has entries
    const completedItemsCount = assignment.items?.filter(it => {
        const hist = histories[it.itemId];
        if (hist && hist.length > 0) return true;
        return it.hasSubmission;
    }).length || 0;

    const progressPercent = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;

    // Filter categories detection
    const items = assignment.items || [];
    const hasPart1 = items.some(it => {
        const isSpeaking = (it.itemType || '').toUpperCase() === 'AI_SPEAKING' || (it.itemType || '').toUpperCase() === 'SPEAKING';
        return isSpeaking && detectPartNumber(it.type || it.itemType) === 1;
    });
    const hasPart2 = items.some(it => {
        const isSpeaking = (it.itemType || '').toUpperCase() === 'AI_SPEAKING' || (it.itemType || '').toUpperCase() === 'SPEAKING';
        return isSpeaking && detectPartNumber(it.type || it.itemType) === 2;
    });
    const hasPart3 = items.some(it => {
        const isSpeaking = (it.itemType || '').toUpperCase() === 'AI_SPEAKING' || (it.itemType || '').toUpperCase() === 'SPEAKING';
        return isSpeaking && detectPartNumber(it.type || it.itemType) === 3;
    });
    const hasFiles = items.some(it => {
        const isSpeaking = (it.itemType || '').toUpperCase() === 'AI_SPEAKING' || (it.itemType || '').toUpperCase() === 'SPEAKING';
        return !isSpeaking;
    });

    const filterOptions = [
        { key: 'all', label: `Tất cả · ${totalItems}` },
        ...(hasPart1 ? [{ key: 'part1', label: 'Part 1' }] : []),
        ...(hasPart2 ? [{ key: 'part2', label: 'Part 2' }] : []),
        ...(hasPart3 ? [{ key: 'part3', label: 'Part 3' }] : []),
        ...(hasFiles ? [{ key: 'file', label: 'Tự luận / File' }] : [])
    ];

    const filteredItems = items.filter(it => {
        if (activeFilter === 'all') return true;
        const isSpeaking = (it.itemType || '').toUpperCase() === 'AI_SPEAKING' || (it.itemType || '').toUpperCase() === 'SPEAKING';
        if (activeFilter === 'file') return !isSpeaking;
        const partNum = detectPartNumber(it.type || it.itemType);
        if (activeFilter === 'part1') return isSpeaking && partNum === 1;
        if (activeFilter === 'part2') return isSpeaking && partNum === 2;
        if (activeFilter === 'part3') return isSpeaking && partNum === 3;
        return true;
    });

    return (
        <div className={styles.pageWrapper}>
            <main className={styles.page}>
                {/* Hero Section */}
                <section className={styles.hero}>
                    <div className={styles.heroMain}>
                        <div className={styles.heroCopy}>
                            <h1>{assignment.title}</h1>
                            <div className={styles.metaRow}>
                                <div className={`${styles.meta} ${isOverdue ? styles.metaOverdue : styles.metaDue}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="5" width="18" height="16" rx="2" />
                                        <path d="M16 3v4M8 3v4M3 10h18" />
                                    </svg>
                                    Hạn nộp: {formatDueDate(assignment.dueDate)}
                                </div>
                                <div className={styles.meta}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M12 7v5l3 2" />
                                    </svg>
                                    {getRemainingDaysText(assignment.dueDate)}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className={styles.backButton}
                            onClick={() => navigate('/student/assignments', { state: { classId: assignment.classId } })}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Quay lại bài tập
                        </button>
                    </div>

                    <div className={styles.heroBottom}>
                        <div className={styles.teacherNote}>
                            <div className={styles.noteIcon}>
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 10v6M12 7h.01" />
                                </svg>
                            </div>
                            <div>
                                <strong>Hướng dẫn từ giáo viên</strong>
                                {assignment.description ? (
                                    <div
                                        className={styles.teacherNoteContent}
                                        dangerouslySetInnerHTML={{ __html: assignment.description }}
                                    />
                                ) : (
                                    <p>Hoàn thành từng câu và xem lại điểm trước khi nộp bài cuối cùng.</p>
                                )}
                            </div>
                        </div>

                        <div className={styles.progressCard}>
                            <div
                                className={styles.progressRing}
                                style={{
                                    background: `conic-gradient(var(--purple) ${progressPercent}%, #eaeef6 0)`
                                }}
                            >
                                <span>{completedItemsCount}/{totalItems}</span>
                            </div>
                            <div className={styles.progressCopy}>
                                <small>Tiến độ bài tập</small>
                                <strong>Đã hoàn thành {completedItemsCount} trên {totalItems} hạng mục</strong>
                            </div>
                            <strong className={styles.progressPercent}>{progressPercent}%</strong>
                        </div>
                    </div>
                </section>

                {/* Main Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionTitle}>
                            <div className={styles.icon}>
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 11l3 3L22 4" />
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </div>
                            <div>
                                <h2>Bài tập cần hoàn thành</h2>
                            </div>
                        </div>

                        {filterOptions.length > 1 && (
                            <div
                                ref={filtersRef}
                                className={`${styles.filters} ${isDraggingFilter ? styles.filtersDragging : ''}`}
                                aria-label="Bộ lọc"
                                onMouseDown={handleFilterMouseDown}
                                onMouseMove={handleFilterMouseMove}
                                onMouseUp={handleFilterMouseUpOrLeave}
                                onMouseLeave={handleFilterMouseUpOrLeave}
                            >
                                {filterOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        className={`${styles.filter} ${activeFilter === opt.key ? styles.filterActive : ''}`}
                                        onClick={(e) => handleFilterClick(e, opt.key)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Task List */}
                    <div className={styles.list} id="taskList">
                        {filteredItems.length === 0 ? (
                            <div className={styles.emptyState}>
                                Không có bài tập nào phù hợp với bộ lọc hiện tại.
                            </div>
                        ) : (
                            filteredItems.map((item, index) => {
                                const isSpeaking = (item.itemType || '').toUpperCase() === 'AI_SPEAKING' || (item.itemType || '').toUpperCase() === 'SPEAKING';
                                const isOpen = expandedItemId === item.itemId;
                                const isClosing = closingItemId === item.itemId;
                                const itemDetail = itemDetails[item.itemId];
                                const itemHistory = histories[item.itemId] || itemDetail?.history || [];
                                const isDone = item.hasSubmission || itemHistory.length > 0;

                                const partNum = detectPartNumber(item.type || item.itemType);
                                const isPart2 = isSpeaking && partNum === 2;
                                const partLabel = isSpeaking ? `Part ${partNum}` : 'Tự luận';

                                // Parsing question & cues
                                const rawContent = itemDetail?.content || item.content;
                                const norm = normalizeSpeakingContent(rawContent);
                                const questionText = norm.question || item.description || item.title || (isSpeaking ? `Speaking Exercise ${index + 1}` : 'Nộp bài tự luận');
                                const cueList = norm.suggestions || [];

                                // Metrics
                                const attemptCount = itemHistory.length > 0 ? itemHistory.length : (item.hasSubmission ? 1 : 0);
                                const maxAttemptsText = item.maxAttempts ? item.maxAttempts : '∞';

                                // Highest or latest band score
                                const scoredAttempt = itemHistory.find(h => h.overallScore != null);
                                const bandScore = scoredAttempt ? Number(scoredAttempt.overallScore).toFixed(1) : null;

                                return (
                                    <article
                                        key={item.itemId}
                                        className={`${styles.task} ${isDone ? styles.taskIsDone : ''} ${isOpen ? styles.taskIsOpen : ''} ${isClosing ? styles.taskIsClosing : ''} ${!isSpeaking ? styles.taskFile : ''}`}
                                    >
                                        <button
                                            className={styles.taskHeader}
                                            type="button"
                                            aria-expanded={isOpen}
                                            onClick={() => handleToggleItem(item.itemId)}
                                        >
                                            <div className={styles.taskHeaderTop}>
                                                <div className={styles.taskHeaderTopLeft}>
                                                    <div className={`${styles.taskNumber} ${!isSpeaking ? styles.taskNumberFile : ''}`}>
                                                        {String(index + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className={styles.taskTopline}>
                                                        {isSpeaking ? (
                                                            <>
                                                                <span className={`${styles.taskType} ${styles.taskTypeDesktop}`}>
                                                                    Bài nói · {partLabel}
                                                                </span>
                                                                <span className={`${styles.taskType} ${styles.taskTypeMobile}`}>
                                                                    Speaking
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className={styles.taskTypeFile}>Nộp file</span>
                                                        )}
                                                        <span className={styles.taskDot}>•</span>
                                                        <span className={styles.taskState}>
                                                            {isDone ? 'Đã có bài nộp' : 'Chưa thực hiện'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className={styles.chev} aria-label={isOpen ? "Thu gọn" : "Mở rộng"}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                        <path d="M6 9l6 6 6-6" />
                                                    </svg>
                                                </span>
                                            </div>

                                            <QuestionMarquee text={questionText} />

                                            <div className={styles.taskMetrics}>
                                                <span className={styles.attemptPill}>
                                                    {attemptCount}/{maxAttemptsText} lần nộp
                                                </span>
                                                {bandScore && (
                                                    <span className={styles.bandPill}>Band {bandScore}</span>
                                                )}
                                                {isSpeaking && (
                                                    <span className={styles.partPill}>{partLabel}</span>
                                                )}
                                            </div>
                                        </button>

                                        <div
                                            className={`${styles.taskPanelWrapper} ${isOpen ? styles.taskPanelOpen : ''}`}
                                            aria-hidden={!isOpen}
                                        >
                                            <div className={styles.taskPanelInner}>
                                                <div className={styles.taskPanel}>
                                                {itemDetailLoadingId === item.itemId && !itemDetail ? (
                                                    <div className={styles.loadingBox}>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        Đang tải chi tiết hạng mục...
                                                    </div>
                                                ) : itemDetailErrors[item.itemId] && !itemDetail ? (
                                                    <div className="alert alert-danger m-3 d-flex align-items-center justify-content-between">
                                                        <span>{itemDetailErrors[item.itemId]}</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => fetchItemDetail(item.itemId, true)}
                                                        >
                                                            Thử lại
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={styles.panelInner}>
                                                        <div>
                                                            {/* Prompt Box */}
                                                            <div className={styles.promptBox}>
                                                                <strong>Yêu cầu câu hỏi</strong>
                                                                <span title={questionText}>{truncateText(questionText)}</span>
                                                                {!isPart2 && cueList.length > 0 && (
                                                                    <div style={{ marginTop: '10px' }}>
                                                                        <em>You should say:</em>
                                                                        <ul className={styles.cueList}>
                                                                            {cueList.map((cue, idx) => (
                                                                                <li key={idx}>{cue}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Teacher Attachments */}
                                                            {itemDetail?.payloads && itemDetail.payloads.length > 0 && (
                                                                <div className={styles.attachmentsSection}>
                                                                    <div className={styles.attachmentsTitle}>
                                                                        <i className="bi bi-paperclip"></i> Tài liệu đính kèm của giáo viên:
                                                                    </div>
                                                                    <div className={styles.attachmentItems}>
                                                                        {itemDetail.payloads.map((payload, idx) => {
                                                                            const fileName = payload.originalFileName || cleanFileName(payload.dataValue);
                                                                            return (
                                                                                <a
                                                                                    key={idx}
                                                                                    href={payload.downloadUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className={styles.attachmentBtn}
                                                                                    title="Bấm để tải về"
                                                                                >
                                                                                    <i className="bi bi-file-earmark-arrow-down-fill text-primary"></i>
                                                                                    <span className="text-truncate">{fileName}</span>
                                                                                </a>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* File Submission specific upload UI */}
                                                            {!isSpeaking && (
                                                                <div style={{ marginTop: '16px' }}>
                                                                    <div style={{ marginBottom: '12px' }}>
                                                                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                                                                            <i className="bi bi-cloud-arrow-up"></i> {editingSubmissionId ? 'Tải lên file thay thế:' : 'Tải lên bài làm:'}
                                                                        </p>
                                                                        <CommonAttachmentUploader
                                                                            attachments={pendingFiles[item.itemId] || []}
                                                                            onAttachmentsChange={(files) => handleFileChange(item.itemId, files)}
                                                                            disabled={isBlockedByDeadline || submittingItemId === item.itemId}
                                                                            placeholder="Kéo & thả tài liệu bài làm hoặc bấm để chọn file từ thiết bị"
                                                                        />
                                                                    </div>

                                                                    {editingSubmissionId ? (
                                                                        <div className="d-flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                className={styles.primary}
                                                                                onClick={() => handleSaveEditedFileSubmission(item.itemId, editingSubmissionId)}
                                                                                disabled={submittingItemId === item.itemId}
                                                                            >
                                                                                {submittingItemId === item.itemId ? 'Đang lưu...' : 'Lưu cập nhật'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className={styles.secondary}
                                                                                onClick={() => setEditingSubmissionId(null)}
                                                                            >
                                                                                Hủy
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className={styles.primary}
                                                                            onClick={() => handleSubmitFileHomework(item.itemId)}
                                                                            disabled={isBlockedByDeadline || submittingItemId === item.itemId || !(pendingFiles[item.itemId]?.length > 0)}
                                                                        >
                                                                            <i className="bi bi-cloud-arrow-up"></i>
                                                                            {submittingItemId === item.itemId ? 'Đang nộp...' : 'Nộp bài'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* History Rows */}
                                                            {itemHistory && itemHistory.length > 0 && (
                                                                <div className={styles.historySection}>
                                                                    <div className={styles.historyTitle}>
                                                                        <i className="bi bi-clock-history"></i> Lịch sử bài làm đã nộp ({itemHistory.length})
                                                                    </div>
                                                                    <div className={styles.history}>
                                                                        {itemHistory.map((h) => {
                                                                            const bandDisplay = h.overallScore !== null && h.overallScore !== undefined
                                                                                ? `Band ${Number(h.overallScore).toFixed(1)}`
                                                                                : (h.status === 'Completed' ? 'Đã chấm' : 'Đang xử lý');
                                                                            return (
                                                                                <div
                                                                                    key={h.submissionId}
                                                                                    className={styles.historyRow}
                                                                                    onClick={() => isSpeaking && handleViewSubmissionDetail(item.itemId, h.submissionId)}
                                                                                    title={isSpeaking ? 'Bấm để xem chi tiết bài làm này' : undefined}
                                                                                >
                                                                                    <div>
                                                                                        <strong>Lần nộp #{h.attemptNumber}</strong>
                                                                                        <br />
                                                                                        <small>{formatDateTime(h.createdAt)}</small>
                                                                                    </div>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <span className={styles.bandPill}>{bandDisplay}</span>
                                                                                        {!isSpeaking && (
                                                                                            <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="btn btn-sm btn-outline-secondary"
                                                                                                    onClick={() => handleEditFileSubmission(item.itemId, h.submissionId)}
                                                                                                    title="Chỉnh sửa bài nộp"
                                                                                                >
                                                                                                    <i className="bi bi-pencil"></i>
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="btn btn-sm btn-outline-danger"
                                                                                                    onClick={() => handleRemoveFileSubmission(item.itemId, h.submissionId)}
                                                                                                    title="Xóa bài nộp"
                                                                                                >
                                                                                                    <i className="bi bi-trash"></i>
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Side Actions Column */}
                                                        <div className={styles.sideActions}>
                                                            {isSpeaking && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.primary}
                                                                        onClick={() => handleStartSpeaking(item)}
                                                                    >
                                                                        <i className="bi bi-mic-fill"></i>
                                                                        {itemHistory.length > 0 ? 'Làm lại bài' : 'Bắt đầu làm bài'}
                                                                    </button>
                                                                    {itemHistory.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            className={styles.secondary}
                                                                            onClick={() => handleViewSubmissionDetail(item.itemId, itemHistory[0].submissionId)}
                                                                        >
                                                                            <i className="bi bi-file-earmark-text"></i>
                                                                            Xem chi tiết bài chấm
                                                                        </button>
                                                                    )}
                                                                    {/* Tip: Microphone warning is intentionally removed per user request */}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
