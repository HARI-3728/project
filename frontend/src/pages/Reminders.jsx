import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Check, Sun, Moon, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import './pages.css';

const formatTime = (value) => {
  const [hour, minute] = (value || '08:00').split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
};

const mapReminder = (reminder) => {
  const taken = (reminder.takenLog || []).some((entry) =>
    entry.status === 'taken' && new Date(entry.takenAt).toDateString() === new Date().toDateString()
  );
  return {
    ...reminder,
    id: reminder._id,
    medName: reminder.medicineName,
    time: (reminder.times || []).map(formatTime).join(', ') || 'Time not set',
    taken,
    withFood: /with food/i.test(reminder.instructions || '')
  };
};

export const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newRem, setNewRem] = useState({
    medName: '',
    time: '08:00',
    dosage: '1 Tablet',
    withFood: true
  });

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const data = await api.get('/reminders/medicines', { requireAuth: true });
        setReminders(data.map(mapReminder));
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load medicine reminders.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();
  }, []);

  const toggleTakenStatus = async (reminder) => {
    setErrorMessage('');
    try {
      await api.post(`/reminders/medicines/${reminder.id}/take`, {
        scheduledTime: reminder.times?.[0]
      }, { requireAuth: true });
      setReminders((previous) => previous.map((item) =>
        item.id === reminder.id
          ? { ...item, taken: true }
          : item
      ));
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update this reminder.');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const reminder = await api.post('/reminders/medicines', {
        medicineName: newRem.medName,
        dosage: newRem.dosage,
        frequency: 'once_daily',
        times: [newRem.time],
        startDate: new Date().toISOString(),
        instructions: newRem.withFood ? 'Take with food' : ''
      }, { requireAuth: true });
      setReminders((previous) => [mapReminder(reminder), ...previous]);
      setIsAddModalOpen(false);
      setNewRem({ medName: '', time: '08:00', dosage: '1 Tablet', withFood: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create this reminder.');
    }
  };

  return (
    <div className="reminders-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pill Reminders & Alarm Schedule</h2>
          <p className="page-subtitle">Set timely medication alerts so you never miss a dose</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add Pill Reminder
        </Button>
      </div>
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="reminders-schedule-grid">
        {isLoading ? <p role="status">Loading reminders...</p> : reminders.map(rem => (
          <Card key={rem.id} className="reminder-card" hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="reminder-time-box">
                {rem.times?.[0] && Number(rem.times[0].slice(0, 2)) < 12 ? <Sun size={16} /> : <Moon size={16} />}
                <span>{rem.time}</span>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--neutral-900)' }}>
                  {rem.medName}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {rem.dosage} • {rem.instructions || 'No instructions'}
                </p>
              </div>
            </div>

            <Button
              variant={rem.taken ? 'secondary' : 'primary'}
              size="sm"
              icon={rem.taken ? CheckCircle2 : Check}
              onClick={() => toggleTakenStatus(rem)}
              disabled={rem.taken}
            >
              {rem.taken ? 'Taken' : 'Mark Taken'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Add Reminder Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule New Pill Reminder"
        subtitle="Set daily recurring dosage alarm"
      >
        <form onSubmit={handleAddSubmit} className="auth-form">
          <div className="form-group">
            <label>Medication Name</label>
            <input
              type="text"
              className="form-input"
              value={newRem.medName}
              onChange={(e) => setNewRem({ ...newRem, medName: e.target.value })}
              placeholder="e.g. Amoxicillin 500mg"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Reminder Time</label>
              <input
                type="time"
                className="form-input"
                value={newRem.time}
                onChange={(e) => setNewRem({ ...newRem, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dosage</label>
            <input
              type="text"
              className="form-input"
              value={newRem.dosage}
              onChange={(e) => setNewRem({ ...newRem, dosage: e.target.value })}
              placeholder="1 Capsule"
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
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
