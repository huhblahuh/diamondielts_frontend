import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

const Login = lazy(() => import('./features/auth/Login'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/teacher/DashboardPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const TeacherClassrooms = lazy(() => import('./pages/teacher/ClassroomsPage'));
const TeacherExercises = lazy(() => import('./pages/teacher/ExercisesPage'));
const AssignmentBuilder = lazy(() => import('./pages/teacher/AssignmentBuilderPage'));
const AssignmentReview = lazy(() => import('./pages/teacher/AssignmentReviewPage'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/DashboardPage'));
const StudentPractice = lazy(() => import('./pages/student/PracticePage'));
const StudentClassrooms = lazy(() => import('./pages/student/ClassroomsPage'));
const StudentAssignmentDetail = lazy(() => import('./pages/student/AssignmentDetailPage'));
const SpeakingPractice = lazy(() => import('./features/student/SpeakingPractice'));
const StudentSubmissionHistory = lazy(() => import('./pages/student/SubmissionHistoryPage'));



function App() {
  const token = localStorage.getItem('token');

  const getRedirectPath = () => {
    if (!token) return "/login";
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'Teacher' || user.role === 'Admin') return "/teacher/dashboard";
      return "/student/dashboard";
    } catch(e) {
      return "/login";
    }
  };

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner text="Đang tải trang" fullscreen />}>
        <Routes>
        {/* Tự động chuyển hướng dựa trên Role */}
        <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />
        
        <Route path="/login" element={<Login />} />
        
        {/* ══════ TEACHER ROUTES ══════ */}
        <Route element={<ProtectedRoute allowedRoles={['Teacher', 'Admin']} />}>
            <Route path="/teacher" element={<Layout />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="classrooms" element={<TeacherClassrooms />} />
              <Route path="assignment/:assignmentId" element={<AssignmentReview />} />
              <Route path="assignment/edit/:assignmentId" element={<AssignmentBuilder />} />
              <Route path="create-speaking" element={<AssignmentBuilder />} /> {/* Reusing builder for speaking assignments */}
              <Route path="exercises" element={<TeacherExercises />} />
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="users" element={<UserManagementPage />} />
              </Route>
            </Route>
        </Route>
 
        {/* ══════ STUDENT ROUTES ══════ */}
        <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
            <Route path="/student" element={<Layout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="practice" element={<StudentPractice />} />
                <Route path="speaking/:exerciseId" element={<SpeakingPractice />} />
                <Route path="classrooms" element={<StudentClassrooms />} />
                <Route path="assignment/:assignmentId" element={<StudentAssignmentDetail />} />
                <Route path="history" element={<StudentSubmissionHistory />} />
            </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
