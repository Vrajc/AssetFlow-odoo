import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './stores/auth';
import { useUI } from './stores/ui';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import { CommandPalette } from './components/CommandPalette';
import { QRScanner } from './components/QRScanner';

import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import OrgSetup from './features/org/OrgSetup';
import Assets from './features/assets/Assets';
import AssetDetail from './features/assets/AssetDetail';
import Allocations from './features/allocations/Allocations';
import Bookings from './features/bookings/Bookings';
import Maintenance from './features/maintenance/Maintenance';
import Audits from './features/audits/Audits';
import AuditDetail from './features/audits/AuditDetail';
import Reports from './features/reports/Reports';
import Notifications from './features/notifications/Notifications';

function Protected({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const loadMe = useAuth((s) => s.loading);
  const { setPalette, setScanner } = useUI();

  useEffect(() => {
    useAuth.getState().loadMe();
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setPalette]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/organization" element={<Protected><OrgSetup /></Protected>} />
        <Route path="/assets" element={<Protected><Assets /></Protected>} />
        <Route path="/assets/:id" element={<Protected><AssetDetail /></Protected>} />
        <Route path="/allocations" element={<Protected><Allocations /></Protected>} />
        <Route path="/bookings" element={<Protected><Bookings /></Protected>} />
        <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
        <Route path="/audits" element={<Protected><Audits /></Protected>} />
        <Route path="/audits/:id" element={<Protected><AuditDetail /></Protected>} />
        <Route path="/reports" element={<Protected><Reports /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CommandPalette />
      <QRScanner />
    </>
  );
}
