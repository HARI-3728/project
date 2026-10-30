import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  History,
  Building2,
  Pill,
  Activity,
  Bell,
  Syringe,
  MapPin,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

export const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getNavItems = () => {
    // MediCare AI is PATIENT ONLY - not available to doctors or hospitals
    if (user?.role === 'doctor') {
      return [
        { label: 'Doctor Dashboard', path: '/doctor', icon: LayoutDashboard, end: true },
        { label: 'Appointments & OPD', path: '/doctor/appointments', icon: CalendarCheck },
        { label: 'Prescriptions', path: '/doctor/prescriptions', icon: FileText },
        { label: 'Patient Records', path: '/doctor/patients', icon: History },
        { label: 'Hospitals & Network', path: '/doctor/network', icon: Building2 }
      ];
    }
    if (user?.role === 'hospital') {
      return [
        { label: 'Hospital Ops', path: '/hospital', icon: LayoutDashboard },
        { label: 'Pharmacy & Stock', path: '/medicines', icon: Pill },
        { label: 'Healthcare Network', path: '/nearby', icon: MapPin }
      ];
    }
    // Patient get full access including MediCare AI
    return [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Medicines', path: '/medicines', icon: Pill },
      { label: 'Prescriptions', path: '/prescriptions', icon: FileText },
      { label: 'Health Records', path: '/health-records', icon: Activity },
      { label: 'Reminders', path: '/reminders', icon: Bell },
      { label: 'Vaccinations', path: '/vaccinations', icon: Syringe },
      { label: 'Nearby Healthcare', path: '/nearby', icon: MapPin },
      { label: 'MediCare AI', path: '/ai-assistant', icon: Bot, isNew: true }
    ];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserSubtitle = () => {
    if (!user) return '';
    if (user.role === 'doctor') {
      return user.specialization || 'Clinical Specialist';
    }
    if (user.role === 'hospital') {
      return user.type || 'Facility Admin';
    }
    return `Blood: ${user.bloodGroup || 'Not set'}`;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${user?.role === 'doctor' ? 'doctor-sidebar' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Stethoscope size={24} />
        </div>
        {!isCollapsed && (
          <div className="brand-info">
            <span className="brand-name">MediCare<span className="brand-plus">+</span></span>
            <span className="brand-tagline">
              {user?.role === 'doctor' ? 'Clinical Suite' : user?.role === 'hospital' ? 'Hospital Suite' : 'Healthcare Portal'}
            </span>
          </div>
        )}
        <button className="collapse-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-section-title">
          {!isCollapsed ? (user?.role === 'doctor' ? 'DOCTOR MENU' : 'MAIN MENU') : '•'}
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="nav-icon" size={20} />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && item.isNew && <span className="nav-chip-new">AI</span>}
              {!isCollapsed && item.badge && (
                <span className={`nav-badge ${item.badgeVariant ? `badge-${item.badgeVariant}` : ''}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Quick Bar & Logout */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-profile-widget">
            <img src={user.avatar} alt={user.name} className="user-avatar" />
            {!isCollapsed && (
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-blood-group">{getUserSubtitle()}</span>
              </div>
            )}
          </div>
        )}

        <button className="logout-btn" onClick={handleLogout} title="Log Out">
          <LogOut size={18} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
