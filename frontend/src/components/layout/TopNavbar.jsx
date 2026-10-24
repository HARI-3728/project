import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  PhoneCall,
  User,
  ChevronDown,
  LogOut,
  CheckCircle2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import './layout.css';

export const TopNavbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const [items, unread] = await Promise.all([
          api.get('/notifications?page=1&limit=10', { requireAuth: true }),
          api.get('/notifications/unread-count', { requireAuth: true })
        ]);
        setNotifications(items);
        setUnreadCount(unread.count);
        setNotificationError('');
      } catch (error) {
        setNotificationError(error.message || 'Unable to load notifications.');
      }
    };

    loadNotifications();
  }, [user]);

  const markNotificationRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await api.patch(`/notifications/${notification._id}/read`, {}, { requireAuth: true });
      setNotifications((previous) => previous.map((item) =>
        item._id === notification._id ? { ...item, isRead: true } : item
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationError(error.message || 'Unable to mark this notification as read.');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all', {}, { requireAuth: true });
      setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setNotificationError('');
    } catch (error) {
      setNotificationError(error.message || 'Unable to mark notifications as read.');
    }
  };

  const getPageTitle = (pathname) => {
    if (pathname === '/') return 'Health Dashboard';
    if (pathname.startsWith('/medicines')) return 'Medicine Inventory & Details';
    if (pathname === '/prescriptions') return 'My Prescriptions';
    if (pathname === '/health-records') return 'Health Records';
    if (pathname === '/reminders') return 'Pill Reminders & Schedule';
    if (pathname === '/vaccinations') return 'Vaccination Tracker';
    if (pathname === '/nearby') return 'Nearby Healthcare Facilities';
    if (pathname === '/ai-assistant') return 'MediCare AI Assistant';
    return 'MediCare+';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/medicines?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{getPageTitle(location.pathname)}</h1>
      </div>

      {/* Global Search Bar */}
      <form className="navbar-search" onSubmit={handleSearchSubmit}>
        <Search className="search-icon" size={18} />
        <input
          type="text"
          placeholder="Search medicines, doctors, records..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="navbar-right">
        {/* MediCare AI Quick Chip */}
        <button
          className="ai-quick-btn"
          onClick={() => navigate('/ai-assistant')}
          title="Ask MediCare AI"
        >
          <Sparkles size={16} />
          <span>Ask AI</span>
        </button>

        {/* Emergency SOS Shortcut */}
        <a href="tel:112" className="emergency-btn" title="Call Emergency Services (112)">
          <PhoneCall size={16} />
          <span className="emergency-label">Emergency 112</span>
        </a>

        {/* Notifications Popover Trigger */}
        <div className="notifications-wrapper">
          <button
            className={`navbar-icon-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge-dot"></span>}
          </button>

          {showNotifications && (
            <div className="dropdown-panel notifications-panel fade-in">
              <div className="panel-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button type="button" className="badge badge-success" onClick={markAllNotificationsRead}>
                    {unreadCount} New · Mark all read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notificationError && (
                  <div className="upload-alert error" role="alert">
                    <AlertCircle size={16} />
                    <span>{notificationError}</span>
                  </div>
                )}
                {notifications.length ? notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                    onClick={() => markNotificationRead(notification)}
                  >
                    <div className="notif-icon bg-emerald">
                      {notification.isRead ? <Bell size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div className="notif-content">
                      <p className="notif-text"><strong>{notification.title}</strong> {notification.message}</p>
                      <span className="notif-time">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                  </button>
                )) : !notificationError && <p className="notif-time">No notifications.</p>}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        {user && (
          <div className="user-menu-wrapper">
            <button
              className="user-menu-trigger"
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifications(false);
              }}
            >
              <img src={user.avatar} alt={user.name} className="nav-user-avatar" />
              <span className="nav-user-name">{user.name}</span>
              <ChevronDown size={16} />
            </button>

            {showUserDropdown && (
              <div className="dropdown-panel user-panel fade-in">
                <div className="user-panel-info">
                  <p className="user-panel-name">{user.name}</p>
                  <p className="user-panel-email">{user.email}</p>
                  <div className="user-panel-tags">
                    <span className="badge badge-success">ID: {user.medicalID || 'Not assigned'}</span>
                    <span className="badge badge-info">{user.bloodGroup || 'Not provided'}</span>
                  </div>
                </div>
                <div className="user-panel-divider"></div>
                <button className="dropdown-item" onClick={() => navigate('/health-records')}>
                  <User size={16} />
                  <span>My Health Profile</span>
                </button>
                <button className="dropdown-item danger" onClick={logout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
