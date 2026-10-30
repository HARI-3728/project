import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  Building2,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import './pages.css';
import './doctor.css';
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

  const doctorProfile = useMemo(() => ({
    specialization: profile?.specialization || dashboardData?.profile?.specialization || 'General Physician',
    experience: profile?.experience ?? dashboardData?.profile?.experience ?? 0,
    consultationFee: profile?.consultationFee ?? dashboardData?.profile?.consultationFee ?? 500,
    registrationNumber: profile?.registrationNumber ?? dashboardData?.profile?.registrationNumber ?? 'Pending Filing',
    hospital: profile?.hospital ?? dashboardData?.profile?.hospital ?? null,
  }), [profile, dashboardData?.profile]);

  const nextAppointment = useMemo(() => {
    const upcoming = todayAppointments.filter((apt) => apt.status !== 'completed');
    return upcoming[0] || null;
  }, [todayAppointments]);

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
      <div className="doctor-hero">
        <div className="doctor-hero-inner">
          <div className="doctor-hero-tag">
            <UserCheck size={14} />
            <span>
              {doctorProfile.specialization} • {isVerified ? 'Verified Practitioner' : 'Credential Verification In Progress'}
            </span>
          </div>

          <h2 className="doctor-hero-title">Welcome, Dr. {user?.name || 'Practitioner'}</h2>
          <p className="doctor-hero-desc">
            You have <strong>{todayAppointments.length} consultation{todayAppointments.length === 1 ? '' : 's'} scheduled today</strong> and <strong>{stats.pendingCount || 0} pending patient request{stats.pendingCount === 1 ? '' : 's'}</strong>.
          </p>

          <div className="doctor-hero-actions">              <Button
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
            >
              Browse Medicines Catalog
            </Button>
          </div>

          <div className="doctor-hero-divider" aria-hidden="true" />
        </div>
      </div>

      {/* Verification Notice */}
      {!isVerified && (
        <div className="auth-security-notice" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={20} className="security-notice-icon" />
          <div>
            <strong>Credential Verification Pending:</strong> Your doctor account is active in the provider portal. Institutional verification by the hospital clinical director is underway to authorize public appointment scheduling.
          </div>
        </div>
      )}

      {/* 4 Core Stat Cards */}
      <div className="doctor-stat-grid">
        <StatCard
          title="Today's Schedule"
          value={stats.todayCount ?? todayAppointments.length}
          unit="appointments"
          badgeText="Today queue"
          badgeType="info"
          trend="stable"
          trendValue="Scheduled"
          icon={Calendar}
          iconBgColor="var(--color-primary-light)"
          iconColor="var(--color-primary)"
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
          badgeText={stats.rating ? `${stats.rating.toFixed(1)} ★ (${stats.totalReviews})` : 'Building network'}
          badgeType="info"
          trend="up"
          trendValue="Clinical Network"
          icon={Users}
          iconBgColor="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
        />
      </div>

      {/* Quick action strip */}
      <div className="doctor-action-strip">
        <Link to="/medicines" className="doctor-action-chip secondary">
          <Building2 size={16} />
          Shop Medicines Catalog
        </Link>
        <Link to="/prescriptions" className="doctor-action-chip secondary">
          <FileText size={16} />
          Patient Records
        </Link>
      </div>

      {/* Doctor profile + stats row */}
      <Card className="page-section" style={{ marginBottom: '0.25rem' }}>
        <div className="doctor-two-col">
          {/* Profile */}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="doctor-profile-card">
              <img
                className="doctor-profile-avatar"
                src={user?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
              />
              <div className="doctor-profile-meta">
                <div className="doctor-profile-name">Dr. {user?.name || 'Practitioner'}</div>
                <div className="doctor-profile-role">{doctorProfile.specialization}</div>
                <div className="doctor-profile-badges">
                  <span className={`badge ${isVerified ? 'badge-success' : 'badge-warning'}`}>
                    {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    {isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                  {user?.email && (
                    <span className="badge badge-neutral">
                      <Mail size={12} />
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="doctor-profile-details">
              <div className="doctor-profile-row">
                <span>Experience</span>
                <strong>{doctorProfile.experience || 0} Years</strong>
              </div>
              <div className="doctor-profile-row">
                <span>Consultation Fee (OPD)</span>
                <strong>₹{doctorProfile.consultationFee || 0}</strong>
              </div>
              <div className="doctor-profile-row">
                <span>Hospital / Clinic</span>
                <strong>{doctorProfile.hospital?.hospitalName || 'Not assigned yet'}</strong>
              </div>
              <div className="doctor-profile-row">
                <span>Registration Number</span>
                <code>{doctorProfile.registrationNumber || 'Pending Filing'}</code>
              </div>
              {user?.phone && (
                <div className="doctor-profile-row">
                  <span>Contact</span>
                  <span><Phone size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />{user.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Today's appointments */}
          <Card style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="doctor-card-head">
              <div>
                <div className="doctor-card-title">Today's Patient Schedule</div>
                <div className="doctor-card-sub">
                  {todayAppointments.length} consultation{todayAppointments.length === 1 ? '' : 's'} on the calendar
                </div>
              </div>
              <span className="badge badge-info">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="doctor-empty">
                <Calendar size={36} />
                <div className="doctor-empty-title">No consultations booked for today</div>
                <div className="doctor-empty-sub">Future patient appointments will appear here automatically.</div>
              </div>
            ) : (
              <div className="doctor-appt-list">
                {todayAppointments.map((apt) => (
                  <div className="doctor-appt-item" key={apt._id}>
                    <div className="doctor-appt-left">
                      <span className="doctor-appt-time">
                        <Clock size={13} />
                        {apt.appointmentTime || '10:00'}
                      </span>
                      <div className="doctor-appt-patient">
                        <div className="doctor-appt-name">{apt.patient?.name || 'Patient'}</div>
                        <div className="doctor-appt-meta">
                          {apt.condition || 'General Consultation'}
                          {apt.patient?.phone ? ` • ${apt.patient.phone}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="doctor-appt-right">
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
      </Card>

      {/* Recent Rx + Upcoming consultation */}
      <div className="doctor-two-col" style={{ marginBottom: '0.75rem' }}>
        {/* Recent prescriptions */}
        <Card style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="doctor-card-head">
            <div>
              <div className="doctor-card-title">Recent Clinical Prescriptions</div>
              <div className="doctor-card-sub">Verified medical records issued under your signature</div>
            </div>
            <Button size="sm" variant="outline" icon={Plus} onClick={() => setIsRxModalOpen(true)}>
              New Prescription
            </Button>
          </div>

          {recentPrescriptions.length === 0 ? (
            <div className="doctor-empty">
              <FileText size={30} />
              <div className="doctor-empty-title">No prescriptions issued yet</div>
              <div className="doctor-empty-sub">Prescriptions created for patients will be listed here.</div>
            </div>
          ) : (
            <div className="doctor-rx-list">
              {recentPrescriptions.map((rx) => (
                <div className="doctor-rx-item" key={rx._id}>
                  <div>
                    <div className="doctor-rx-patient">{rx.patient?.name || rx.patientName || 'Registered Patient'}</div>
                    <div className="doctor-rx-detail">
                      Diagnosis: <strong>{rx.diagnosis || 'Standard therapy'}</strong> • {(rx.medicines || []).map(m => m.medicineName).join(', ') || 'Listed medication'}
                    </div>
                  </div>
                  <div className="doctor-rx-date">
                    {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming consultation */}
        <Card style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="doctor-card-head">
            <div>
              <div className="doctor-card-title">Next Upcoming Consultation</div>
              <div className="doctor-card-sub">Your next live appointment</div>
            </div>
          </div>

          {nextAppointment ? (
            <>
              <div className="doctor-appt-item" style={{ background: 'var(--color-primary-light)', borderColor: 'rgba(37, 99, 235, 0.25)' }}>
                <div className="doctor-appt-left">
                  <span className="doctor-appt-time" style={{ background: 'white', color: 'var(--color-primary)' }}>
                    <Calendar size={13} />
                    {nextAppointment.appointmentTime || '10:00'}
                  </span>
                  <div className="doctor-appt-patient">
                    <div className="doctor-appt-name">{nextAppointment.patient?.name || 'Patient'}</div>
                    <div className="doctor-appt-meta">
                      {nextAppointment.condition || 'General Consultation'}
                      {nextAppointment.patient?.phone ? ` • ${nextAppointment.patient.phone}` : ''}
                    </div>
                  </div>
                </div>
                <span className="badge badge-info">
                  {nextAppointment.status}
                </span>
              </div>

              <div className="doctor-upcoming-strip">
                <div>
                  <div className="doctor-upcoming-label">Start Consultation</div>
                  <div className="doctor-upcoming-text">
                    {nextAppointment.patient?.name || 'Patient'} • {nextAppointment.condition || 'Consultation'}
                  </div>
                </div>
                <Button className="doctor-upcoming-action" variant="primary" size="md" icon={MessageSquare}>
                  Start Session
                </Button>
              </div>
            </>
          ) : (
            <div className="doctor-empty">
              <Clock size={30} />
              <div className="doctor-empty-title">No upcoming consultation</div>
              <div className="doctor-empty-sub">Your next booked appointment will appear here.</div>
            </div>
          )}
        </Card>
      </div>

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
      </Modal>   </div>
  );
};


