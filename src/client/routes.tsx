// Route table. Protected routes bọc trong AppShell; public token routes đứng riêng.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/auth-context.tsx';
import { AppShell } from './components/app-shell.tsx';
import { LoginPage } from './pages/login-page.tsx';
import { HomePage } from './pages/home-page.tsx';
import { MembersPage } from './pages/members-page.tsx';
import { SessionsPage } from './pages/sessions-page.tsx';
import { SessionDetailPage } from './pages/session-detail-page.tsx';
import { SettingsPage } from './pages/settings-page.tsx';
import { DebtsPage } from './pages/debts-page.tsx';
import { ReportsPage } from './pages/reports-page.tsx';
import { PublicSessionPage } from './pages/public-session-page.tsx';
import { PublicJoinPage } from './pages/public-join-page.tsx';
import { PublicBillPage } from './pages/public-bill-page.tsx';
import { PublicReportPage } from './pages/public-report-page.tsx';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-center text-muted">Đang tải…</div>;
  if (!authenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/s/:token" element={<PublicSessionPage />} />
      <Route path="/join/:token" element={<PublicJoinPage />} />
      <Route path="/b/:token" element={<PublicBillPage />} />
      <Route path="/r/:token" element={<PublicReportPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
