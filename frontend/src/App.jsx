import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageLayout } from './components/layout/PageLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Medicines } from './pages/Medicines';
import { MedicineDetails } from './pages/MedicineDetails';
import { Prescriptions } from './pages/Prescriptions';
import { HealthRecords } from './pages/HealthRecords';
import { Reminders } from './pages/Reminders';
import { Vaccinations } from './pages/Vaccinations';
import { NearbyHealthcare } from './pages/NearbyHealthcare';
import { MedicareAI } from './pages/MedicareAI';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          <Route path="/" element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="medicines" element={<Medicines />} />
            <Route path="medicines/:id" element={<MedicineDetails />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            <Route path="health-records" element={<HealthRecords />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="vaccinations" element={<Vaccinations />} />
            <Route path="nearby" element={<NearbyHealthcare />} />
            <Route path="ai-assistant" element={<MedicareAI />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
