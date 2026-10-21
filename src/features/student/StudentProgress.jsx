import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../api/services/auth.service';
import StudentProfileModal from '../classroom/components/StudentProfileModal';
import StudentDashboard from './StudentDashboard';

export default function StudentProgress() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser() || {};

    return (
        <>
            <StudentDashboard />
            <StudentProfileModal
                student={{ studentId: user.userId, fullName: user.fullName || 'Học viên' }}
                onClose={() => navigate('/student/dashboard')}
            />
        </>
    );
}
