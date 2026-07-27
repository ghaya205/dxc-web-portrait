import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';

import Home                from './pages/home/Home';
import Login               from './pages/auth/Login';
import Register            from './pages/auth/Register';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import AdminDashboard      from './pages/admin/AdminDashboard';
import SlaQueuesPage       from './pages/sla/SlaQueuesPage';
import UserApprovals       from './pages/admin/UserApprovals';
import AdminManagement     from './pages/admin/AdminManagement';
import ProfilePage         from './pages/profile/ProfilePage';
import SettingsPage        from './pages/settings/SettingsPage';
import RequestsPage        from './pages/requests/RequestsPage';
import QualificationsPage  from './pages/qualifications/QualificationsPage';
import OpportunitiesPage   from './pages/opportunities/OpportunitiesPage';
import DocumentsPage       from './pages/documents/DocumentsPage';
import InsurancePage       from './pages/insurance/InsurancePage';
import QualityAssessment   from './pages/quality/QualityAssessment';
import AgentDashboard      from './pages/agent/AgentDashboard';
import TransportPage      from './pages/transport/TransportPage';
import AdminTransportPage from './pages/transport/AdminTransportPage';

const ROLE_HOME = { 1: '/agent/requests', 2: '/supervisor/dashboard', 3: '/admin/dashboard' };

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return children;
  return <Navigate to={ROLE_HOME[user?.role_id] ?? '/agent/requests'} replace />;
}

function RoleRoute({ children, allowedRoleId }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoleId && user?.role_id !== allowedRoleId) {
    return <Navigate to={ROLE_HOME[user?.role_id] ?? '/agent/requests'} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"         element={<Navigate to="/login" replace />} />
      <Route path="/home"     element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      <Route path="/agent/requests"       element={<RoleRoute allowedRoleId={1}><RequestsPage /></RoleRoute>} />
      <Route path="/agent/quality"        element={<RoleRoute allowedRoleId={1}><AgentDashboard /></RoleRoute>} />
      <Route path="/agent/qualifications" element={<RoleRoute allowedRoleId={1}><QualificationsPage /></RoleRoute>} />
      <Route path="/agent/opportunities"  element={<RoleRoute allowedRoleId={1}><OpportunitiesPage /></RoleRoute>} />
      <Route path="/agent/documents"      element={<RoleRoute allowedRoleId={1}><DocumentsPage /></RoleRoute>} />
      <Route path="/agent/insurance"      element={<RoleRoute allowedRoleId={1}><InsurancePage /></RoleRoute>} />
      <Route path="/agent/profile"        element={<RoleRoute allowedRoleId={1}><ProfilePage /></RoleRoute>} />
      <Route path="/agent/settings"       element={<RoleRoute allowedRoleId={1}><SettingsPage /></RoleRoute>} />

      <Route path="/supervisor/dashboard"      element={<RoleRoute allowedRoleId={2}><SupervisorDashboard /></RoleRoute>} />
      <Route path="/supervisor/quality"        element={<RoleRoute allowedRoleId={2}><QualityAssessment /></RoleRoute>} />
      <Route path="/supervisor/requests"       element={<RoleRoute allowedRoleId={2}><RequestsPage /></RoleRoute>} />
      <Route path="/supervisor/qualifications" element={<RoleRoute allowedRoleId={2}><QualificationsPage /></RoleRoute>} />
      <Route path="/supervisor/opportunities"  element={<RoleRoute allowedRoleId={2}><OpportunitiesPage /></RoleRoute>} />
      <Route path="/supervisor/documents"      element={<RoleRoute allowedRoleId={2}><DocumentsPage /></RoleRoute>} />
      <Route path="/supervisor/insurance"      element={<RoleRoute allowedRoleId={2}><InsurancePage /></RoleRoute>} />
      <Route path="/supervisor/transport"      element={<RoleRoute allowedRoleId={2}><TransportPage /></RoleRoute>} />
      <Route path="/supervisor/profile"        element={<RoleRoute allowedRoleId={2}><ProfilePage /></RoleRoute>} />
      <Route path="/supervisor/settings"       element={<RoleRoute allowedRoleId={2}><SettingsPage /></RoleRoute>} />

      <Route path="/admin/dashboard"      element={<RoleRoute allowedRoleId={3}><AdminDashboard /></RoleRoute>} />
      <Route path="/admin/quality"        element={<RoleRoute allowedRoleId={3}><QualityAssessment /></RoleRoute>} />
      <Route path="/admin/sla-queues"     element={<RoleRoute allowedRoleId={3}><SlaQueuesPage /></RoleRoute>} />
      <Route path="/admin/user-approvals" element={<RoleRoute allowedRoleId={3}><UserApprovals /></RoleRoute>} />
      <Route path="/admin/management"     element={<RoleRoute allowedRoleId={3}><AdminManagement /></RoleRoute>} />
      <Route path="/admin/requests"       element={<RoleRoute allowedRoleId={3}><RequestsPage /></RoleRoute>} />
      <Route path="/admin/qualifications" element={<RoleRoute allowedRoleId={3}><QualificationsPage /></RoleRoute>} />
      <Route path="/admin/opportunities"  element={<RoleRoute allowedRoleId={3}><OpportunitiesPage /></RoleRoute>} />
      <Route path="/admin/documents"      element={<RoleRoute allowedRoleId={3}><DocumentsPage /></RoleRoute>} />
      <Route path="/admin/insurance"      element={<RoleRoute allowedRoleId={3}><InsurancePage /></RoleRoute>} />
      <Route path="/admin/transport"      element={<RoleRoute allowedRoleId={3}><AdminTransportPage /></RoleRoute>} />
      <Route path="/admin/profile"        element={<RoleRoute allowedRoleId={3}><ProfilePage /></RoleRoute>} />
      <Route path="/admin/settings"       element={<RoleRoute allowedRoleId={3}><SettingsPage /></RoleRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
