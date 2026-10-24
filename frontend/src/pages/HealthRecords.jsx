import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Eye,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import './pages.css';

const recordTypeLabels = {
  lab_report: 'Lab Report',
  scan: 'Scan',
  xray: 'X-Ray',
  prescription: 'Prescription',
  discharge_summary: 'Discharge Summary',
  vaccination_certificate: 'Vaccination Certificate',
  other: 'Other'
};

const recordTypeValues = Object.fromEntries(
  Object.entries(recordTypeLabels).map(([value, label]) => [label, value])
);

const mapHealthRecord = (record) => ({
  ...record,
  id: record._id,
  category: recordTypeLabels[record.recordType] || record.recordType,
  date: record.recordDate ? new Date(record.recordDate).toLocaleDateString() : '',
  facility: record.hospitalName || 'Facility not listed',
  doctor: record.doctorName || 'Doctor not listed',
  summary: record.description || 'No notes provided.',
  status: record.fileUrl ? 'File attached' : 'Saved'
});

export const HealthRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // New Record Form State
  const [newRecordForm, setNewRecordForm] = useState({
    title: '',
    category: 'Lab Report',
    date: new Date().toISOString().split('T')[0],
    facility: '',
    doctor: '',
    notes: ''
  });

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await api.get('/health-records/my', { requireAuth: true });
        setRecords(data.map(mapHealthRecord));
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load health records.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, []);

  // Filter Pipeline
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        rec.title.toLowerCase().includes(q) ||
        rec.facility.toLowerCase().includes(q) ||
        rec.summary.toLowerCase().includes(q)
      );
      const matchesType = selectedType === 'All' || rec.category === selectedType;
      return matchesSearch && matchesType;
    });
  }, [records, searchQuery, selectedType]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const record = await api.post('/health-records', {
        title: newRecordForm.title,
        recordType: recordTypeValues[newRecordForm.category],
        recordDate: newRecordForm.date,
        hospitalName: newRecordForm.facility,
        doctorName: newRecordForm.doctor,
        description: newRecordForm.notes
      }, { requireAuth: true });
      setRecords((previous) => [mapHealthRecord(record), ...previous]);
      setIsAddModalOpen(false);
      setNewRecordForm({
        title: '',
        category: 'Lab Report',
        date: new Date().toISOString().split('T')[0],
        facility: '',
        doctor: '',
        notes: ''
      });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save this health record.');
    }
  };

  return (
    <div className="health-records-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Health Records ({records.length})</h2>
          <p className="page-subtitle">Log medical records, search diagnostic reports, and manage health notes</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add Health Record
        </Button>
      </div>
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="upload-alert" role="note">
        Vitals are not currently exposed by the backend API; this page shows persisted medical records only.
      </div>

      {/* Module B: Search & Filter Toolbar */}
      <div className="medicine-filter-panel" style={{ marginTop: '2rem' }}>
        <div className="search-filter-row">
          <div className="navbar-search flex-1">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by record title, lab facility, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div className="filter-select-group" style={{ minWidth: '180px' }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-input"
            >
              <option value="All">All Record Types</option>
              <option value="Lab Report">Lab Report</option>
              <option value="Scan">Scan</option>
              <option value="X-Ray">X-Ray</option>
              <option value="Prescription">Prescription</option>
              <option value="Discharge Summary">Discharge Summary</option>
              <option value="Vaccination Certificate">Vaccination Certificate</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {(searchQuery || selectedType !== 'All') && (
            <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => { setSearchQuery(''); setSelectedType('All'); }}>
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Health Records List */}
      <div style={{ marginTop: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>
          Diagnostic Lab Records & Medical Notes
        </h3>

        {isLoading ? (
          <p role="status">Loading health records...</p>
        ) : filteredRecords.length > 0 ? (
          <div className="records-list">
            {filteredRecords.map(rec => (
              <Card key={rec.id} className="record-item-card" hoverable>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
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
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--neutral-900)' }}>
                      {rec.title}
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Category: <strong>{rec.category}</strong> • {rec.facility} • Date: {rec.date}
                    </p>
                    <p style={{ fontSize: '0.825rem', color: 'var(--neutral-700)', marginTop: '0.25rem' }}>
                      Notes: {rec.summary}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="badge badge-success">{rec.status}</span>
                  <Button variant="outline" size="sm" icon={Eye} onClick={() => setSelectedRecord(rec)}>
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileCheck}
            title="No Records Found"
            description="No health records match your current search query or filter selection."
            actionText="Reset Filter"
            onAction={() => { setSearchQuery(''); setSelectedType('All'); }}
          />
        )}
      </div>

      {/* Add Record Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Health Record"
        subtitle="Log diagnostic lab report, imaging result, or health notes"
      >
        <form onSubmit={handleAddSubmit} className="auth-form">
          <div className="form-group">
            <label>Record Title</label>
            <input
              type="text"
              className="form-input"
              value={newRecordForm.title}
              onChange={(e) => setNewRecordForm({ ...newRecordForm, title: e.target.value })}
              placeholder="e.g. Comprehensive Blood Panel 2026"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Record Type</label>
              <select
                className="form-input"
                value={newRecordForm.category}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, category: e.target.value })}
              >
                <option value="Lab Report">Lab Report</option>
                <option value="Scan">Scan</option>
                <option value="X-Ray">X-Ray</option>
                <option value="Prescription">Prescription</option>
                <option value="Discharge Summary">Discharge Summary</option>
                <option value="Vaccination Certificate">Vaccination Certificate</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                className="form-input"
                value={newRecordForm.date}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Facility Name</label>
              <input
                type="text"
                className="form-input"
                value={newRecordForm.facility}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, facility: e.target.value })}
                placeholder="Quest Diagnostics"
              />
            </div>

            <div className="form-group">
              <label>Attending Doctor</label>
              <input
                type="text"
                className="form-input"
                value={newRecordForm.doctor}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, doctor: e.target.value })}
                placeholder="Dr. Robert Chen"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Medical Notes / Summary</label>
            <textarea
              className="form-input"
              rows={3}
              value={newRecordForm.notes}
              onChange={(e) => setNewRecordForm({ ...newRecordForm, notes: e.target.value })}
              placeholder="Enter summary notes, fasting glucose readings, EKG results, etc..."
            />
          </div>

          <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Health Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={`Health Record: ${selectedRecord.title}`}
          subtitle={`${selectedRecord.category} • ${selectedRecord.date}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--neutral-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Facility & Attending Physician</p>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                {selectedRecord.facility} — Attending: {selectedRecord.doctor}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.35rem' }}>Medical Summary & Notes</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--neutral-800)', lineHeight: '1.5' }}>
                {selectedRecord.summary}
              </p>
            </div>

            <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
