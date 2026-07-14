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
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="bi bi-arrow-left-circle-fill" style={{ fontSize: '1.2rem' }}></i> Quay về Kho Chủ đề
                </button>
            </div>

            <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                padding: '2rem',
                borderRadius: '16px',
                color: '#ffffff',
                marginBottom: '2rem',
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.2)'
            }}>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>📚 Chủ đề: {topic.name}</h3>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                    Quản lý ngân hàng câu hỏi, bài tập tự luyện và các đề thi Speaking/Reading/Listening/Writing cho học viên.
                </p>
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
