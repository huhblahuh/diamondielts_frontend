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

    getFreeSpeakingQuotas: (classId, search = '') =>
        axiosClient.get(
            `/admin/quota-dashboard/classes/${classId}/free-speaking`,
            { params: { search: search || undefined } },
        ),

    updateFreeSpeakingQuotas: (classId, payload) =>
        axiosClient.put(
            `/admin/quota-dashboard/classes/${classId}/free-speaking`,
            payload,
        ),
};

export default quotaDashboardService;
