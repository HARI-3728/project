import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Pill,
  Bell,
  Sparkles,
  Search,
  ArrowRight,
  Plus,
  ShieldAlert,
  Clock,
  ChevronRight,
  FileText,
  FileCheck,
  Syringe,
  Upload,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EDUCATIONAL_DISCLAIMER } from '../data/medicinesData';
import { api } from '../lib/api';
import { mapMedicine } from '../lib/medicines';
import './pages.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPatient = user?.role === 'patient';

  const [dashSearch, setDashSearch] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [medicineCatalog, setMedicineCatalog] = useState([]);
  const [upcomingVaccine, setUpcomingVaccine] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isLoading, setIsLoading] = useState(isPatient);

  useEffect(() => {
    if (!isPatient) return;

    const loadDashboard = async () => {
      const results = await Promise.allSettled([
        api.get('/patients/me/dashboard', { requireAuth: true }),
        api.get('/medicines?page=1&limit=20'),
        api.get('/reminders/vaccinations', { requireAuth: true })
      ]);
      const errors = [];

      if (results[0].status === 'fulfilled') {
        setDashboardData(results[0].value);
      } else {
        errors.push(results[0].reason.message || 'Unable to load patient dashboard data.');
      }
      if (results[1].status === 'fulfilled') {
        setMedicineCatalog(results[1].value.map(mapMedicine));
      } else {
        errors.push(results[1].reason.message || 'Unable to load the medicine catalog.');
      }
      if (results[2].status === 'fulfilled') {
        const nextReminder = results[2].value.find((item) => item.status === 'upcoming' || item.status === 'overdue');
        if (nextReminder) {
          setUpcomingVaccine({
            name: nextReminder.vaccineName,
            date: new Date(nextReminder.dueDate).toLocaleDateString(),
            administeredBy: nextReminder.hospitalName || 'Facility not listed'
          });
        }
      } else {
        errors.push(results[2].reason.message || 'Unable to load vaccination reminders.');
      }

      setDashboardError(errors.join(' '));
      setIsLoading(false);
    };

    loadDashboard();
  }, [isPatient]);

  const reminders = (dashboardData?.activeReminders || []).map((reminder) => ({
    id: reminder._id,
    medName: reminder.medicineName,
    time: reminder.times?.[0] || 'Time not set',
    dosage: reminder.dosage || 'Dosage not listed',
    withFood: /with food/i.test(reminder.instructions || ''),
    taken: (reminder.takenLog || []).some((entry) =>
      entry.status === 'taken' && new Date(entry.takenAt).toDateString() === new Date().toDateString()
    )
  }));
  const healthRecords = (dashboardData?.recentHealthRecords || []).map((record) => ({
    id: record._id,
    title: record.title,
    facility: record.hospitalName || 'Facility not listed',
    date: record.recordDate ? new Date(record.recordDate).toLocaleDateString() : '',
    status: record.fileUrl ? 'File attached' : 'Saved'
  }));
  const popularMedicines = medicineCatalog.slice(0, 4);
  const totalMedicinesCount = medicineCatalog.length;
  const totalHealthRecordsCount = healthRecords.length;
  const totalPrescriptionsCount = dashboardData?.stats.activePrescriptions ?? 0;
  const activeReminderCount = dashboardData?.stats.activeReminders ?? 0;
  const upcomingAppointments = dashboardData?.upcomingAppointments || [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (dashSearch.trim()) {
      navigate(`/medicines?search=${encodeURIComponent(dashSearch.trim())}`);
    }
  };

  if (user?.role !== 'patient') {
    return (
      <div className="dashboard-page">
        <div className="upload-alert error" role="alert">
          A role-specific dashboard is not available for this account in the current frontend.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in">
      {/* Educational Prototype Disclaimer */}
      <div className="educational-disclaimer-banner">
        <ShieldAlert size={18} className="disclaimer-icon" />
        <p>{EDUCATIONAL_DISCLAIMER}</p>
      </div>
      {dashboardError && (
        <div className="upload-alert error" role="alert">
          {dashboardError}
        </div>
      )}

      {/* 1. Welcome Section & Hero Banner */}
      <div className="dashboard-hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <UserCheck size={14} />
            <span>Patient ID: {user?.medicalID || 'Not assigned'} • Blood Type: {user?.bloodGroup || 'Not provided'}</span>
          </div>

          <h2 className="hero-title">Welcome back, {user?.name || 'there'}!</h2>
          <p className="hero-desc">
            {isLoading
              ? 'Loading your healthcare data...'
              : <>You have <strong>{activeReminderCount} active medication reminders</strong> and <strong>{totalMedicinesCount} medicines</strong> in the catalog.</>}
          </p>

          {/* 6. Dashboard Search Medicine */}
          <form className="dashboard-hero-search" onSubmit={handleSearchSubmit}>
            <Search className="hero-search-icon" size={18} />
            <input
              type="text"
              placeholder="Quick search medicines or manufacturers..."
              value={dashSearch}
              onChange={(e) => setDashSearch(e.target.value)}
            />
            <Button type="submit" variant="primary" size="sm">
              Search Catalog
            </Button>
          </form>
        </div>
      </div>

      {/* 2. Four Core Stat Metric Cards (Medicine Count, Upcoming Reminders, Health Records, Prescriptions) */}
      <div className="dashboard-grid">
        <StatCard
          title="Total Medicines"
          value={isLoading ? '—' : totalMedicinesCount}
          unit="in catalog"
          badgeText="Live catalog"
          badgeType="success"
          trend="stable"
          trendValue="Active Catalog"
          icon={Pill}
          iconBgColor="var(--primary-100)"
          iconColor="var(--primary-700)"
          onClick={() => navigate('/medicines')}
        />

        <StatCard
          title="Upcoming Reminders"
          value={isLoading ? '—' : activeReminderCount}
          unit="active"
          badgeText="Medication schedule"
          badgeType="warning"
          trend="up"
          trendValue="View schedule"
          icon={Bell}
          iconBgColor="var(--accent-amber-light)"
          iconColor="var(--accent-amber)"
          onClick={() => navigate('/reminders')}
        />

        <StatCard
          title="Recent Health Records"
          value={isLoading ? '—' : totalHealthRecordsCount}
          unit="recent records"
          badgeText="From your account"
          badgeType="info"
          trend="stable"
          trendValue="Recent entries"
          icon={Activity}
          iconBgColor="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
          onClick={() => navigate('/health-records')}
        />

        <StatCard
          title="Prescriptions"
          value={isLoading ? '—' : totalPrescriptionsCount}
          unit="prescribed"
          badgeText="Active prescriptions"
          badgeType="success"
          trend="stable"
          trendValue="From your account"
          icon={FileText}
          iconBgColor="var(--accent-purple-light)"
          iconColor="var(--accent-purple)"
          onClick={() => navigate('/prescriptions')}
        />
      </div>

      {/* 12. AI Assistant Quick Access Banner */}
      <Card className="dashboard-ai-widget-card" hoverable onClick={() => navigate('/ai-assistant')}>
        <div className="ai-widget-content">
          <div className="ai-widget-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <h3 className="ai-widget-title">MediCare+ Healthcare Information Assistant</h3>
            <p className="ai-widget-desc">
              Ask general healthcare education and MediCare+ feature questions. This is not medical advice.
            </p>

            <div className="ai-prompt-chips">
              <span className="chip active">Check Amoxicillin interactions</span>
              <span className="chip active">Symptom Checker: Headache & Fatigue</span>
              <span className="chip active">Remind me about evening pills</span>
            </div>
          </div>
        </div>
        <Button variant="primary" icon={ArrowRight} iconPosition="right">
          Chat With AI
        </Button>
      </Card>

      {/* Main Two Column Layout */}
      <div className="dashboard-sections-grid" style={{ marginTop: '1.75rem' }}>
        {/* Left Column: Popular Medicines & Recent Records */}
        <div className="dashboard-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* 7. Popular Medicines Showcase */}
          <div>
            <div className="section-header-row">
              <h3>Configured Medicines</h3>
              <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right" onClick={() => navigate('/medicines')}>
                Browse All
              </Button>
            </div>

            <div className="popular-medicines-grid">
              {popularMedicines.map(med => (
                <Card key={med.id} className="popular-med-card" hoverable onClick={() => navigate(`/medicines/${med.id}`)}>
                  <div className="popular-med-header">
                    <span className="badge badge-neutral">{med.manufacturer || 'Manufacturer not listed'}</span>
                    <span className="popular-med-price">{med.formattedPrice}</span>
                  </div>
                  <h4 className="popular-med-name">{med.name}</h4>
                  <p className="popular-med-mfg">{med.category}</p>

                  <div className="popular-med-footer">
                    <span className={`badge ${med.prescriptionRequired ? 'badge-danger' : 'badge-info'}`}>
                      {med.prescriptionRequired ? 'Rx Required' : 'OTC'}
                    </span>
                    <span className="popular-view-link">
                      Details <ChevronRight size={14} />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 3. Upcoming Reminders Detail Box */}
          <div>
            <div className="section-header-row">
              <h3>Upcoming Medication Reminders</h3>
              <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right" onClick={() => navigate('/reminders')}>
                Schedule
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reminders.slice(0, 3).map(rem => (
                <Card key={rem.id} className="reminder-card" hoverable onClick={() => navigate('/reminders')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="reminder-time-box">
                      <Clock size={16} />
                      <span>{rem.time}</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-900)' }}>
                        {rem.medName}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Dosage: {rem.dosage} • {rem.withFood ? 'Take with food' : 'No instructions'}
                      </p>
                    </div>
                  </div>

                  <span className={`badge ${rem.taken ? 'badge-success' : 'badge-warning'}`}>
                    {rem.taken ? 'Taken' : 'Due Soon'}
                  </span>
                </Card>
              ))}
              {!isLoading && reminders.length === 0 && <p>No active reminders were found.</p>}
            </div>
          </div>

          {/* 9. Recent Health Records */}
          <div>
            <div className="section-header-row">
              <h3>Recent Health Records & Lab Reports</h3>
              <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right" onClick={() => navigate('/health-records')}>
                View All ({totalHealthRecordsCount})
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {healthRecords.slice(0, 2).map(rec => (
                <Card key={rec.id} className="record-item-card" hoverable onClick={() => navigate('/health-records')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileCheck size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-900)' }}>
                        {rec.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {rec.facility} • {rec.date}
                      </p>
                    </div>
                  </div>

                  <span className="badge badge-success">{rec.status}</span>
                </Card>
              ))}
              {!isLoading && healthRecords.length === 0 && <p>No health records were found.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Vaccine, Nearby Pharmacy, Quick Actions */}
        <div className="dashboard-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* 11. Quick Action Buttons */}
          <Card>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--neutral-900)' }}>
              Quick Action Shortcuts
            </h4>
            <div className="quick-actions-grid">
              <Button
                variant="outline"
                size="md"
                icon={Plus}
                onClick={() => navigate('/reminders')}
                style={{ justifyContent: 'flex-start' }}
              >
                Add Pill Reminder
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={Upload}
                onClick={() => navigate('/health-records')}
                style={{ justifyContent: 'flex-start' }}
              >
                Add Health Record
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={Search}
                onClick={() => navigate('/medicines')}
                style={{ justifyContent: 'flex-start' }}
              >
                Search Medicines
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={Syringe}
                onClick={() => navigate('/vaccinations')}
                style={{ justifyContent: 'flex-start' }}
              >
                Add Vaccine Reminder
              </Button>
            </div>
          </Card>

          {upcomingVaccine && <Card style={{ backgroundColor: 'var(--primary-50)', borderColor: 'var(--primary-200)' }}>
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-600)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Syringe size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="badge badge-warning" style={{ marginBottom: '0.4rem' }}>
                  Vaccine Reminder
                </span>
                <h4 style={{ fontSize: '0.975rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
                  {upcomingVaccine.name}
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--neutral-700)', margin: '0.25rem 0 0.85rem 0' }}>
                  Scheduled Date: <strong>{upcomingVaccine.date}</strong> at {upcomingVaccine.administeredBy}
                </p>
                <Button variant="primary" size="sm" onClick={() => navigate('/vaccinations')}>
                  View Vaccine Reminders
                </Button>
              </div>
            </div>
          </Card>}

          {upcomingAppointments.length > 0 && (
            <Card>
              <span className="badge badge-info">Upcoming Appointment</span>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0.75rem 0 0.25rem' }}>
                {upcomingAppointments[0].doctor?.name || 'Doctor not listed'}
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {new Date(upcomingAppointments[0].appointmentDate).toLocaleString()}
              </p>
              {upcomingAppointments[0].condition && (
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  {upcomingAppointments[0].condition}
                </p>
              )}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};
