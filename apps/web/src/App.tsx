import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';

const HomePage = lazy(() => import('@/pages/HomePage'));
const RunListPage = lazy(() => import('@/pages/RunListPage'));
const RunRecordPage = lazy(() => import('@/pages/RunRecordPage'));
const GpsRunPage = lazy(() => import('@/pages/GpsRunPage'));
const GoalsPage = lazy(() => import('@/pages/GoalsPage'));
const GoalCreatePage = lazy(() => import('@/pages/GoalCreatePage'));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const StatsPage = lazy(() => import('@/pages/StatsPage'));
const RankingPage = lazy(() => import('@/pages/RankingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));

function RouteLoader() {
  return (
    <div className="route-loader" role="status" aria-live="polite">
      <span className="route-loader__mark">RG</span>
      <span>正在准备你的跑步数据</span>
    </div>
  );
}

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
    <Suspense fallback={<RouteLoader />}>
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
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 兜底重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
