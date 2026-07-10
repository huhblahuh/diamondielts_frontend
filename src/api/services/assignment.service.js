import axiosClient from '../axiosClient';

const assignmentService = {
    getAll: (classId = null) => {
        const url = classId ? `/teacher/assignment?classId=${classId}` : '/teacher/assignment';
        return axiosClient.get(url);
    },
    getById: (id) => axiosClient.get(`/teacher/assignment/${id}`),
    create: (payload) => axiosClient.post('/teacher/assignment', payload),
    update: (id, payload) => axiosClient.put(`/teacher/assignment/${id}`, payload),
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
