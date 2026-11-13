import axios from 'axios';
import { reportApiError, setReportUser } from '../utils/errorReporting.js';

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
        if (config.skipAuth) {
            delete config.headers.Authorization;
        } else if (token) {
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
        const normalizedError = {
            code: responseData?.code,
            status,
            canRetry: responseData?.canRetry === true,
        };
        reportApiError(error, normalizedError);
        if (status === 401 && !error.config?.skipAuth && localStorage.getItem('token')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setReportUser(null);

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
        const submissionCode = publicCode?.startsWith('SPEAKING_')
            || publicCode?.startsWith('FILE_SUBMISSION_');
        const message = submissionCode && publicMessage
            ? `${publicMessage} (Mã lỗi: ${publicCode})`
            : publicMessage || fallbackMessage;

        Object.assign(normalizedError, {
            code: publicCode,
            message,
            status,
            requestId: typeof responseData?.requestId === 'string'
                ? responseData.requestId
                : error.config?.headers?.['X-Request-ID'],
            canRetry: responseData?.canRetry === true,
        });
        return Promise.reject(normalizedError);
    }
);

export default axiosClient;
