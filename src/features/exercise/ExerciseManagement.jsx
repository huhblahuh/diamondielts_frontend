import React, { useState, useEffect } from 'react';
import topicService from '../../api/services/topic.service';
import exerciseService from '../../api/services/exercise.service';
import Swal from 'sweetalert2';
import TopicGrid from './components/TopicGrid';
import ExerciseDesigner from './components/ExerciseDesigner';
import styles from './ExerciseManagement.module.css';

export default function ExerciseManagement() {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);

    const loadTopics = async () => {
        setLoading(true);
        try {
            const res = await topicService.getAll();
            setTopics(res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTopics();
    }, []);

    const handleDeleteTopic = (topic) => {
        Swal.fire({
            title: 'Xác nhận xóa?',
            text: `Bạn có chắc chắn muốn xóa chủ đề "${topic.name}"? Tất cả các câu hỏi/bài tập tự luyện liên kết cũng sẽ bị ẩn.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoading(true);
                try {
                    await topicService.delete(topic.id);
                    Swal.fire('Thành công', 'Đã xóa chủ đề thành công!', 'success');
                    loadTopics();
                } catch (err) {
                    console.error(err);
                    Swal.fire('Lỗi', err.message || 'Không thể xóa chủ đề.', 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (selectedTopic) {
        return (
            <ExerciseDesigner 
                topic={selectedTopic} 
                onBack={() => setSelectedTopic(null)} 
                onRefreshTopics={loadTopics}
            />
        );
    }

    return (
        <TopicGrid 
            topics={topics} 
            loading={loading} 
            onSelectTopic={setSelectedTopic} 
            onDeleteTopic={handleDeleteTopic}
            onRefreshTopics={loadTopics} 
        />
    );
}
