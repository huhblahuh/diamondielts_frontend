import axiosClient from '../axiosClient';

const assignmentService = {
    getAll: (classId = null) => {
        const url = classId ? `/teacher/assignment?classId=${classId}` : '/teacher/assignment';
        return axiosClient.get(url);
    },
    getById: (id) => axiosClient.get(`/teacher/assignment/${id}`),
    getStudentAssignmentSummary: (assignmentId) =>
        axiosClient.get(`/student/assignment/${assignmentId}`),
    getStudentAssignmentItemDetail: (assignmentId, itemId) =>
        axiosClient.get(`/student/assignment/${assignmentId}/items/${itemId}`),
    create: (payload) => axiosClient.post('/teacher/assignment', payload),
    update: (id, payload) => axiosClient.put(`/teacher/assignment/${id}`, payload),
    setDeadlineReminder: (id, reminderAt) => axiosClient.put(
        `/teacher/assignment/${id}/deadline-reminder`,
        { reminderAt }
    ),
    delete: (id) => axiosClient.delete(`/teacher/assignment/${id}`),
    uploadMaterial: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return axiosClient.post('/file/upload-material', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteMaterial: (filePath) => {
        return axiosClient.delete(`/student/assignment/delete-material?filePath=${encodeURIComponent(filePath)}`);
    }
};

export default assignmentService;
