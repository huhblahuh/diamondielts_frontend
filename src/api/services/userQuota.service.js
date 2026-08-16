import axiosClient from '../axiosClient';

const userQuotaService = {
    getMySpeakingQuota: () => axiosClient.get('/user-quota/me'),
};

export default userQuotaService;
