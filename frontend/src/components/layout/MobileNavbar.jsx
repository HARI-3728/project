import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Stethoscope,
  LayoutDashboard,
  Pill,
  FileText,
  Activity,
  Bell,
  Syringe,
  MapPin,
  Bot,
  LogOut,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

export const MobileNavbar = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Medicines', path: '/medicines', icon: Pill },
    { label: 'Prescriptions', path: '/prescriptions', icon: FileText },
    { label: 'Health Records', path: '/health-records', icon: Activity },
    { label: 'Reminders', path: '/reminders', icon: Bell },
    { label: 'Vaccinations', path: '/vaccinations', icon: Syringe },
    { label: 'Nearby Care', path: '/nearby', icon: MapPin },
    { label: 'MediCare AI', path: '/ai-assistant', icon: Bot, isNew: true }
  ];

  const bottomNavItems = [
    { label: 'Home', path: '/', icon: LayoutDashboard },
    { label: 'Meds', path: '/medicines', icon: Pill },
    { label: 'AI', path: '/ai-assistant', icon: Bot },
    { label: 'Reminders', path: '/reminders', icon: Bell },
    { label: 'Records', path: '/health-records', icon: Activity }
  ];

  const handleLinkClick = () => {
    setIsDrawerOpen(false);
  };

  const handleLogout = () => {
    setIsDrawerOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <button
            className="mobile-drawer-toggle"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-brand">
            <Stethoscope size={22} className="mobile-brand-icon" />
            <span className="mobile-brand-name">MediCare+</span>
          </div>
        </div>

        <div className="mobile-header-right">
          <a href="tel:911" className="mobile-emergency-btn" title="Call Emergency 911">
            <PhoneCall size={16} />
          </a>
        </div>
      </header>

      {/* Slide-out Mobile Drawer Backdrop & Menu */}
      {isDrawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="mobile-drawer fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-brand">
                <Stethoscope size={24} className="mobile-brand-icon" />
                <span className="mobile-brand-name">MediCare+</span>
              </div>
              <button
                className="mobile-drawer-close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {user && (
              <div className="mobile-user-card">
                <img src={user.avatar} alt={user.name} />
                <div>
                  <p className="mobile-user-name">{user.name}</p>
                  <p className="mobile-user-sub">Blood Type: {user.bloodGroup} • Age {user.age}</p>
                </div>
              </div>
            )}

            <nav className="mobile-drawer-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    {item.isNew && <span className="nav-chip-new">AI</span>}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mobile-drawer-footer">
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="mobile-bottom-bar">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `bottom-bar-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
