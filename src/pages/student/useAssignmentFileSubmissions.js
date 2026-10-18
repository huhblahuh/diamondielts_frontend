import { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Swal from 'sweetalert2';
import { showToastError } from '../../utils/toast';

export default function useAssignmentFileSubmissions({ histories, refreshItem }) {
    // File submissions
    const [pendingFiles, setPendingFiles] = useState({});
    const [editingSubmissionId, setEditingSubmissionId] = useState(null);
    const [submittingItemId, setSubmittingItemId] = useState(null);

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
            await refreshItem(itemId, true);
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
            await refreshItem(itemId, true);
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
            await refreshItem(itemId, true);
        } catch (err) {
            console.error('Failed to delete submission:', err);
            showToastError('Không thể xóa bài nộp. Vui lòng thử lại sau.');
        } finally {
            setSubmittingItemId(null);
        }
    };

    return {
        pendingFiles, editingSubmissionId, submittingItemId,
        setEditingSubmissionId, handleFileChange, handleSubmitFileHomework,
        handleEditFileSubmission, handleSaveEditedFileSubmission, handleRemoveFileSubmission,
    };
}
