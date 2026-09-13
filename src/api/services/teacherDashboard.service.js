import axiosClient from '../axiosClient';

const teacherDashboardService = {
    getClasses: () => axiosClient.get('/teacher/classroom'),
    getClassDetail: (classId) => axiosClient.get(`/teacher/classroom/${classId}`),
    getAnalytics: ({ type = 'Overall', id, fromDate, toDate }) => {
        const params = { fromDate, toDate };
        if (type !== 'Overall') params.id = id;
        return axiosClient.get(`/teacher/dashboard/${type}`, { params });
    },
};

export default teacherDashboardService;
