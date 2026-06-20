import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import HomePage from '@/pages/HomePage';
import RunListPage from '@/pages/RunListPage';
import RunRecordPage from '@/pages/RunRecordPage';
import GpsRunPage from '@/pages/GpsRunPage';
import GoalsPage from '@/pages/GoalsPage';
import GoalCreatePage from '@/pages/GoalCreatePage';
import AchievementsPage from '@/pages/AchievementsPage';
import StatsPage from '@/pages/StatsPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function App() {
  const { theme } = useThemeStore();
  const { isLoggedIn, fetchUser } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isLoggedIn) fetchUser();
  }, [isLoggedIn, fetchUser]);

  return (
    <Routes>
      {/* 登录页不需要底部导航 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 需要登录的页面 */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/runs" element={<RunListPage />} />
        <Route path="/runs/record" element={<RunRecordPage />} />
        <Route path="/runs/gps" element={<GpsRunPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/create" element={<GoalCreatePage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 兜底重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
