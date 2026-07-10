import axiosClient from '../axiosClient';

const authService = {
    login: (credentials) => axiosClient.post('/auth/login', credentials),
    getCurrentUser: () => JSON.parse(localStorage.getItem('user')),
    getToken: () => localStorage.getItem('token'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export default authService;
