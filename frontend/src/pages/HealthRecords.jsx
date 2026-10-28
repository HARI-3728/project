import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Eye,
  Download,
  AlertCircle,
  X,
  RefreshCw,
  FileText,
  Stethoscope,
  Bot,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { DocumentViewer } from '../components/ui/DocumentViewer';
import { DocumentAIChat } from '../components/ui/DocumentAIChat';
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
  documentType: 'health-record',
  category: recordTypeLabels[record.recordType] || record.recordType,
  date: record.recordDate ? new Date(record.recordDate).toLocaleDateString() : '',
  facility: record.hospitalName || 'Facility not listed',
  doctor: record.doctorName || 'Doctor not listed',
  summary: record.description || 'No notes provided.',
  status: record.fileUrl ? 'File attached' : 'Saved',
  processingStatus: record.processingStatus || 'pending',
  extractedText: record.extractedText || null,
  processingError: record.processingError || null,
  ocrNote: record.ocrNote || null,
});

const STATUS_BADGE = {
  completed: 'badge-success',
  pending: 'badge-neutral',
  failed: 'badge-danger',
};

const STATUS_LABEL = {
  completed: 'Processed',
  pending: 'Processing',
  failed: 'Failed',
};

export const HealthRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [chatDoc, setChatDoc] = useState(null);
  const [detailsDoc, setDetailsDoc] = useState(null);

  // New Record Form State
  const [newRecordForm, setNewRecordForm] = useState({
    title: '',
    category: 'Lab Report',
    date: new Date().toISOString().split('T')[0],
    facility: '',
    doctor: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await api.get('/health-records/my', { requireAuth: true });
        setRecords(Array.isArray(data) ? data : (data.data || []));
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      setErrorMessage('Invalid file format. Please upload a PDF, JPG, or PNG file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB upload limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile({
      raw: file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: extension.toUpperCase(),
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile ? selectedFile.raw : null);
    formData.append('title', newRecordForm.title);
    formData.append('recordType', recordTypeValues[newRecordForm.category]);
    formData.append('recordDate', newRecordForm.date);
    formData.append('hospitalName', newRecordForm.facility);
    formData.append('doctorName', newRecordForm.doctor);
    formData.append('description', newRecordForm.notes);

    try {
      setIsUploading(true);
      const response = await api.post('/health-records', formData, { requireAuth: true });
      setRecords((previous) => [mapHealthRecord(response), ...previous]);
      setIsAddModalOpen(false);
      setSelectedFile(null);
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (rec) => {
    const token = localStorage.getItem('medicare_token');
    const url = `${new URL(import.meta.env.VITE_BACKEND_URL).origin}/api/v1/health-records/${rec.id}/download`;
    const a = document.createElement('a');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Download failed.');
        return r.blob();
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = rec.fileName || 'health-record';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => setErrorMessage('Download failed.'));
  };

  const handleReprocess = async (rec) => {
    try {
      const response = await api.post(`/health-records/${rec.id}/reprocess`, {}, { requireAuth: true });
      const data = response.data || response;
      const updated = mapHealthRecord(data);
      setRecords(prev => prev.map(p => p.id === updated.id ? updated : p));
      setErrorMessage('Health record document reprocessed successfully.');
    } catch (error) {
      setErrorMessage(error.message || 'Reprocessing failed.');
    }
  };

  return (
    <div className="health-records-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Health Records ({records.length})</h2>
          <p className="page-subtitle">Log medical records, upload diagnostic reports, and manage health notes</p>
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
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => { setSearchQuery(''); setSelectedType('All'); }}>
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
          <LoadingState count={3} type="card" />
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

                {rec.extractedText && (
                  <div style={{ backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--primary-800)', fontWeight: '700', marginBottom: '0.4rem' }}>
                      Extracted Details
                    </p>
                    <div style={{ fontSize: '0.825rem', color: 'var(--neutral-800)', whiteSpace: 'pre-wrap' }}>
                      {rec.extractedText.slice(0, 300)}{rec.extractedText.length > 300 ? '...' : ''}
                    </div>
                    {rec.ocrNote && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        {rec.ocrNote}
                      </p>
                    )}
                  </div>
                )}

                {rec.processingStatus === 'failed' && (
                  <div style={{ backgroundColor: '#ffe4e6', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#e11d48', fontWeight: '700', marginBottom: '0.3rem' }}>
                      Processing Failed
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#e11d48' }}>
                      {rec.processingError || 'Unable to extract text from this document.'}
                    </p>
                  </div>
                )}

                {rec.processingStatus === 'completed' && !rec.extractedText && rec.ocrNote && (
                  <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', marginBottom: '0.3rem' }}>
                      No Readable Text
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#92400e' }}>
                      {rec.ocrNote}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                  <Button variant="outline" size="sm" icon={Eye} onClick={() => setViewerDoc(rec)}>
                    View Document
                  </Button>
                  <Button variant="outline" size="sm" icon={Download} onClick={() => handleDownload(rec)}>
                    Download
                  </Button>
                  <Button variant="outline" size="sm" icon={FileText} onClick={() => setDetailsDoc(rec)}>
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Bot}
                    style={{ backgroundColor: 'var(--accent-purple-light)', color: 'var(--accent-purple)', border: '1px solid rgba(124, 58, 237, 0.2)' }}
                    onClick={() => setChatDoc(rec)}
                    disabled={rec.processingStatus === 'failed' && !rec.extractedText}
                  >
                    Ask MediCare AI
                  </Button>
                  {rec.processingStatus === 'failed' && (
                    <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => handleReprocess(rec)}>
                      Retry
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileCheck}
            title="No Health Records Found"
            description="Upload a health record document to get started. Once uploaded, you can view, download, and ask MediCare AI about it."
            actionText="Add Health Record"
            onAction={() => setIsAddModalOpen(true)}
            actionIcon={Plus}
          />
        )}
      </div>

      {/* Add Record Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Health Record"
        subtitle="Upload a diagnostic lab report, imaging result, or health notes document"
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

          <div className="form-group">
            <label>Upload Document (PDF, JPG, PNG)</label>
            <div className="file-drop-zone" style={{ border: '2px dashed var(--primary-300)', backgroundColor: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
              <input
                type="file"
                id="hr-file-input"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <label htmlFor="hr-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} style={{ color: 'var(--primary-600)' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--neutral-900)' }}>
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to browse or drag & drop'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supported formats: PDF, JPG, PNG (Max 5MB)
                </p>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => setSelectedFile(null)}
                  title="Remove selected file"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {isUploading && <p style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: '600' }}>Uploading document...</p>}
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
            <Button type="submit" variant="primary" isLoading={isUploading} disabled={isUploading}>
              Save Health Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={Boolean(viewerDoc)}
        onClose={() => setViewerDoc(null)}
        document={viewerDoc}
      />

      {/* Document AI Chat Modal */}
      <DocumentAIChat
        isOpen={Boolean(chatDoc)}
        onClose={() => setChatDoc(null)}
        document={{ ...chatDoc, documentType: 'health-record' }}
      />

      {/* Details Modal */}
      {detailsDoc && (
        <Modal
          isOpen={Boolean(detailsDoc)}
          onClose={() => setDetailsDoc(null)}
          title={`Health Record Details: ${detailsDoc.fileName || 'Untitled'}`}
          subtitle={`${detailsDoc.category} • ${detailsDoc.date}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--neutral-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Record Source</p>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{detailsDoc.fileName}</p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem' }}>Facility & Doctor</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-800)' }}>
                Facility: <strong>{detailsDoc.facility}</strong> &bull; Doctor: <strong>{detailsDoc.doctor}</strong>
              </p>
            </div>

            {detailsDoc.extractedText && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem' }}>Extracted Content</h4>
                <div style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.875rem', color: 'var(--neutral-800)', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                  {detailsDoc.extractedText}
                </div>
              </div>
            )}

            {detailsDoc.ocrNote && (
              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '700', marginBottom: '0.3rem' }}>
                  Processing Note
                </p>
                <p style={{ fontSize: '0.85rem', color: '#92400e' }}>
                  {detailsDoc.ocrNote}
                </p>
              </div>
            )}

            {detailsDoc.processingError && (
              <div style={{ backgroundColor: '#ffe4e6', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#e11d48', fontWeight: '700', marginBottom: '0.3rem' }}>
                  Processing Error
                </p>
                <p style={{ fontSize: '0.85rem', color: '#e11d48' }}>
                  {detailsDoc.processingError}
                </p>
              </div>
            )}

            <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setDetailsDoc(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => { setDetailsDoc(null); setViewerDoc(detailsDoc); }}>
                View Document
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
