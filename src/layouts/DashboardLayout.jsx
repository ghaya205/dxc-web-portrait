import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { fetchFullProfile } from '../services/api';
import '../styles/dashboard.css';

export default function DashboardLayout({ children, pageTitle }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { token, setAvatar } = useAuth();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadAvatar() {
      try {
        const data = await fetchFullProfile(token);
        if (!cancelled && data.profile) {
          setAvatar(data.profile.profile_picture || null);
        }
      } catch {
        
      }
    }
    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [token, setAvatar]);

  function toggleSidebar() {
    if (window.innerWidth <= 1024) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="dash-root">
      <div
        className={`dash-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={closeMobile}
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <div className={`dash-body${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar onToggleSidebar={toggleSidebar} pageTitle={pageTitle} />
        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
