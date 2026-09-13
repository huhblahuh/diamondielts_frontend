import axiosClient from '../axiosClient';

const dailyCostReportService = {
    getRange: ({ from, to, classId }) =>
        axiosClient.get('/admin/daily-cost-reports', {
            params: { from, to, classId: classId || undefined },
        }),
};

export default dailyCostReportService;
