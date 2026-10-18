import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './PracticeOverview.module.css';
import Swal from 'sweetalert2';
import { normalizeSpeakingContent } from '../../utils/speakingContent';
import SpeakingPractice from './SpeakingPractice';
import HeroArtwork from '../../components/common/HeroArtwork';

const PART_OPTIONS = ['Part 1', 'Part 2', 'Part 3'];

function highlightMatch(text, term) {
    if (!term || !text) return text;
    const cleanTerm = term.trim();
    if (!cleanTerm) return text;

    const regex = new RegExp(`(${cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <mark key={i} className={styles.highlightText}>
                {part}
            </mark>
        ) : (
            part
        )
    );
}

function getQuestionText(ex) {
    const parsed = normalizeSpeakingContent(ex.content);
    return parsed?.question || ex.title || 'Bài tập nói tự do';
}

function isQuestionMatch(ex, term) {
    if (!term) return false;
    const text = getQuestionText(ex).toLowerCase();
    return text.includes(term.toLowerCase());
}

// Component hiển thị danh sách câu hỏi (được phân trang bằng mũi tên ở topicToggle)
function QuestionList({ exercises, startIndex = 0, searchTerm, onExerciseClick, topic }) {
    return (
        <ul className={styles.questionList}>
            {exercises.map((ex, idx) => {
                const qIndex = startIndex + idx;
                const rawQuestionText = getQuestionText(ex);

                return (
                    <li key={ex.exerciseId || qIndex} className={styles.questionItem}>
                        <span className={styles.questionNumber}>
                            {String(qIndex + 1).padStart(2, '0')}
                        </span>

                        <div className={styles.questionMain}>
                            <p className={styles.questionTitle} title={rawQuestionText}>
                                {highlightMatch(rawQuestionText, searchTerm)}
                            </p>
                            <div className={styles.questionSub}>
                                <i className="fa-solid fa-microphone"></i>
                                Speaking · Câu {qIndex + 1}
                            </div>
                        </div>

                        <button
                            className={styles.startBtn}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onExerciseClick(ex, topic);
                            }}
                        >
                            Luyện tập
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

// Khung xương khi câu hỏi đang được tải
function QuestionAreaSkeleton({ count = 9 }) {
    return (
        <div className={styles.questionSkeletonGrid}>
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className={styles.questionSkeletonCard}>
                    <div className={`${styles.skeletonBox} ${styles.skeletonNum}`} />
                    <div className={styles.skeletonBody}>
                        <div className={`${styles.skeletonBox} ${styles.skeletonTitle}`} />
                        <div className={`${styles.skeletonBox} ${styles.skeletonSub}`} />
                    </div>
                    <div className={`${styles.skeletonBox} ${styles.skeletonBtn}`} />
                </div>
            ))}
        </div>
    );
}

export default function PracticeOverview() {
    const navigate = useNavigate();
    const location = useLocation();
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [openTopicId, setOpenTopicId] = useState(null);
    const [exercisesMap, setExercisesMap] = useState({});
    const [loadingTopicId, setLoadingTopicId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResultsByTopic, setSearchResultsByTopic] = useState({});
    const [isSearching, setIsSearching] = useState(false);
    const [topicPages, setTopicPages] = useState({});
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterData, setFilterData] = useState(null);
    const [filterError, setFilterError] = useState(false);
    const filterRef = useRef(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const exerciseId = searchParams.get('exerciseId') || searchParams.get('exerciseid');
    const topicIdParam = searchParams.get('topicId') || searchParams.get('topicid');
    const partParam = searchParams.get('part');
    const hasActiveFilter = Boolean(partParam);
    const filterKey = partParam || '';

    const practiceParams = (extra = {}) => ({
        ...(partParam ? { part: partParam } : {}),
        ...extra,
    });

    const exerciseQuery = (extra = {}) => {
        const params = new URLSearchParams({ skill: 'SPEAKING', ...practiceParams(extra) });
        return params.toString();
    };

    const updateFilter = (nextPart) => {
        setSearchParams({
            ...(nextPart ? { part: nextPart } : {}),
        });
        setOpenTopicId(null);
    };

    useEffect(() => {
        if (!filterOpen) return;
        const handlePointerDown = (event) => {
            if (!filterRef.current?.contains(event.target)) setFilterOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setFilterOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [filterOpen]);

    useEffect(() => {
        if (!hasActiveFilter) {
            setFilterData(null);
            setFilterError(false);
            return;
        }
        let cancelled = false;
        setFilterData(null);
        setFilterError(false);
        axiosClient.get(`/student/exercise?${exerciseQuery()}`)
            .then((results) => {
                if (cancelled) return;
                const topicIds = new Set((Array.isArray(results) ? results : [])
                    .map(ex => ex.topicId).filter(Boolean));
                setFilterData({ key: filterKey, topicIds });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Lỗi khi lọc bài tập:', err);
                setFilterError(true);
            });
        return () => { cancelled = true; };
    }, [filterKey]);

    // Desktop: 3 cards/row, Tablet: 2 cards/row, Mobile (<= 720px): 1 card/row
    const getGroupSize = () => {
        if (typeof window === 'undefined') return 3;
        if (window.innerWidth <= 720) return 1;
        if (window.innerWidth <= 1180) return 2;
        return 3;
    };

    // Phân trang câu hỏi: 5 câu trên mobile, 9 câu trên PC
    const getPageSize = () => {
        if (typeof window === 'undefined') return 9;
        return window.innerWidth <= 720 ? 5 : 9;
    };

    const [groupSize, setGroupSize] = useState(getGroupSize);
    const [pageSize, setPageSize] = useState(getPageSize);

    useEffect(() => {
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const nextSize = getGroupSize();
                const nextPageSize = getPageSize();
                setGroupSize(prev => (prev !== nextSize ? nextSize : prev));
                setPageSize(prev => (prev !== nextPageSize ? nextPageSize : prev));
            }, 120);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 1. Chỉ gọi API lấy danh sách chủ đề khi vào trang
    useEffect(() => {
        const loadTopics = async () => {
            try {
                setLoadingTopics(true);
                const topicsResp = await axiosClient.get('/topic');
                setTopics(topicsResp || []);
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể tải danh sách chủ đề', 'error');
            } finally {
                setLoadingTopics(false);
            }
        };
        loadTopics();
    }, []);

    // 2. Tải câu hỏi khi người dùng bấm mở chủ đề đó (Lazy Load)
    const loadExercisesByTopic = useCallback(async (topicId) => {
        if (exercisesMap[topicId] && exercisesMap[topicId].length > 0) return;
        try {
            setLoadingTopicId(topicId);
            const res = await axiosClient.get(`/student/exercise?${exerciseQuery({ topicId })}`);
            setExercisesMap(prev => ({
                ...prev,
                [topicId]: Array.isArray(res) ? res : []
            }));
        } catch (err) {
            console.error('Lỗi khi tải câu hỏi của chủ đề:', err);
            setExercisesMap(prev => ({
                ...prev,
                [topicId]: []
            }));
        } finally {
            setLoadingTopicId(null);
        }
    }, [exercisesMap, partParam]);

    // 3. API chuyên biệt tìm kiếm câu hỏi khi người dùng nhập từ khóa (Debounced 300ms)
    useEffect(() => {
        const clean = searchTerm.trim();
        if (!clean) {
            setSearchResultsByTopic({});
            setIsSearching(false);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const results = await axiosClient.get(
                    `/student/exercise?${exerciseQuery({ search: clean })}`
                );
                if (cancelled) return;
                const grouped = {};
                if (Array.isArray(results)) {
                    results.forEach(ex => {
                        const tid = ex.topicId;
                        if (tid) {
                            if (!grouped[tid]) grouped[tid] = [];
                            grouped[tid].push(ex);
                        }
                    });
                }
                setSearchResultsByTopic(grouped);
            } catch (err) {
                if (!cancelled) console.error('Lỗi khi tìm kiếm câu hỏi:', err);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchTerm, partParam]);

    useEffect(() => {
        setOpenTopicId(null);
        setExercisesMap({});
        setSearchResultsByTopic({});
        setTopicPages({});
    }, [partParam]);

    // Đồng bộ trạng thái mở chủ đề khi query param `topicId` trên URL thay đổi
    useEffect(() => {
        if (!topicIdParam) {
            setOpenTopicId(null);
            return;
        }

        const tid = Number(topicIdParam);
        if (openTopicId === tid) return;

        if (exercisesMap[tid] && exercisesMap[tid].length > 0) {
            setOpenTopicId(tid);
            return;
        }

        let isCancelled = false;
        const loadDirectTopic = async () => {
            try {
                setLoadingTopicId(tid);
                const res = await axiosClient.get(`/student/exercise?${exerciseQuery({ topicId: tid })}`);
                if (!isCancelled) {
                    setExercisesMap(prev => ({
                        ...prev,
                        [tid]: Array.isArray(res) ? res : []
                    }));
                    setOpenTopicId(tid);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!isCancelled) setLoadingTopicId(null);
            }
        };
        loadDirectTopic();
        return () => { isCancelled = true; };
    }, [topicIdParam, partParam]);

    // Toggle collapse/expand tại chỗ (in-place accordion)
    const handleToggleTopic = (topic) => {
        if (openTopicId === topic.id) {
            setOpenTopicId(null);
            setSearchParams(practiceParams());
            return;
        }

        setOpenTopicId(topic.id);
        setSearchParams(practiceParams({ type: 'speaking', topicId: topic.id }));

        const hasCached = Object.prototype.hasOwnProperty.call(exercisesMap, topic.id);

        if (!hasCached) {
            setLoadingTopicId(topic.id);
            axiosClient.get(`/student/exercise?${exerciseQuery({ topicId: topic.id })}`).then((res) => {
                setExercisesMap(prev => ({
                    ...prev,
                    [topic.id]: Array.isArray(res) ? res : []
                }));
            }).catch(err => {
                console.error(err);
                setExercisesMap(prev => ({ ...prev, [topic.id]: [] }));
            }).finally(() => {
                setLoadingTopicId(current => (current === topic.id ? null : current));
            });
        }
    };

    const handleExerciseClick = (ex, topic) => {
        setSearchParams(practiceParams({
            type: 'speaking',
            topicId: topic.id,
            exerciseId: ex.exerciseId,
        }), {
            state: {
                ...(location.state || {}),
                speakingExerciseOpen: true,
                speakingResultOpen: false,
                speakingSubmissionId: null,
            },
        });
    };

    const handleBackFromExercise = () => {
        if (location.state?.speakingExerciseOpen && Number(window.history.state?.idx) > 0) {
            navigate(-1);
            return;
        }

        const activeTopic = topicIdParam || openTopicId;
        if (activeTopic) {
            setSearchParams(
                practiceParams({ type: 'speaking', topicId: activeTopic }),
                { replace: true, state: { ...(location.state || {}), speakingExerciseOpen: false } },
            );
        } else {
            setSearchParams(practiceParams(), { replace: true, state: { ...(location.state || {}), speakingExerciseOpen: false } });
        }
    };

    const cleanTerm = searchTerm.trim().toLowerCase();
    const filterLoading = hasActiveFilter && filterData?.key !== filterKey && !filterError;

    const filteredTopics = topics.filter((t) => {
        if (hasActiveFilter && filterData?.key === filterKey && !filterData.topicIds.has(t.id)) return false;
        if (!cleanTerm) return true;
        const matchName = t.name?.toLowerCase().includes(cleanTerm);
        const matchDesc = t.description?.toLowerCase().includes(cleanTerm);
        const searchQuestions = searchResultsByTopic[t.id] || [];
        return matchName || matchDesc || searchQuestions.length > 0;
    });

    useEffect(() => {
        if (cleanTerm.length >= 2 && filteredTopics.length === 1) {
            setOpenTopicId(filteredTopics[0].id);
        }
    }, [cleanTerm, filteredTopics.length]);

    const rows = [];
    for (let i = 0; i < filteredTopics.length; i += groupSize) {
        rows.push(filteredTopics.slice(i, i + groupSize));
    }

    return (
        <div className={exerciseId ? styles.studioWrapper : styles.container}>
            {exerciseId ? (
                <SpeakingPractice onBack={handleBackFromExercise} />
            ) : (
                <>
                    <section className={`${styles.hero} ${filterOpen ? styles.heroFilterOpen : ''}`}>
                        <div className={styles.heroMain}>
                            <div className={styles.heroIcon}>
                                <i className="fa-regular fa-rectangle-list"></i>
                            </div>

                            <div className={styles.heroContent}>
                                <h1>Kho Luyện Tập Tự Do{partParam ? ` · ${partParam}` : ''}</h1>
                                <p>Khám phá kho tài liệu phong phú, ôn luyện theo chủ đề yêu thích bất cứ lúc nào.</p>
                            </div>
                        </div>

                        <HeroArtwork variant="practice" className={styles.heroArtwork} />

                        <div className={styles.searchControls} ref={filterRef}>
                            <div className={styles.heroSearch}>
                                {isSearching ? (
                                    <i className={`fa-solid fa-spinner fa-spin ${styles.searchIcon}`}></i>
                                ) : (
                                    <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`}></i>
                                )}
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Tìm kiếm chủ đề, câu hỏi..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className={styles.clearSearchBtn}
                                        onClick={() => setSearchTerm('')}
                                        title="Xóa tìm kiếm"
                                        aria-label="Xóa tìm kiếm"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                className={`${styles.filterButton} ${hasActiveFilter ? styles.filterButtonActive : ''}`}
                                onClick={() => setFilterOpen(open => !open)}
                                aria-expanded={filterOpen}
                                aria-controls="practice-filter-panel"
                                aria-label="Lọc theo Part"
                                title="Lọc theo Part"
                            >
                                <i className="fa-solid fa-sliders"></i>
                                {hasActiveFilter && <span className={styles.filterDot} />}
                            </button>
                            {filterOpen && (
                                <div id="practice-filter-panel" className={styles.filterPanel}>
                                    <div className={styles.filterPanelHeader}>
                                        <strong>Lọc theo Part</strong>
                                        {hasActiveFilter && (
                                            <button type="button" onClick={() => updateFilter(null)}>
                                                Đặt lại
                                            </button>
                                        )}
                                    </div>
                                    <label className={styles.filterLabel} htmlFor="practice-part-filter">Part</label>
                                    <select
                                        id="practice-part-filter"
                                        className={styles.filterSelect}
                                        value={partParam || ''}
                                        onChange={(e) => updateFilter(e.target.value || null)}
                                    >
                                        <option value="">Tất cả Part</option>
                                        {PART_OPTIONS.map(part => <option key={part} value={part}>{part}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={styles.topicRows}>
                        {loadingTopics || filterLoading ? (
                            <div className={styles.loadingArea}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                                {filterLoading ? 'Đang lọc bài tập...' : 'Đang tải danh sách chủ đề & câu hỏi...'}
                            </div>
                        ) : filterError ? (
                            <div className={styles.emptyState}>Không thể tải bộ lọc bài tập. Vui lòng thử lại.</div>
                        ) : topics.length === 0 ? (
                            <div className={styles.emptyState}>Chưa có chủ đề luyện tập nào.</div>
                        ) : filteredTopics.length === 0 ? (
                            <div className={styles.emptySearch}>
                                <div className={styles.emptySearchIcon}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                                <p>
                                    Không có bài tập phù hợp với từ khóa hoặc bộ lọc đã chọn.
                                </p>
                                <button
                                    type="button"
                                    className={styles.resetSearchBtn}
                                    onClick={() => {
                                        setSearchTerm('');
                                        updateFilter(null);
                                    }}
                                >
                                    Xem tất cả chủ đề
                                </button>
                            </div>
                        ) : (
                            rows.map((rowGroup, rowIndex) => {
                                const isRowExpanded = rowGroup.some(t => t.id === openTopicId);

                                return (
                                    <div
                                        key={rowIndex}
                                        className={`${styles.topicRow} ${isRowExpanded ? styles.hasExpanded : ''}`}
                                    >
                                        {rowGroup.map((topic) => {
                                            const isOpen = topic.id === openTopicId;
                                            const topicExercises = exercisesMap[topic.id] || [];
                                            const searchQuestions = searchResultsByTopic[topic.id] || [];
                                            const isLoadingThisTopic = loadingTopicId === topic.id;

                                            const matchingQuestions = cleanTerm
                                                ? (searchQuestions.length > 0
                                                    ? searchQuestions
                                                    : topicExercises.filter((ex) => isQuestionMatch(ex, cleanTerm)))
                                                : [];
                                            const isTopicTitleMatch =
                                                !cleanTerm ||
                                                topic.name?.toLowerCase().includes(cleanTerm) ||
                                                topic.description?.toLowerCase().includes(cleanTerm);

                                            const displayedExercises =
                                                cleanTerm && matchingQuestions.length > 0
                                                    ? matchingQuestions
                                                    : topicExercises;

                                            const totalQuestions = displayedExercises.length;
                                            const totalPages = Math.ceil(totalQuestions / pageSize) || 1;
                                            const currentPage = Math.min(Math.max(1, topicPages[topic.id] || 1), totalPages);
                                            const startIndex = (currentPage - 1) * pageSize;
                                            const currentQuestions = displayedExercises.slice(startIndex, startIndex + pageSize);

                                            return (
                                                <article
                                                    key={topic.id}
                                                    className={`${styles.topicCard} ${isOpen ? styles.isOpen : ''}`}
                                                >
                                                    <div
                                                        className={`${styles.topicToggle} ${isOpen ? styles.expandedHeader : ''}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-expanded={isOpen ? 'true' : 'false'}
                                                        onClick={() => handleToggleTopic(topic)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                handleToggleTopic(topic);
                                                            }
                                                        }}
                                                    >
                                                        <div className={styles.topicToggleTop}>
                                                            <h2 className={styles.topicTitle}>
                                                                {highlightMatch(topic.name, searchTerm)}
                                                            </h2>

                                                            <span
                                                                className={`${styles.expandIcon} ${isOpen ? styles.expandedCloseIcon : ''} ${isLoadingThisTopic ? styles.isLoading : ''}`}
                                                                aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}
                                                            >
                                                                {isLoadingThisTopic ? (
                                                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                                                ) : (
                                                                    <i className="fa-solid fa-chevron-down"></i>
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className={styles.topicToggleBottom}>
                                                            <div className={styles.topicMeta}>
                                                                <span className={styles.skillBadge}>
                                                                    <i className="fa-solid fa-microphone"></i>
                                                                    Speaking
                                                                </span>

                                                                {cleanTerm && matchingQuestions.length > 0 && (
                                                                    <span className={styles.matchBadge} title="Số câu hỏi khớp từ khóa">
                                                                        <i className="fa-solid fa-magnifying-glass"></i>
                                                                        {matchingQuestions.length} câu hỏi khớp
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {isOpen && totalPages > 1 && (
                                                                <div className={styles.topicPageNav} onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.topicPageArrowBtn}
                                                                        disabled={currentPage <= 1}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTopicPages(prev => ({
                                                                                ...prev,
                                                                                [topic.id]: Math.max(1, currentPage - 1)
                                                                            }));
                                                                        }}
                                                                        title="Trang trước"
                                                                        aria-label="Trang trước"
                                                                    >
                                                                        <i className="fa-solid fa-chevron-left"></i>
                                                                    </button>
                                                                    <span className={styles.topicPageText}>
                                                                        {currentPage} / {totalPages}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.topicPageArrowBtn}
                                                                        disabled={currentPage >= totalPages}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTopicPages(prev => ({
                                                                                ...prev,
                                                                                [topic.id]: Math.min(totalPages, currentPage + 1)
                                                                            }));
                                                                        }}
                                                                        title="Trang sau"
                                                                        aria-label="Trang sau"
                                                                    >
                                                                        <i className="fa-solid fa-chevron-right"></i>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className={styles.topicContent}>
                                                        <div className={styles.topicContentInner}>
                                                            <div className={styles.questionsArea}>
                                                                <div className={styles.questionsHead}>
                                                                    <div>
                                                                        <h3>
                                                                            {cleanTerm && matchingQuestions.length > 0 && !isTopicTitleMatch
                                                                                ? `Câu hỏi phù hợp trong ${topic.name}`
                                                                                : `Câu hỏi trong ${topic.name}`}
                                                                        </h3>
                                                                        <p>
                                                                            {cleanTerm && matchingQuestions.length > 0 && !isTopicTitleMatch
                                                                                ? `Tìm thấy ${matchingQuestions.length} câu hỏi khớp từ khóa "${searchTerm}".`
                                                                                : 'Chọn một câu để bắt đầu luyện tập.'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {isLoadingThisTopic ? (
                                                                    <div className={styles.loadingArea}>
                                                                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                                                                        Đang tải câu hỏi...
                                                                    </div>
                                                                ) : displayedExercises.length === 0 ? (
                                                                    <div className={styles.emptyState}>
                                                                        Chưa có câu hỏi luyện nói nào cho chủ đề này.
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.contentFadeIn}>
                                                                        <QuestionList
                                                                            exercises={currentQuestions}
                                                                            startIndex={startIndex}
                                                                            searchTerm={searchTerm}
                                                                            onExerciseClick={handleExerciseClick}
                                                                            topic={topic}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                );
                            })
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
