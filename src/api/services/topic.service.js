import axiosClient from '../axiosClient';

const topicService = {
    getAll: () => axiosClient.get('/topic'),
    create: (name, description) => axiosClient.post('/topic', { name, description }),
    getById: (id) => axiosClient.get(`/topic/${id}`),
    delete: (id) => axiosClient.delete(`/topic/${id}`)
};

export default topicService;
