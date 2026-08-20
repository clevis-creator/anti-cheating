import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import CoursesPage from './pages/admin/CoursesPage';
import SettingsPage from './pages/admin/SettingsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ExamsListPage from './pages/teacher/ExamsListPage';
import ExamBuilderPage from './pages/teacher/ExamBuilderPage';
import GradingPage from './pages/teacher/GradingPage';
import LiveMonitorPage from './pages/teacher/LiveMonitorPage';
import ReportsPage from './pages/teacher/ReportsPage';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import StudentsPage from './pages/teacher/StudentsPage';

import StudentDashboard from './pages/student/StudentDashboard';
import AvailableExamsPage from './pages/student/AvailableExamsPage';
import ExamHistoryPage from './pages/student/ExamHistoryPage';
import ResultsPage from './pages/student/ResultsPage';
import ResultDetailPage from './pages/student/ResultDetailPage';
import TakeExamPage from './pages/student/TakeExamPage';
import CertificatesPage from './pages/student/CertificatesPage';

import NotificationsPage from './pages/shared/NotificationsPage';
import ProfilePage from './pages/shared/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />

                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* Admin */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/admin" element={<DashboardLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="courses" element={<CoursesPage />} />
                    <Route path="exams" element={<ExamsListPage basePath="/admin" />} />
                    <Route path="exams/new" element={<ExamBuilderPage />} />
                    <Route path="exams/:id/edit" element={<ExamBuilderPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="audit-logs" element={<AuditLogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* Teacher */}
                <Route element={<ProtectedRoute roles={['teacher']} />}>
                  <Route path="/teacher" element={<DashboardLayout />}>
                    <Route index element={<TeacherDashboard />} />
                    <Route path="exams" element={<ExamsListPage />} />
                    <Route path="courses" element={<CoursesPage />} />
                    <Route path="exams/new" element={<ExamBuilderPage />} />
                    <Route path="exams/:id/edit" element={<ExamBuilderPage />} />
                    <Route path="question-bank" element={<QuestionBankPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="grading" element={<GradingPage />} />
                    <Route path="monitor/:examId" element={<LiveMonitorPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* Student */}
                <Route element={<ProtectedRoute roles={['student']} />}>
                  <Route path="/student" element={<DashboardLayout />}>
                    <Route index element={<StudentDashboard />} />
                    <Route path="exams" element={<AvailableExamsPage />} />
                    <Route path="history" element={<ExamHistoryPage />} />
                    <Route path="results" element={<ResultsPage />} />
                    <Route path="results/:id" element={<ResultDetailPage />} />
                    <Route path="certificates" element={<CertificatesPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                  <Route path="/student/exams/:examId/take" element={<TakeExamPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'text-sm',
                style: { borderRadius: '12px' },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
