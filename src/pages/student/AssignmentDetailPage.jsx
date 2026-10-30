import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import assignmentService from '../../api/services/assignment.service';
import styles from './AssignmentDetailPage.module.css';
import Swal from 'sweetalert2';
import { showToastError } from '../../utils/toast';
import PageSkeleton from '../../components/common/PageSkeleton';
import { parseAssignmentDueDate } from '../../utils/assignmentDate';
import AssignmentDetailHero from './AssignmentDetailHero';
import AssignmentTaskCard from './AssignmentTaskCard';
import AssignmentSpeakingModal from './AssignmentSpeakingModal';
import { filterAssignmentItems, getAssignmentFilterOptions, hasCompletedSpeakingAttempt, isSpeakingItem } from './assignmentDetailUtils';
import useAssignmentFileSubmissions from './useAssignmentFileSubmissions';

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

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

    useEffect(() => {
        if (!assignmentId) return undefined;
        const refresh = event => {
            if (event?.detail?.type && !['SpeakingCompleted', 'SpeakingFailed', 'SpeakingOffTopic'].includes(event.detail.type)) return;
            if (event?.detail?.assignmentItemId && !assignment?.items?.some(item =>
                item.itemId === Number(event.detail.assignmentItemId))) return;
            if (event?.detail?.exerciseId) return;
            void assignmentService.getStudentAssignmentSummary(assignmentId).then(setAssignment);
            if (expandedItemId && !activeSpeakingItemId) void fetchItemDetail(expandedItemId, true);
        };
        window.addEventListener('diamond:notification-received', refresh);
        window.addEventListener('diamond:speaking-history-refresh', refresh);
        return () => {
            window.removeEventListener('diamond:notification-received', refresh);
            window.removeEventListener('diamond:speaking-history-refresh', refresh);
        };
    }, [assignmentId, assignment, expandedItemId, activeSpeakingItemId]);

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

    const {
        pendingFiles, editingSubmissionId, submittingItemId,
        setEditingSubmissionId, handleFileChange, handleSubmitFileHomework,
        handleEditFileSubmission, handleSaveEditedFileSubmission, handleRemoveFileSubmission,
    } = useAssignmentFileSubmissions({ histories, refreshItem: fetchItemDetail });

    if (loading) {
        return <PageSkeleton variant="assignmentDetail" />;
    }

    if (!assignment) return null;

    const isOverdue = assignment.dueDate && parseAssignmentDueDate(assignment.dueDate) < new Date();
    const isBlockedByDeadline = isOverdue && !assignment.allowLateSubmission;
    const totalItems = assignment.items?.length || 0;

    // A rejected Speaking attempt stays in history but does not complete the item.
    const completedItemsCount = assignment.items?.filter(it => {
        const hist = histories[it.itemId];
        if (hist && hist.length > 0) return isSpeakingItem(it)
            ? hasCompletedSpeakingAttempt(hist) : true;
        return it.hasSubmission;
    }).length || 0;

    const progressPercent = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;

    const items = assignment.items || [];
    const filterOptions = getAssignmentFilterOptions(items);
    const filteredItems = filterAssignmentItems(items, activeFilter);

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.page}>
                <AssignmentDetailHero
                    assignment={assignment}
                    isOverdue={isOverdue}
                    completedItemsCount={completedItemsCount}
                    totalItems={totalItems}
                    progressPercent={progressPercent}
                    onBack={() => navigate('/student/assignments', { state: { classId: assignment.classId } })}
                />

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
                            filteredItems.map((item, index) => (
                                <AssignmentTaskCard
                                    key={item.itemId}
                                    item={item}
                                    index={index}
                                    itemDetail={itemDetails[item.itemId]}
                                    itemHistory={histories[item.itemId] || itemDetails[item.itemId]?.history || []}
                                    isOpen={expandedItemId === item.itemId}
                                    isClosing={closingItemId === item.itemId}
                                    detailLoading={itemDetailLoadingId === item.itemId}
                                    detailError={itemDetailErrors[item.itemId]}
                                    pendingFiles={pendingFiles[item.itemId] || []}
                                    editingSubmissionId={editingSubmissionId}
                                    isSubmitting={submittingItemId === item.itemId}
                                    isBlockedByDeadline={isBlockedByDeadline}
                                    onToggle={handleToggleItem}
                                    onRetry={fetchItemDetail}
                                    onFileChange={handleFileChange}
                                    onSaveEditedFile={handleSaveEditedFileSubmission}
                                    onSubmitFile={handleSubmitFileHomework}
                                    onCancelEdit={() => setEditingSubmissionId(null)}
                                    onViewSubmission={handleViewSubmissionDetail}
                                    onEditFile={handleEditFileSubmission}
                                    onRemoveFile={handleRemoveFileSubmission}
                                    onStartSpeaking={handleStartSpeaking}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
            {activeSpeakingItemId && (
                <AssignmentSpeakingModal
                    assignmentId={assignmentId}
                    itemId={activeSpeakingItemId}
                    assignment={assignment}
                    itemDetail={itemDetails[activeSpeakingItemId]}
                    initialSubmissionId={initialSubmissionId}
                    onClose={closeSpeakingView}
                />
            )}
        </div>
    );
}
