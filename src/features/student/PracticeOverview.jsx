import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './PracticeOverview.module.css';
import Swal from 'sweetalert2';

export default function PracticeOverview() {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSpeakingClick = async (topic) => {
        try {
            setSelectedTopic(topic);
            setLoadingExercises(true);
            const res = await axiosClient.get(`/student/exercise?skill=SPEAKING&topicId=${topic.id}`);
            setExercises(res || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Không thể kết nối với hệ thống', 'error');
        } finally {
            setLoadingExercises(false);
        }
    };

    useEffect(() => {
        const loadTopics = async () => {
            try {
                setLoading(true);
                const resp = await axiosClient.get('/topic');
                setTopics(resp || []);

                // Nếu quay lại từ view luyện tập của một topic cũ, tự động mở lại topic đó
                if (location.state?.selectedTopicId) {
                    const matchedTopic = (resp || []).find(t => t.id === location.state.selectedTopicId);
                    if (matchedTopic) {
                        handleSpeakingClick(matchedTopic);
                    }
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể tải danh sách chủ đề', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadTopics();
    }, [location.state]);

    const renderContent = (jsonStr) => {
        if (!jsonStr) return "Bài tập nói tự do";
        try {
            const parsed = JSON.parse(jsonStr);
            return parsed.passageHtml || parsed.htmlContent || parsed.textPrompt || parsed.title || parsed.prompt || parsed.question || jsonStr;
        } catch (e) {
            return jsonStr;
        }
    };

    const handleBack = () => {
        setSelectedTopic(null);
        setExercises([]);
    };

    return (
        <div className={styles.container}>
            {selectedTopic ? (
                <>
                    <button onClick={handleBack} className={styles.backBtn}>
                        <i className="bi bi-arrow-left"></i> Quay lại danh sách chủ đề
                    </button>

                    <div className={styles.header}>
                        <div>
                            <h2>
                                <i className="bi bi-mic" style={{ color: '#4f46e5' }}></i> Chủ đề: {selectedTopic.name}
                            </h2>
                            <p>Chọn một câu hỏi dưới đây để bắt đầu luyện tập ghi âm và chấm điểm AI.</p>
                        </div>
                    </div>

                    {loadingExercises ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách câu hỏi...</div>
                    ) : exercises.length === 0 ? (
                        <div className={styles.empty}>Chưa có câu hỏi luyện nói nào cho chủ đề này.</div>
                    ) : (
                        <div className={styles.exerciseList}>
                            {exercises.map((ex, index) => (
                                <div
                                    key={ex.exerciseId}
                                    className={styles.exerciseCard}
                                    onClick={() => navigate(`/student/speaking/${ex.exerciseId}`)}
                                >
                                    <div className={styles.exerciseInfo}>
                                        <span className={styles.exerciseIndex}>Câu hỏi #{index + 1}</span>
                                        <span className={styles.exerciseType}>{ex.type || 'Luyện nói tự do'}</span>
                                        <div
                                            className={styles.exerciseTitle}
                                            dangerouslySetInnerHTML={{ __html: renderContent(ex.formattedContent) }}
                                        />
                                    </div>
                                    <button className={styles.startBtn}>
                                        <i className="bi bi-mic-fill"></i> Luyện tập ngay
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className={styles.header}>
                        <div>
                            <h2><i className="bi bi-journal-text" style={{ color: '#4f46e5' }}></i> Kho Luyện Tập Tự Do</h2>
                            <p>Khám phá kho tài liệu phong phú, ôn luyện theo chủ đề yêu thích bất cứ lúc nào.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải chủ đề...</div>
                    ) : (
                        <div className={styles.topicGrid}>
                            {topics.length === 0 ? (
                                <div className={styles.empty}>Chưa có chủ đề nào được tạo.</div>
                            ) : (
                                topics.map(top => (
                                    <div key={top.id} className={styles.topicCard}>
                                        <div className={styles.cardIcon}>
                                            <i className="bi bi-tags-fill"></i>
                                        </div>
                                        <div className={styles.cardContent}>
                                            <h4>{top.name}</h4>
                                            <p>{top.description || 'Chưa có mô tả chi tiết cho chủ đề này.'}</p>
                                            <div className={styles.skillGroup}>
                                                <button className={styles.skillBtn} onClick={() => handleSpeakingClick(top)}>
                                                    <i className="bi bi-mic-fill"></i> Speaking
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
