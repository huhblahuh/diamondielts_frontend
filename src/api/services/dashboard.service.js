import axiosClient from '../axiosClient';

const dashboardService = {
    /**
     * Lấy dữ liệu tổng hợp cho Dashboard học sinh.
     * @returns {Promise<{
     *   totalClasses: number,
     *   totalSubmissions: number,
     *   upcomingDeadlines: Array<{assignmentId, title, className, dueDate, daysLeft}>,
     *   activityHeatmap: Array<{date: string, count: number}>
     * }>}
     */
    getSummary: () => axiosClient.get('/student/dashboard/summary'),
};

export default dashboardService;
