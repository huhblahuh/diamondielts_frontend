import React from 'react';
import Swal from 'sweetalert2';
import topicService from '../../../api/services/topic.service';
import styles from '../ExerciseManagement.module.css';

export default function TopicGrid({ topics, loading, onSelectTopic, onDeleteTopic, onRefreshTopics }) {
    const handleAddTopic = async () => {
        const { value: formValues } = await Swal.fire({
            title: '🎉 Tạo Chủ đề Tự luyện Mới',
            html: `
                <div style="text-align: left;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; font-size: 0.85rem; color: #334155;">Tên Chủ Đề <span style="color: #ef4444;">*</span></label>
                    <input id="swal-topic-name" class="swal2-input" style="width: 100%; margin: 0 0 1rem 0; box-sizing: border-box; border-radius: 8px; font-size: 0.9rem;" placeholder="Nhập tên chủ đề (Ví dụ: Environment, Tech...)">
                    
                    <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; font-size: 0.85rem; color: #334155;">Mô Tả Chủ Đề</label>
                    <textarea id="swal-topic-desc" class="swal2-textarea" style="width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; font-size: 0.9rem; height: 80px;" placeholder="Nhập mô tả tóm tắt..."></textarea>
                </div>
            `,
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
                    <h2>📚 Kho Bài Tập Tự Luyện</h2>
                    <p>Chọn một chủ đề bên dưới để bắt đầu thiết kế câu hỏi cấp tốc.</p>
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
                        <div key={topic.id} className={styles.card} onClick={() => onSelectTopic(topic)} style={{ position: 'relative' }}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic); }}
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    border: 'none',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.85rem',
                                    zIndex: 5
                                }}
                                title="Xóa chủ đề"
                                onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            >
                                <i className="bi bi-trash-fill"></i>
                            </button>
                            <div className={styles.cardIcon}><i className="bi bi-collection-fill"></i></div>
                            <div className={styles.cardTitle}>{topic.name}</div>
                            <div className={styles.cardDesc}>
                                {topic.description || `Khai thác bộ đề trắc nghiệm, nghe chép, và phỏng vấn Speaking AI cho chủ đề ${topic.name}.`}
                            </div>
                            <div className={styles.cardFooter}>
                                <span className={styles.badge}>{topic.exerciseCount || 0} Bài đã lưu</span>
                                <i className="bi bi-arrow-right-short" style={{fontSize:'1.4rem', color:'#94a3b8'}}></i>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
