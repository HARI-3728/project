import React, { useState, useEffect } from 'react';
import {
  Syringe,
  Download,
  Plus,
  Bell,
  BellRing,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import './pages.css';

const mapVaccination = (reminder) => ({
  ...reminder,
  id: reminder._id,
  name: reminder.vaccineName,
  date: reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : '',
  administeredBy: reminder.hospitalName || 'Facility not listed',
  status: {
    upcoming: 'Scheduled',
    administered: 'Completed',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  }[reminder.status] || reminder.status,
  dose: reminder.dose || 'Dose not specified',
  batchNo: reminder.batchNumber || 'Pending',
  certificateAvailable: Boolean(reminder.certificateUrl)
});

export const Vaccinations = () => {
  const [vaccines, setVaccines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [newVaccine, setNewVaccine] = useState({
    vaccineName: 'Annual Influenza (Flu) Shot',
    dueDate: '',
    hospitalName: '',
    dose: ''
  });

  useEffect(() => {
    const loadVaccinations = async () => {
      try {
        const data = await api.get('/reminders/vaccinations', { requireAuth: true });
        setVaccines(data.map(mapVaccination));
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load vaccination reminders.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVaccinations();
  }, []);

  const nextVaccine = vaccines.find(v => v.status === 'Scheduled' || v.status === 'Overdue');

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const reminder = await api.post('/reminders/vaccinations', {
        vaccineName: newVaccine.vaccineName,
        dueDate: newVaccine.dueDate,
        hospitalName: newVaccine.hospitalName,
        dose: newVaccine.dose,
        reminderDaysBefore: 7
      }, { requireAuth: true });
      setVaccines((previous) => [...previous, mapVaccination(reminder)]);
      setIsBookModalOpen(false);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to schedule this vaccination reminder.');
    }
  };

  const toggleReminder = async () => {
    if (!nextVaccine) return;
    const enabled = nextVaccine.reminderDaysBefore > 0;
    setErrorMessage('');
    try {
      const updated = await api.patch(`/reminders/vaccinations/${nextVaccine.id}`, {
        reminderDaysBefore: enabled ? 0 : 7
      }, { requireAuth: true });
      setVaccines((previous) => previous.map((item) =>
        item.id === nextVaccine.id ? mapVaccination(updated) : item
      ));
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update the vaccination reminder.');
    }
  };

  return (
    <div className="vaccinations-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Vaccination & Immunization Tracker ({vaccines.length})</h2>
          <p className="page-subtitle">Track vaccine names, dates, upcoming immunization status, and active reminders</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsBookModalOpen(true)}>
          Add Vaccine Reminder
        </Button>
      </div>
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Module C: Dedicated Vaccine Reminder Display Widget */}
      {nextVaccine && (
        <Card className="vaccine-reminder-widget-card" style={{ marginBottom: '1.75rem' }}>
          <div className="vac-reminder-content">
            <div className="vac-reminder-icon-box">
              <BellRing size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-warning">
                  {nextVaccine.status === 'Overdue' ? 'Overdue Vaccine Reminder' : 'Vaccine Reminder'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due Date: {nextVaccine.date}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
                Immunization: {nextVaccine.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', marginTop: '0.2rem' }}>
                Scheduled location: <strong>{nextVaccine.administeredBy}</strong> ({nextVaccine.dose})
              </p>
            </div>
          </div>

          <Button
            variant={nextVaccine.reminderDaysBefore > 0 ? 'secondary' : 'outline'}
            size="sm"
            icon={nextVaccine.reminderDaysBefore > 0 ? Check : Bell}
            onClick={toggleReminder}
          >
            {nextVaccine.reminderDaysBefore > 0 ? 'Disable 7-day reminder' : 'Enable 7-day reminder'}
          </Button>
        </Card>
      )}

      {/* Vaccines List */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>
        Immunization Records & Scheduled Slots
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isLoading ? <p role="status">Loading vaccination reminders...</p> : vaccines.map(vac => (
          <Card key={vac.id} className="record-item-card" hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: vac.status === 'Completed' ? 'var(--primary-100)' : 'var(--accent-amber-light)',
                color: vac.status === 'Completed' ? 'var(--primary-700)' : 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Syringe size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
                  {vac.name}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Facility: {vac.administeredBy} • Date: <strong>{vac.date}</strong> • Dose: {vac.dose}
                </p>
                {vac.batchNo !== 'Pending' && (
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
                    Batch Code: {vac.batchNo}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span className={`badge ${
                vac.status === 'Completed' ? 'badge-success' :
                vac.status === 'Scheduled' ? 'badge-info' : 'badge-warning'
              }`}>
                {vac.status}
              </span>

              {vac.certificateAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={() => alert(`Downloading official vaccination certificate for ${vac.name}...`)}
                >
                  Certificate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Book Vaccine Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Add Vaccination Reminder"
        subtitle="Save a due-date reminder; this does not book a clinic appointment."
      >
        <form onSubmit={handleBookSubmit} className="auth-form">
          <div className="form-group">
            <label>Vaccine Name</label>
            <select
              className="form-input"
              value={newVaccine.vaccineName}
              onChange={(e) => setNewVaccine({ ...newVaccine, vaccineName: e.target.value })}
            >
              <option value="Annual Influenza (Flu) Shot">Annual Influenza (Flu) Shot</option>
              <option value="COVID-19 Booster (KP.2)">COVID-19 Booster (KP.2)</option>
              <option value="Hepatitis B Booster">Hepatitis B Booster</option>
              <option value="Tetanus & Diphtheria (Tdap)">Tetanus & Diphtheria (Tdap)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Appointment Date</label>
            <input
              type="date"
              className="form-input"
              value={newVaccine.dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewVaccine({ ...newVaccine, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Facility Location</label>
            <input
              className="form-input"
              value={newVaccine.hospitalName}
              onChange={(e) => setNewVaccine({ ...newVaccine, hospitalName: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
            <Button variant="outline" onClick={() => setIsBookModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Reminder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
