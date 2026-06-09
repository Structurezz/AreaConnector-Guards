import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Register from './pages/Register';
import SecurityDashboard from './pages/Dashboard';
import SecurityLog from './pages/Log';
import SecurityAlerts from './pages/Alerts';

function RequireSecurity({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'security') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-sm text-center">
          <p className="text-red-400 font-semibold mb-2">Access Denied</p>
          <p className="text-white/50 text-sm">This portal is for Security Guards only.</p>
        </div>
      </div>
    );
  }
  return <AppLayout>{children}</AppLayout>;
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
      <Route path="/" element={<Navigate to="/verify" replace />} />
      <Route path="*" element={<Navigate to="/verify" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#0B1C3D', color: 'white', border: '1px solid rgba(201,168,76,0.3)' },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0B1C3D' } },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
