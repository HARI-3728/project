import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Star,
  FileText,
  Plus,
  Building2,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import './pages.css';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // New Prescription Modal
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [rxForm, setRxForm] = useState({
    patientId: '',
    diagnosis: '',
    medicineName: '',
    dosage: '1 Tablet',
    frequency: 'Twice daily',
    duration: '5 days',
    instructions: 'Take after meals',
    notes: '',
  });
  const [isSubmittingRx, setIsSubmittingRx] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [dashRes, profileRes] = await Promise.all([
        api.get('/doctors/me/dashboard', { requireAuth: true }),
        api.get('/doctors/me/profile', { requireAuth: true })
      ]);

      setDashboardData(dashRes);
      setProfile(profileRes);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load doctor dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'completed' }, { requireAuth: true });
      setSuccessMessage('Appointment marked as completed.');
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          todayAppointments: prev.todayAppointments.map((apt) =>
            apt._id === appointmentId ? { ...apt, status: 'completed' } : apt
          ),
          stats: {
            ...prev.stats,
            totalCompleted: (prev.stats?.totalCompleted || 0) + 1,
            pendingCount: Math.max(0, (prev.stats?.pendingCount || 1) - 1),
          },
        };
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update appointment status.');
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!rxForm.patientId.trim() || !rxForm.medicineName.trim()) {
      setErrorMessage('Patient ID and Medicine Name are required.');
      return;
    }

    setIsSubmittingRx(true);
    try {
      const payload = {
        patient: rxForm.patientId.trim(),
        diagnosis: rxForm.diagnosis.trim(),
        notes: rxForm.notes.trim(),
        medicines: [
          {
            medicineName: rxForm.medicineName.trim(),
            dosage: rxForm.dosage,
            frequency: rxForm.frequency,
            duration: rxForm.duration,
            instructions: rxForm.instructions,
          },
        ],
      };

      const newRx = await api.post('/prescriptions', payload, { requireAuth: true });
      setSuccessMessage('Prescription issued successfully!');
      setIsRxModalOpen(false);
      setRxForm({
        patientId: '',
        diagnosis: '',
        medicineName: '',
        dosage: '1 Tablet',
        frequency: 'Twice daily',
        duration: '5 days',
        instructions: 'Take after meals',
        notes: '',
      });

      if (newRx && dashboardData) {
        setDashboardData((prev) => ({
          ...prev,
          recentPrescriptions: [newRx, ...(prev.recentPrescriptions || [])].slice(0, 5),
        }));
      }
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to issue prescription.');
    } finally {
      setIsSubmittingRx(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page fade-in">
        <LoadingState count={4} type="card" />
      </div>
    );
  }

  if (errorMessage && !dashboardData) {
    return (
      <div className="dashboard-page fade-in">
        <ErrorState
          title="Doctor Dashboard Unavailable"
          message={errorMessage}
          onRetry={loadData}
        />
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const todayAppointments = dashboardData?.todayAppointments || [];
  const recentPrescriptions = dashboardData?.recentPrescriptions || [];
  const isVerified = profile?.isVerified ?? false;

  return (
    <div className="dashboard-page fade-in">
      {/* Messages */}
      {successMessage && (
        <div className="upload-alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="dashboard-hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <UserCheck size={14} />
            <span>
              {profile?.specialization || 'Physician'} • {isVerified ? 'Verified Practitioner' : 'Verification In Progress'}
            </span>
          </div>

          <h2 className="hero-title">Welcome, Dr. {user?.name || 'Practitioner'}!</h2>
          <p className="hero-desc">
            You have <strong>{todayAppointments.length} consultation{todayAppointments.length === 1 ? '' : 's'} scheduled today</strong> and <strong>{stats.pendingCount || 0} pending patient request{stats.pendingCount === 1 ? '' : 's'}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsRxModalOpen(true)}
            >
              Write Prescription
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={Building2}
              onClick={() => navigate('/medicines')}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Browse Medicines Catalog
            </Button>
          </div>
        </div>
      </div>

      {/* Verification Notice */}
      {!isVerified && (
        <div className="auth-security-notice" style={{ marginBottom: '1.75rem' }}>
          <ShieldAlert size={20} className="security-notice-icon" />
          <div>
            <strong>Credential Verification Pending:</strong> Your doctor account is active in the provider portal. Institutional verification by the hospital clinical director is underway to authorize public appointment scheduling.
          </div>
        </div>
      )}

      {/* 4 Core Stat Cards */}
      <div className="dashboard-grid">
        <StatCard
          title="Today's Schedule"
          value={stats.todayCount ?? todayAppointments.length}
          unit="appointments"
          badgeText="Today"
          badgeType="info"
          trend="stable"
          trendValue="Scheduled"
          icon={Calendar}
          iconBgColor="var(--primary-100)"
          iconColor="var(--primary-700)"
        />

        <StatCard
          title="Pending Approvals"
          value={stats.pendingCount ?? 0}
          unit="patients"
          badgeText="Awaiting action"
          badgeType="warning"
          trend="up"
          trendValue="Requests"
          icon={Clock}
          iconBgColor="var(--accent-amber-light)"
          iconColor="var(--accent-amber)"
        />

        <StatCard
          title="Completed Consults"
          value={stats.totalCompleted ?? 0}
          unit="consultations"
          badgeText="Historical"
          badgeType="success"
          trend="stable"
          trendValue="Completed"
          icon={CheckCircle2}
          iconBgColor="var(--primary-100)"
          iconColor="var(--primary-700)"
        />

        <StatCard
          title="Unique Patients"
          value={stats.uniquePatients ?? 0}
          unit="patients treated"
          badgeText={stats.rating ? `★ ${stats.rating.toFixed(1)} (${stats.totalReviews})` : 'New Doctor'}
          badgeType="info"
          trend="up"
          trendValue="Clinical Network"
          icon={Users}
          iconBgColor="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
        />
      </div>

      {/* Two Column Layout: Today's Schedule & Practice Details */}
      <div className="details-container" style={{ marginBottom: '2rem' }}>
        {/* Left Column: Practice Profile */}
        <Card className="details-image-card" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', width: '100%' }}>
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name}
              style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Dr. {user?.name}</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                {profile?.specialization || 'Medical Specialist'}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span className={`badge ${isVerified ? 'badge-success' : 'badge-warning'}`}>
                  {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                  {isVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Experience:</span>
              <strong>{profile?.experience || 0} Years</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Consultation Fee:</span>
              <strong>₹{profile?.consultationFee || 500}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hospital:</span>
              <strong>{profile?.hospital?.hospitalName || 'MediCare+ Apex Hospital'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>License Number:</span>
              <code>{profile?.registrationNumber || 'Pending Filing'}</code>
            </div>
            {user?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
            )}
            {user?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Phone size={14} />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Today's Appointments */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Today's Patient Schedule</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {todayAppointments.length} consultation{todayAppointments.length === 1 ? '' : 's'} on the calendar
              </p>
            </div>
            <span className="badge badge-info">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>

          {todayAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>No consultations booked for today</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Future patient appointments will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {todayAppointments.map((apt) => (
                <div
                  key={apt._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--neutral-50)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="reminder-time-box" style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}>
                      <Clock size={14} />
                      <span>{apt.appointmentTime || '10:00'}</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                        {apt.patient?.name || 'Patient'}
                      </h4>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {apt.condition || 'General Consultation'} • {apt.patient?.phone || 'No phone recorded'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className={`badge ${apt.status === 'completed' ? 'badge-success' : apt.status === 'confirmed' ? 'badge-info' : 'badge-warning'}`}>
                      {apt.status}
                    </span>
                    {apt.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCompleteAppointment(apt._id)}
                      >
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Prescriptions Written */}
      <Card style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recent Clinical Prescriptions</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Verified medical records issued under your signature
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            onClick={() => setIsRxModalOpen(true)}
          >
            New Prescription
          </Button>
        </div>

        {recentPrescriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No prescriptions issued yet</p>
            <p style={{ fontSize: '0.8rem' }}>Prescriptions created for patients will be listed here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPrescriptions.map((rx) => (
              <div
                key={rx._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'white',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.925rem', fontWeight: 700 }}>
                    Patient: {rx.patient?.name || rx.patientName || 'Registered Patient'}
                  </h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Diagnosis: <strong>{rx.diagnosis || 'Standard therapy'}</strong> • Medicines: {(rx.medicines || []).map(m => m.medicineName).join(', ') || 'Listed medication'}
                  </p>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : 'Recent'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Write Prescription Modal */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        title="Issue Clinical Prescription"
        subtitle="Write an authenticated medical prescription for a patient record"
      >
        <form onSubmit={handleCreatePrescription} className="auth-form">
          <div className="form-group">
            <label htmlFor="rx-patient-id">Patient User ID or Email</label>
            <input
              id="rx-patient-id"
              type="text"
              className="form-input"
              placeholder="e.g. Patient Mongo ID or email"
              value={rxForm.patientId}
              onChange={(e) => setRxForm({ ...rxForm, patientId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rx-diagnosis">Clinical Diagnosis</label>
            <input
              id="rx-diagnosis"
              type="text"
              className="form-input"
              placeholder="e.g. Acute Bronchitis, Type 2 Diabetes"
              value={rxForm.diagnosis}
              onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="rx-medicine">Medicine Name</label>
              <input
                id="rx-medicine"
                type="text"
                className="form-input"
                placeholder="e.g. Amoxicillin 500mg"
                value={rxForm.medicineName}
                onChange={(e) => setRxForm({ ...rxForm, medicineName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="rx-dosage">Dosage</label>
              <input
                id="rx-dosage"
                type="text"
                className="form-input"
                placeholder="e.g. 1 Tablet"
                value={rxForm.dosage}
                onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="rx-frequency">Frequency</label>
              <input
                id="rx-frequency"
                type="text"
                className="form-input"
                placeholder="e.g. Twice daily"
                value={rxForm.frequency}
                onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="rx-duration">Duration</label>
              <input
                id="rx-duration"
                type="text"
                className="form-input"
                placeholder="e.g. 5 days"
                value={rxForm.duration}
                onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rx-instructions">Patient Instructions</label>
            <input
              id="rx-instructions"
              type="text"
              className="form-input"
              placeholder="e.g. Take after meals with a glass of water"
              value={rxForm.instructions}
              onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="rx-notes">Doctor Clinical Notes</label>
            <textarea
              id="rx-notes"
              className="form-input"
              rows={3}
              placeholder="Clinical observation and follow-up notes"
              value={rxForm.notes}
              onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmittingRx}
            disabled={isSubmittingRx}
          >
            Issue and Save Prescription
          </Button>
        </form>
      </Modal>
    </div>
  );
};
