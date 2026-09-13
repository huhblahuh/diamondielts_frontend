import axiosClient from '../axiosClient';

const dashboardService = {
    /**
     * Lấy dữ liệu tổng hợp cho Dashboard học sinh.
     * @returns {Promise<{
     *   fromDate: string,
     *   toDate: string,
     *   progressInterval: string,
     *   progress: Array,
     *   upcomingDeadlines: Array<{assignmentId, classId, title, className, dueDate, daysLeft}>,
     * }>}
     */
    getSummary: ({ fromDate, toDate, includeProgress = true } = {}) => axiosClient.get('/student/dashboard/summary', {
        params: { fromDate, toDate, includeProgress },
    }),

    /**
     * Lấy số lượt nộp Speaking theo ngày, tối đa 4 tháng.
     * @returns {Promise<{
     *   fromDate: string,
     *   toDate: string,
     *   monthCount: number,
     *   currentStreak: number,
     *   longestStreak: number,
     *   totalActiveDays: number,
     *   totalSubmissions: number,
     *   days: Array<{date: string, completedAttempts: number}>,
     * }>}
     */
    getActivity: ({ month, months = 1 } = {}) => axiosClient.get('/student/dashboard/activity', {
        params: { month, months },
    }),
};

export default dashboardService;
