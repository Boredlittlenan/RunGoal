import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import AdminLayout from './components/AdminLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const RunsPage = lazy(() => import('./pages/RunsPage'));
const RunDetailPage = lazy(() => import('./pages/RunDetailPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="admin-route-loader"><Spin size="large" /></div>}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
