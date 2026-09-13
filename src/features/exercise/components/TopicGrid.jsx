import React from 'react';
import Swal from 'sweetalert2';
import topicService from '../../../api/services/topic.service';
import styles from '../ExerciseManagement.module.css';

export default function TopicGrid({ topics, loading, onSelectTopic, onDeleteTopic, onRefreshTopics }) {
    const handleAddTopic = async () => {
        const { value: formValues } = await Swal.fire({
            title: '🎉 Tạo Chủ đề Tự luyện Mới',
            html: `
                <div class="exercise-topic-form">
                    <label for="swal-topic-name">Tên Chủ Đề <span>*</span></label>
                    <input id="swal-topic-name" class="swal2-input" placeholder="Nhập tên chủ đề (Ví dụ: Environment, Tech...)">
                    
                    <label for="swal-topic-desc">Mô Tả Chủ Đề</label>
                    <textarea id="swal-topic-desc" class="swal2-textarea" placeholder="Nhập mô tả tóm tắt..."></textarea>
                </div>
            `,
            customClass: { popup: styles.topicDialog },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Tạo chủ đề',
            cancelButtonText: 'Hủy',
            preConfirm: () => {
                const name = document.getElementById('swal-topic-name').value.trim();
                const desc = document.getElementById('swal-topic-desc').value.trim();
                if (!name) {
                    Swal.showValidationMessage('Tên chủ đề không thể bỏ trống!');
                    return false;
                }
                return { name, desc };
            }
        });

        if (formValues) {
            try {
                await topicService.create(formValues.name, formValues.desc);
                Swal.fire('Thành công', 'Đã thêm chủ đề mới!', 'success');
                onRefreshTopics();
            } catch (err) { 
                Swal.fire('Thất bại', 'Lỗi hệ thống', 'error'); 
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2><i className={`bi bi-journal-bookmark-fill ${styles.headingIcon}`}></i>Kho Bài Tập Tự Luyện</h2>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-5 text-muted">Đang đồng bộ dữ liệu chủ đề...</div>
            ) : (
                <div className={styles.grid}>
                    <div className={`${styles.card} ${styles.cardCreate}`} onClick={handleAddTopic}>
                        <div className={styles.plusCircle}><i className="bi bi-plus-lg"></i></div>
                        <div className={styles.cardTitle}>Tạo Topic Mới</div>
                    </div>

                    {topics.map((topic) => (
                        <div key={topic.id} className={styles.card} onClick={() => onSelectTopic(topic)}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic); }}
                                className={styles.deleteTopicBtn}
                                title="Xóa chủ đề"
                                aria-label={`Xóa chủ đề ${topic.name}`}
                            >
                                <i className="bi bi-trash-fill"></i>
                            </button>
                            <div className={styles.cardIcon}><i className="bi bi-collection-fill"></i></div>
                            <div className={styles.cardTitle}>{topic.name}</div>
                            <div className={styles.cardDesc}>
                                {topic.description || `Khai thác bộ đề trắc nghiệm, nghe chép, và phỏng vấn Speaking cho chủ đề ${topic.name}.`}
                            </div>
                            <div className={styles.cardFooter}>
                                <span className={styles.badge}>{topic.exerciseCount || 0} Bài đã lưu</span>
                                <i className={`bi bi-arrow-right-short ${styles.cardArrow}`}></i>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
