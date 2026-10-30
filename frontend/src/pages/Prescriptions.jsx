import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Eye,
  Download,
  AlertCircle,
  X,
  RefreshCw,
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
import { api, getApiBaseUrl } from '../lib/api';
import './pages.css';

const createMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const mapPrescription = (prescription) => {
  const expired = prescription.validUntil && new Date(prescription.validUntil) < new Date();
  const status = prescription.prescriptionType === 'uploaded'
    ? (prescription.isVerified ? 'Verified' : 'Pending verification')
    : (expired ? 'Completed' : 'Active');

  return {
    ...prescription,
    id: prescription._id,
    documentType: 'prescription',
    code: prescription._id?.slice(-8).toUpperCase() || 'Prescription',
    doctorName: prescription.doctor?.name || prescription.doctorName || 'Doctor not listed',
    specialty: prescription.prescriptionType === 'uploaded' ? 'Uploaded document' : 'Doctor-issued',
    clinicName: prescription.hospitalName || prescription.clinicName || 'Clinic not listed',
    date: prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '',
    prescriptionDate: prescription.prescriptionDate ? new Date(prescription.prescriptionDate).toLocaleDateString() : '',
    status,
    medicines: (prescription.medicines || []).map((medicine) => ({
      name: medicine.medicineName,
      duration: medicine.duration || 'Not specified',
      instructions: [medicine.frequency, medicine.instructions].filter(Boolean).join(' · ') || 'No instructions recorded'
    })),
    diagnosis: prescription.diagnosis || 'Not recorded',
    notes: prescription.notes || '',
    processingStatus: prescription.processingStatus || 'pending',
    extractedText: prescription.extractedText || null,
    processingError: prescription.processingError || null,
    ocrNote: prescription.ocrNote || null,
  };
};

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

export const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');

  // Modal States
  const [viewerDoc, setViewerDoc] = useState(null);
  const [chatDoc, setChatDoc] = useState(null);
  const [detailsDoc, setDetailsDoc] = useState(null);

  const filteredRx = prescriptions;

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const data = await api.get('/prescriptions/my', { requireAuth: true });
        const list = Array.isArray(data) ? data : (data.data || []);
        setPrescriptions(list.map(mapPrescription));
      } catch (error) {
        setLoadError(error.message || 'Unable to load prescriptions.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrescriptions();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadSuccessMsg('');
    setUploadErrorMsg('');

    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      setUploadErrorMsg('Invalid file format. Please upload a PDF, JPG, or PNG file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadErrorMsg('File size exceeds the 5MB upload limit. Please select a smaller file.');
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

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadErrorMsg('Please select a prescription PDF, JPG, or PNG file first.');
      return;
    }

    setIsUploading(true);
    setUploadErrorMsg('');
    setUploadSuccessMsg('');
    const formData = new FormData();
    formData.append('prescription', selectedFile.raw);
    if (diagnosisInput.trim()) formData.append('diagnosis', diagnosisInput.trim());
    if (diagnosisInput.trim()) formData.append('prescriptionDate', new Date().toISOString().split('T')[0]);

    try {
      const response = await api.post('/prescriptions/upload', formData, { requireAuth: true });
      setPrescriptions((previous) => [mapPrescription(response), ...previous]);
      setUploadSuccessMsg(`Prescription "${selectedFile.name}" successfully uploaded and saved!`);
      setSelectedFile(null);
      setDiagnosisInput('');
    } catch (error) {
      setUploadErrorMsg(error.message || 'Unable to upload this prescription.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocess = async (rx) => {
    try {
      const response = await api.post(`/prescriptions/${rx.id}/reprocess`, {}, { requireAuth: true });
      const data = response.data || response;
      const updated = mapPrescription(data);
      setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
      setUploadSuccessMsg('Prescription document reprocessed successfully.');
    } catch (error) {
      setUploadErrorMsg(error.message || 'Reprocessing failed.');
    }
  };

  return (
    <div className="prescriptions-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Prescription Management</h2>
          <p className="page-subtitle">Upload doctor prescription files (PDF/JPG/PNG), view details, and manage records</p>
        </div>
      </div>
      {loadError && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Module A: Prescription Upload Section */}
      <Card className="upload-prescription-card">
        <h3 className="section-title">
          <Upload className="text-primary" size={20} />
          Upload New Prescription Document
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Upload official doctor prescriptions in <strong>PDF, JPG, or PNG</strong> format (Max size: 5MB).
        </p>

        {uploadSuccessMsg && (
          <div className="upload-alert success">
            <Stethoscope size={18} />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadErrorMsg && (
          <div className="upload-alert error">
            <AlertCircle size={18} />
            <span>{uploadErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="upload-form">
          <div className="file-drop-zone">
            <input
              type="file"
              id="rx-file-input"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden-file-input"
            />
            <label htmlFor="rx-file-input" className="file-drop-label">
              <div className="drop-icon-wrapper">
                <FileText size={32} />
              </div>
              <p className="drop-main-text">
                Click to browse or drag & drop prescription file
              </p>
              <p className="drop-sub-text">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
            </label>
          </div>

          {selectedFile && (
            <div className="selected-file-preview fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="file-type-badge">{selectedFile.type}</div>
                <div>
                  <p className="preview-filename">{selectedFile.name}</p>
                  <p className="preview-filesize">{selectedFile.size}</p>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => setSelectedFile(null)}
                title="Remove selected file"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Diagnosis (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={diagnosisInput}
              onChange={(e) => setDiagnosisInput(e.target.value)}
              placeholder="Add a diagnosis only if it appears on the uploaded prescription"
            />
          </div>

          {isUploading && <p role="status">Uploading prescription file...</p>}

          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={!selectedFile || isUploading}
              icon={Upload}
            >
              Upload & Save Prescription
            </Button>
          </div>
        </form>
      </Card>

      {/* Previous Prescriptions List */}
      <div style={{ margin: '2rem 0 1.25rem 0' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
          Previous Prescriptions ({filteredRx.length})
        </h3>
      </div>

      {isLoading ? (
        <LoadingState count={3} type="card" />
      ) : filteredRx.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Prescriptions Found"
          description="Upload a prescription document to get started. Once uploaded, you can view, download, and ask MediCare AI about it."
          actionText="Upload a Prescription"
          onAction={() => window.scrollTo(0, 0)}
          actionIcon={Upload}
        />
      ) : (
        <div className="prescriptions-list">
          {filteredRx.map(rx => (
            <Card key={rx.id} className="rx-card" hoverable>
              <div className="rx-header">
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--primary-100)',
                    color: 'var(--primary-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="rx-doc-name">{rx.fileName || 'Untitled Prescription'}</h3>
                    <p className="rx-doc-sub">{rx.doctorName} • {rx.specialty}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${STATUS_BADGE[rx.processingStatus] || 'badge-neutral'}`}>
                    {STATUS_LABEL[rx.processingStatus] || rx.processingStatus}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {rx.prescriptionDate || rx.date}
                  </span>
                </div>
              </div>

              <div style={{ padding: '0.75rem 0' }}>
                {rx.diagnosis && rx.diagnosis !== 'Not recorded' && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-800)', marginBottom: '0.5rem' }}>
                    Diagnosis: <strong>{rx.diagnosis}</strong>
                  </p>
                )}

                {rx.extractedText ? (
                  <div style={{ backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--primary-800)', fontWeight: '700', marginBottom: '0.4rem' }}>
                      Extracted Details
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.825rem', color: 'var(--neutral-800)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Medicines / Text</span>
                        <span>{rx.extractedText.slice(0, 200)}{rx.extractedText.length > 200 ? '...' : ''}</span>
                      </div>
                    </div>
                    {rx.ocrNote && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        {rx.ocrNote}
                      </p>
                    )}
                  </div>
                ) : (
                  rx.processingStatus === 'failed' && (
                    <div style={{ backgroundColor: '#ffe4e6', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.8rem', color: '#e11d48', fontWeight: '700', marginBottom: '0.3rem' }}>
                        Processing Failed
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#e11d48' }}>
                        {rx.processingError || 'Unable to extract text from this document.'}
                      </p>
                    </div>
                  )
                )}

                {rx.processingStatus === 'completed' && !rx.extractedText && rx.ocrNote && (
                  <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', marginBottom: '0.3rem' }}>
                      No Readable Text
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#92400e' }}>
                      {rx.ocrNote}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <Button variant="outline" size="sm" icon={Eye} onClick={() => setViewerDoc(rx)}>
                  View Document
                </Button>
                <Button variant="outline" size="sm" icon={Download} onClick={() => {
                  const a = document.createElement('a');
                  const token = localStorage.getItem('medicare_token');
                  const url = `${getApiBaseUrl()}/prescriptions/${rx.id}/download`;
                  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.blob())
                    .then(blob => {
                      const objectUrl = URL.createObjectURL(blob);
                      a.href = objectUrl;
                      a.download = rx.fileName || 'prescription';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(objectUrl);
                    });
                }}>
                  Download
                </Button>
                <Button variant="outline" size="sm" icon={FileText} onClick={() => setDetailsDoc(rx)}>
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Bot}
                  style={{ backgroundColor: 'var(--accent-purple-light)', color: 'var(--accent-purple)', border: '1px solid rgba(124, 58, 237, 0.2)' }}
                  onClick={() => setChatDoc(rx)}
                  disabled={rx.processingStatus === 'failed' && !rx.extractedText}
                >
                  Ask MediCare AI
                </Button>
                {rx.processingStatus === 'failed' && (
                  <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => handleReprocess(rx)}>
                    Retry
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

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
        document={{ ...chatDoc, documentType: 'prescription' }}
      />

      {/* Details Modal */}
      {detailsDoc && (
        <Modal
          isOpen={Boolean(detailsDoc)}
          onClose={() => setDetailsDoc(null)}
          title={`Prescription Details: ${detailsDoc.fileName || 'Untitled'}`}
          subtitle={`${detailsDoc.doctorName} • ${detailsDoc.prescriptionDate || detailsDoc.date}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--neutral-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Record Source</p>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{detailsDoc.fileName}</p>
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
