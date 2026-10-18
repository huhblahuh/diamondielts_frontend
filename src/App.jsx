import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import DiamondsSkin from './components/diamonds/DiamondsSkin';

const RedirectToStudentAssignment = () => {
  const { assignmentId } = useParams();
  const location = useLocation();
  return <Navigate to={`/student/assignments/${assignmentId}${location.search}${location.hash}`} state={location.state} replace />;
};

const Login = lazy(() => import('./features/auth/Login'));
const ForgotPassword = lazy(() => import('./features/auth/ForgotPassword'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/teacher/DashboardPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const QuotaDashboardPage = lazy(() => import('./pages/admin/QuotaDashboardPage'));
const TeacherClassrooms = lazy(() => import('./pages/teacher/ClassroomsPage'));
const TeacherExercises = lazy(() => import('./pages/teacher/ExercisesPage'));
const AssignmentBuilder = lazy(() => import('./pages/teacher/AssignmentBuilderPage'));
const AssignmentReview = lazy(() => import('./pages/teacher/AssignmentReviewPage'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/DashboardPage'));
const StudentProgress = lazy(() => import('./pages/student/ProgressPage'));
const StudentPractice = lazy(() => import('./pages/student/PracticePage'));
const StudentClassrooms = lazy(() => import('./pages/student/ClassroomsPage'));
const StudentAssignmentDetail = lazy(() => import('./pages/student/AssignmentDetailPage'));
const SpeakingPractice = lazy(() => import('./features/student/SpeakingPractice'));
const StudentSubmissionHistory = lazy(() => import('./pages/student/SubmissionHistoryPage'));
const StudentProfile = lazy(() => import('./pages/student/ProfilePage'));

function App() {
  const token = localStorage.getItem('token');

  const getRedirectPath = () => {
    if (!token) return "/login";
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'Admin') return "/admin/dashboard";
      if (user.role === 'Teacher') return "/teacher/dashboard";
      return "/student/dashboard";
    } catch (e) {
      return "/login";
    }
  };

  return (
    <Router>
      <DiamondsSkin />
      <Routes>
        {/* Tự động chuyển hướng dựa trên Role */}
        <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />

        {/* Login — vẫn cần Suspense riêng vì không có Layout */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingSpinner text="Đang tải trang" fullscreen />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<LoadingSpinner text="Đang tải trang" fullscreen />}>
              <ForgotPassword />
            </Suspense>
          }
        />

        {/* ══════ ADMIN ROUTES ══════ */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="quota-dashboard" element={<QuotaDashboardPage />} />
            <Route path="classrooms" element={<TeacherClassrooms />} />
            <Route path="assignment/:assignmentId" element={<AssignmentReview />} />
            <Route path="assignment/edit/:assignmentId" element={<AssignmentBuilder />} />
            <Route path="create-speaking" element={<AssignmentBuilder />} />
            <Route path="exercises" element={<TeacherExercises />} />
            <Route path="settings" element={<StudentProfile />} />
            <Route path="settings/security" element={<StudentProfile />} />
            <Route path="settings/account" element={<StudentProfile />} />
            <Route path="settings/notification" element={<Navigate to="/admin/settings/security" replace />} />
            <Route path="profile" element={<Navigate to="/admin/settings/account" replace />} />
          </Route>
        </Route>

        {/* ══════ TEACHER ROUTES ══════ */}
        {/* Layout tự xử lý Suspense skeleton cho từng page */}
        <Route element={<ProtectedRoute allowedRoles={['Teacher', 'Admin']} />}>
          <Route path="/teacher" element={<Layout />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="classrooms" element={<TeacherClassrooms />} />
            <Route path="assignment/:assignmentId" element={<AssignmentReview />} />
            <Route path="assignment/edit/:assignmentId" element={<AssignmentBuilder />} />
            <Route path="create-speaking" element={<AssignmentBuilder />} />
            <Route path="exercises" element={<TeacherExercises />} />
            <Route path="settings" element={<StudentProfile />} />
            <Route path="settings/security" element={<StudentProfile />} />
            <Route path="settings/account" element={<StudentProfile />} />
            <Route path="settings/notification" element={<Navigate to="/teacher/settings/security" replace />} />
            <Route path="profile" element={<Navigate to="/teacher/settings/account" replace />} />
          </Route>
        </Route>

        {/* ══════ STUDENT ROUTES ══════ */}
        <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
          <Route path="/student" element={<Layout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="dashboard/progress" element={<StudentProgress />} />
            <Route path="practice" element={<StudentPractice />} />
            <Route path="speaking/:exerciseId" element={<SpeakingPractice />} />
            <Route path="assignments" element={<StudentClassrooms />} />
            <Route path="assignment" element={<Navigate to="/student/assignments" replace />} />
            <Route path="assignments/:assignmentId" element={<StudentAssignmentDetail />} />
            <Route path="assignment/:assignmentId" element={<RedirectToStudentAssignment />} />
            <Route path="classrooms" element={<Navigate to="/student/assignments" replace />} />
            <Route path="classroom" element={<Navigate to="/student/assignments" replace />} />
            <Route path="classroom/assignment" element={<Navigate to="/student/assignments" replace />} />
            <Route path="classrooms/assignment" element={<Navigate to="/student/assignments" replace />} />
            <Route path="classroom/assignment/:assignmentId" element={<RedirectToStudentAssignment />} />
            <Route path="classrooms/assignment/:assignmentId" element={<RedirectToStudentAssignment />} />
            <Route path="history" element={<StudentSubmissionHistory />} />
            <Route path="settings" element={<StudentProfile />} />
            <Route path="settings/security" element={<StudentProfile />} />
            <Route path="settings/account" element={<StudentProfile />} />
            <Route path="settings/notification" element={<StudentProfile />} />
            <Route path="profile" element={<Navigate to="/student/settings/account" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
