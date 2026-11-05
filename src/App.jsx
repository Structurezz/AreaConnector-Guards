import SeoTracker from './components/SeoTracker';
import { CallProvider } from './context/CallContext';
import CallOverlay from './components/calls/CallOverlay';
import UpdateBanner from './components/ui/UpdateBanner';
import Calls from './pages/Calls';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SiteProvider, useSite } from './context/SiteContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Register from './pages/Register';
import SecurityDashboard from './pages/Dashboard';
import SecurityLog from './pages/Log';
import SecurityAlerts from './pages/Alerts';
import SecuritySettings from './pages/Settings';
import Deliveries from './pages/Deliveries';
import StaffCheck from './pages/StaffCheck';
import Places from './pages/Places';
import RollCall from './pages/RollCall';

function RequireSecurity({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'security') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-sm text-center">
          <p className="text-red-600 font-semibold mb-2">Access Denied</p>
          <p className="text-slate-500 text-sm">This portal is for Security Guards only.</p>
        </div>
      </div>
    );
  }
  return <AppLayout>{children}</AppLayout>;
}

// Module pages: only reachable while the site has the module switched on
function RequireModule({ module, children }) {
  const { modules } = useSite();
  if (!modules?.[module]) return <Navigate to="/verify" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user?.role === 'security' ? <Navigate to="/verify" replace /> : <Login />} />
      <Route path="/register" element={user?.role === 'security' ? <Navigate to="/verify" replace /> : <Register />} />
      <Route path="/verify" element={<RequireSecurity><SecurityDashboard /></RequireSecurity>} />
      <Route path="/log" element={<RequireSecurity><SecurityLog /></RequireSecurity>} />
      <Route path="/alerts" element={<RequireSecurity><SecurityAlerts /></RequireSecurity>} />
      <Route path="/calls" element={<RequireSecurity><Calls /></RequireSecurity>} />
      <Route path="/deliveries" element={<RequireSecurity><RequireModule module="gatelog"><Deliveries /></RequireModule></RequireSecurity>} />
      <Route path="/staff" element={<RequireSecurity><RequireModule module="shifts"><StaffCheck /></RequireModule></RequireSecurity>} />
      <Route path="/rollcall" element={<RequireSecurity><RequireModule module="rollcall"><RollCall /></RequireModule></RequireSecurity>} />
      <Route path="/places" element={<RequireSecurity><Places /></RequireSecurity>} />
      <Route path="/settings" element={<RequireSecurity><SecuritySettings /></RequireSecurity>} />
      <Route path="/" element={<Navigate to="/verify" replace />} />
      <Route path="*" element={<Navigate to="/verify" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SeoTracker />
      <AuthProvider>
        <SocketProvider>
          <SiteProvider>
          <CallProvider>
          <CallOverlay />
          <UpdateBanner />
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid rgba(15,23,42,0.10)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#ECFDF5' } },
          }} />
          </CallProvider>
          </SiteProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
