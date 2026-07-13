import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7053/api';

const axiosClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const method = config.method?.toLowerCase();
        if (method === 'put' || method === 'delete') {
            const separator = config.url.includes('?') ? '&' : '?';
            config.url = `${config.url}${separator}_method=${method.toUpperCase()}`;
            config.method = 'post';
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response.data || response,
    (error) => {
        const msg = error.response?.data?.errorMessage || error.response?.data?.message || 'Network error occurred';
        return Promise.reject({ message: msg, status: error.response?.status });
    }
);

export default axiosClient;
