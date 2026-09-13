import axiosClient from '../axiosClient';

const authService = {
    login: (credentials) => axiosClient.post('/auth/login', credentials),
    requestForgotPassword: (payload) =>
        axiosClient.post('/auth/password/forgot/request', payload),
    verifyOtp: (payload) =>
        axiosClient.post('/auth/verifications/verify', payload),
    resendOtp: (requestId) =>
        axiosClient.post(`/auth/verifications/${requestId}/resend`),
    confirmPasswordReset: (payload) =>
        axiosClient.post('/auth/password/reset/confirm', payload),
    requestPasswordChange: (payload) =>
        axiosClient.post('/auth/password/change/request', payload),
    confirmPasswordChange: (payload) =>
        axiosClient.post('/auth/password/change/confirm', payload),
    requestNewEmailVerification: (payload) =>
        axiosClient.post('/auth/email/change/new-email/request', payload),
    confirmEmailChange: (payload) =>
        axiosClient.post('/auth/email/change/confirm', payload),
    getCurrentUser: () => JSON.parse(localStorage.getItem('user')),
    updateCurrentUser: (changes) => {
        const current = JSON.parse(localStorage.getItem('user') || '{}');
        const updated = { ...current, ...changes };
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('diamond:user-updated', { detail: updated }));
        return updated;
    },
    getToken: () => localStorage.getItem('token'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export default authService;
