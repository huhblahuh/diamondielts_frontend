import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import exerciseService from '../../../api/services/exercise.service';
import ExerciseList from './ExerciseList';
import ExerciseDesignerModal from './ExerciseDesignerModal';
import styles from '../ExerciseManagement.module.css';

export default function ExerciseDesigner({ topic, onBack, onRefreshTopics }) {
    const [existingExercises, setExistingExercises] = useState([]);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState(null);

    const loadTopicExercises = async () => {
        setLoadingExercises(true);
        try {
            const res = await exerciseService.getAll(topic.id);
            setExistingExercises(res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExercises(false);
        }
    };

    useEffect(() => {
        loadTopicExercises();
    }, [topic.id]);

    const handleStartAdd = () => {
        setEditingExercise(null);
        setIsModalOpen(true);
    };

    const handleStartEdit = (exercise) => {
        setEditingExercise(exercise);
        setIsModalOpen(true);
    };

    const handleDeleteExercise = async (id) => {
        const result = await Swal.fire({
            title: 'Bạn chắc chắn muốn xóa?',
            text: "Hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Có, xóa đi!',
            cancelButtonText: 'Hủy'
        });
        if (result.isConfirmed) {
            try {
                await exerciseService.delete(id);
                Swal.fire('Đã xóa!', 'Đề bài đã được xóa khỏi ngân hàng.', 'success');
                loadTopicExercises();
                onRefreshTopics();
            } catch (err) {
                Swal.fire('Lỗi', 'Không thể xóa đề bài.', 'error');
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.designerToolbar}>
                <button onClick={onBack} className={styles.backBtn}>
                    <i className="bi bi-arrow-left-circle-fill"></i> Quay về Kho Chủ đề
                </button>
            </div>

            <div className={styles.topicHero}>
                <div className={styles.topicHeroIcon}><i className="bi bi-journals"></i></div>
                <div>
                <span className={styles.topicHeroEyebrow}>Chủ đề đang quản lý</span>
                <h3>{topic.name}</h3>
                <p>
                    Quản lý ngân hàng câu hỏi, bài tập tự luyện và các đề thi Speaking/Reading/Listening/Writing cho học viên.
                </p>
                </div>
            </div>

            <ExerciseList 
                exercises={existingExercises} 
                loading={loadingExercises} 
                topicName={topic.name} 
                onAdd={handleStartAdd}
                onEdit={handleStartEdit}
                onDelete={handleDeleteExercise}
                topicId={topic.id}
                onRefresh={loadTopicExercises}
            />

            <ExerciseDesignerModal 
                key={editingExercise ? `edit-${editingExercise.exerciseId}` : 'add-new'}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                topic={topic}
                exercise={editingExercise}
                onSaved={() => {
                    loadTopicExercises();
                    onRefreshTopics();
                }}
            />
        </div>
    );
}
