import axiosClient from '../axiosClient';

const exerciseService = {
    getAll: (topicId = null) => {
        const url = topicId ? `/teacher/exercise?topicId=${topicId}` : '/teacher/exercise';
        return axiosClient.get(url);
    },
    create: (exerciseData) => axiosClient.post('/teacher/exercise', exerciseData),
    getById: (id) => axiosClient.get(`/teacher/exercise/${id}`),
    update: (id, exerciseData) => axiosClient.put(`/teacher/exercise/${id}`, exerciseData),
    delete: (id) => axiosClient.delete(`/teacher/exercise/${id}`),
    importExcel: (formData) => axiosClient.post('/teacher/exercise/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadTemplate: () => axiosClient.get('/teacher/exercise/import-excel/template', { responseType: 'blob' })
};

export default exerciseService;
