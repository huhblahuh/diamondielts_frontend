import axiosClient from '../axiosClient';

const profileService = {
    getProfile: () => axiosClient.get('/profile'),
    getStudentProfile: (studentId, params) => axiosClient.get(`/students/${studentId}/profile`, { params }),
    updateProfile: (payload) => axiosClient.patch('/profile', payload),
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return axiosClient.post('/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteAvatar: () => axiosClient.delete('/profile/avatar'),
};

export default profileService;
