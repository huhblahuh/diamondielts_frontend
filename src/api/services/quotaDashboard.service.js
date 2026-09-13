import axiosClient from '../axiosClient';

const quotaDashboardService = {
    getClasses: () => axiosClient.get('/admin/quota-dashboard/classes'),

    getOverview: ({ classId, from, to, groupBy }) =>
        axiosClient.get('/admin/quota-dashboard/overview', {
            params: {
                classId: classId || undefined,
                from,
                to,
                groupBy,
            },
        }),

    getFreeSpeakingQuotas: (classId, search = '', timeFrame) =>
        axiosClient.get(
            `/admin/quota-dashboard/classes/${classId}/free-speaking`,
            {
                params: {
                    search: search || undefined,
                    timeFrame: timeFrame || undefined,
                },
            },
        ),

    getUserFreeSpeakingQuotas: ({ classId, search = '', timeFrame }) =>
        axiosClient.get('/admin/quota-dashboard/users/free-speaking', {
            params: {
                classId: classId || undefined,
                search: search || undefined,
                timeFrame: timeFrame || undefined,
            },
        }),

    updateFreeSpeakingQuotas: (classId, payload) =>
        axiosClient.put(
            `/admin/quota-dashboard/classes/${classId}/free-speaking`,
            payload,
        ),

    setUserFreeSpeakingQuota: (userId, payload) =>
        axiosClient.put(
            `/admin/quota-dashboard/users/${userId}/free-speaking`,
            payload,
        ),
};

export default quotaDashboardService;
