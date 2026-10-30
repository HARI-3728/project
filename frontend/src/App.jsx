import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageLayout } from './components/layout/PageLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { Medicines } from './pages/Medicines';
import { MedicineDetails } from './pages/MedicineDetails';
import { Prescriptions } from './pages/Prescriptions';
import { HealthRecords } from './pages/HealthRecords';
import { Reminders } from './pages/Reminders';
import { Vaccinations } from './pages/Vaccinations';
import { NearbyHealthcare } from './pages/NearbyHealthcare';
import { MedicareAI } from './pages/MedicareAI';

const getDashboardPath = (role) => {
  if (role === 'doctor') return '/doctor';
  if (role === 'hospital') return '/hospital';
  return '/';
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <p style={{ fontWeight: 600, color: 'var(--primary-700)' }}>Loading MediCare+...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <p style={{ fontWeight: 600, color: 'var(--primary-700)' }}>Loading MediCare+...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
};

const RoleFallbackRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={getDashboardPath(user?.role)} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          <Route path="/" element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
            {/* Patient Dashboard */}
            <Route index element={<ProtectedRoute allowedRoles={['patient']}><Dashboard /></ProtectedRoute>} />

            {/* Doctor Dashboard */}
            <Route path="doctor" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />

            {/* Hospital Dashboard */}
            <Route path="hospital" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />

            {/* Shared Catalog & AI Routes */}
            <Route path="medicines" element={<Medicines />} />
            <Route path="medicines/:id" element={<MedicineDetails />} />
            <Route path="ai-assistant" element={<MedicareAI />} />

            {/* Patient-Only Services */}
            <Route path="prescriptions" element={<ProtectedRoute allowedRoles={['patient']}><Prescriptions /></ProtectedRoute>} />
            <Route path="health-records" element={<ProtectedRoute allowedRoles={['patient']}><HealthRecords /></ProtectedRoute>} />
            <Route path="reminders" element={<ProtectedRoute allowedRoles={['patient']}><Reminders /></ProtectedRoute>} />
            <Route path="vaccinations" element={<ProtectedRoute allowedRoles={['patient']}><Vaccinations /></ProtectedRoute>} />
            <Route path="nearby" element={<ProtectedRoute allowedRoles={['patient']}><NearbyHealthcare /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<RoleFallbackRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
