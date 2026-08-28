import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenPortal from './pages/CitizenPortal';
import FieldOfficerPortal from './pages/FieldOfficerPortal';
import NgoPortal from './pages/NgoPortal';
import TransportPortal from './pages/TransportPortal';
import DistrictDashboard from './pages/DistrictDashboard';

// Helper component to redirect authenticated users dynamically on the home page '/'
function RoleRedirectDispatcher() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch (user.role) {
    case 'district_admin':
    case 'admin':
      return <Navigate to="/dashboard" replace />;
    case 'field_officer':
      return <Navigate to="/officer" replace />;
    case 'ngo':
      return <Navigate to="/ngo" replace />;
    case 'transport_operator':
      return <Navigate to="/operator" replace />;
    case 'citizen':
    default:
      return <Navigate to="/citizen" replace />;
  }
}

// Protected layout mapping command topbar & footer
function MainLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-6 bg-gradient-to-b from-command-bg-start to-command-bg-end min-h-screen w-full">
        {children}
      </main>
      <footer className="w-full bg-surface-container-highest py-stack-loose border-t border-outline-variant/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-body-sm text-on-surface-variant font-body-sm">
          <span>© 2026 SETU Strategic Disaster Response Command. Confidential Govt Access Only.</span>
          <div className="flex items-center gap-6">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Security Protocol</span>
            <span className="font-mono text-xs opacity-75">V.2.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Private Route Guard
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  return user ? <MainLayout>{children}</MainLayout> : <Navigate to="/login" replace />;
}

// Role-based Route Guard
function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  if (!normalizedAllowed.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

// Route accessible only when NOT logged in (redirects authenticated users to their portal)
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes - redirected to portal if already authenticated */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Role specific protected dashboards: strictly isolated per user role */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['district_admin', 'admin']}>
                <DistrictDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/officer"
            element={
              <RoleRoute allowedRoles={['field_officer']}>
                <FieldOfficerPortal />
              </RoleRoute>
            }
          />
          <Route
            path="/ngo"
            element={
              <RoleRoute allowedRoles={['ngo']}>
                <NgoPortal />
              </RoleRoute>
            }
          />
          <Route
            path="/operator"
            element={
              <RoleRoute allowedRoles={['transport_operator']}>
                <TransportPortal />
              </RoleRoute>
            }
          />
          <Route
            path="/citizen"
            element={
              <RoleRoute allowedRoles={['citizen']}>
                <CitizenPortal />
              </RoleRoute>
            }
          />

          {/* Dynamic landing redirect dispatcher */}
          <Route path="/" element={<RoleRedirectDispatcher />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
