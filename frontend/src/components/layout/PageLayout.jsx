import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { MobileNavbar } from './MobileNavbar';
import './layout.css';

export const PageLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Pages that don't need sidebar/navbar layout (e.g. Login / Register)
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main App Container */}
      <div className={`main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopNavbar />
        <MobileNavbar />

        <main className="content-area fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
