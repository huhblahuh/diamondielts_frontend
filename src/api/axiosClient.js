import axios from 'axios';

const API_URL = import.meta.env.DEV
    ? '/api'
    : 'https://api-tunnel.diamonds-speaking.space/api';

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

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response.data || response,
    (error) => {
        const status = error.response?.status;
        const responseData = error.response?.data;
        if (status === 401 && localStorage.getItem('token')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            if (window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
        }

        const fallbackMessage = status === 401
            ? 'Thông tin đăng nhập không hợp lệ hoặc phiên làm việc đã hết hạn.'
            : status === 403
                ? 'Bạn không thể thực hiện thao tác này.'
                : 'Không thể thực hiện yêu cầu. Vui lòng thử lại sau.';
        const publicMessage = responseData
            && typeof responseData === 'object'
            && typeof responseData.message === 'string'
            ? responseData.message
            : null;
        const publicCode = responseData
            && typeof responseData === 'object'
            && typeof responseData.code === 'string'
            ? responseData.code
            : undefined;
        const message = publicMessage || fallbackMessage;

        return Promise.reject({
            code: publicCode,
            message,
            status,
            canRetry: responseData?.canRetry === true,
        });
    }
);

export default axiosClient;
