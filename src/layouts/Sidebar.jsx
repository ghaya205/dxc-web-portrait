import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Settings, LogOut, Shield, Users, FileText,
  Award, Briefcase, Folder, HeartPulse, User as UserIcon, ListChecks, ClipboardCheck, Bus,
} from 'lucide-react';
import dxcLogo from '../assets/dxclogo.png';

const roleMenus = {
  1: [
    {
      section: 'Workspace',
      items: [
        { icon: FileText,    label: 'Requests',       path: '/agent/requests' },
        { icon: ClipboardCheck, label: 'My Assessments', path: '/agent/quality' },
        { icon: Award,       label: 'Qualifications',  path: '/agent/qualifications' },
        { icon: Briefcase,   label: 'Opportunities',   path: '/agent/opportunities' },
        { icon: Folder,      label: 'My Documents',    path: '/agent/documents' },
        { icon: HeartPulse,  label: 'Insurance',       path: '/agent/insurance' },
      ],
    },
    {
      section: 'Account',
      items: [
        { icon: UserIcon, label: 'Profile',  path: '/agent/profile' },
        { icon: Settings, label: 'Settings', path: '/agent/settings' },
      ],
    },
  ],
  2: [
    {
      section: 'Workspace',
      items: [
        { icon: LayoutDashboard, label: 'Team SLA Dashboard', path: '/supervisor/dashboard' },
        { icon: ClipboardCheck, label: 'Quality Assessment', path: '/supervisor/quality' },
        { icon: FileText,    label: 'Requests',       path: '/supervisor/requests' },
        { icon: Award,       label: 'Qualifications',  path: '/supervisor/qualifications' },
        { icon: Briefcase,   label: 'Opportunities',   path: '/supervisor/opportunities' },
        { icon: Folder,      label: 'My Documents',    path: '/supervisor/documents' },
        { icon: HeartPulse,  label: 'Insurance',       path: '/supervisor/insurance' },
        { icon: Bus,         label: 'Transport',       path: '/supervisor/transport' },
      ],
    },
    {
      section: 'Account',
      items: [
        { icon: UserIcon, label: 'Profile',  path: '/supervisor/profile' },
        { icon: Settings, label: 'Settings', path: '/supervisor/settings' },
      ],
    },
  ],
  3: [
    {
      section: 'Workspace',
      items: [
        { icon: LayoutDashboard, label: 'SLA Dashboard', path: '/admin/dashboard' },
        { icon: ClipboardCheck, label: 'Quality Assessment', path: '/admin/quality' },
        { icon: FileText,    label: 'Requests',       path: '/admin/requests' },
        { icon: Award,       label: 'Qualifications',  path: '/admin/qualifications' },
        { icon: Briefcase,   label: 'Opportunities',   path: '/admin/opportunities' },
        { icon: Folder,      label: 'My Documents',    path: '/admin/documents' },
        { icon: HeartPulse,  label: 'Insurance',       path: '/admin/insurance' },
      ],
    },
    {
      section: 'Administration',
      items: [
        { icon: Users,  label: 'User Approvals', path: '/admin/user-approvals' },
        { icon: Shield, label: 'Management',     path: '/admin/management' },
        { icon: ListChecks, label: 'SLA Queues', path: '/admin/sla-queues' },
        { icon: Bus, label: 'Transport Approvals', path: '/admin/transport' },
        { icon: UserIcon, label: 'Profile',      path: '/admin/profile' },
        { icon: Settings, label: 'Settings',     path: '/admin/settings' },
      ],
    },
  ],
};

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleId   = user?.role_id ?? 1;
  const sections = roleMenus[roleId] ?? roleMenus[1];

  function handleNav(path) {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className={`dash-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="dash-sidebar-logo">
        <img src={dxcLogo} alt="DXC" />
        <span className="dash-sidebar-logo-text">DXC Technology</span>
      </div>
      <div className="dash-sidebar-accent" />

      <nav className="dash-sidebar-nav">
        {sections.map((sec) => (
          <div key={sec.section} className="dash-sidebar-section">
            <div className="dash-sidebar-section-label">{sec.section}</div>
            {sec.items.map(({ icon: Icon, label, path }) => (
              <button
                key={path + label}
                className={`dash-sidebar-item${location.pathname === path ? ' active' : ''}`}
                onClick={() => handleNav(path)}
              >
                <span className="dash-sidebar-item-icon"><Icon size={17} /></span>
                <span className="dash-sidebar-item-label">{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="dash-sidebar-footer">
        <button className="dash-sidebar-item" onClick={handleLogout}>
          <span className="dash-sidebar-item-icon"><LogOut size={17} /></span>
          <span className="dash-sidebar-item-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
