import axiosClient from '../axiosClient';

const classroomService = {
    getTeacherClasses: () => axiosClient.get('/teacher/classroom'),
    getStudentClasses: () => axiosClient.get('/student/classroom'),
    getDetails: (classId, role = 'teacher') => axiosClient.get(`/${role}/classroom/${classId}`),
};

export default classroomService;
