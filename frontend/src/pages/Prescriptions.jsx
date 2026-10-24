import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import './pages.css';

const mapPrescription = (prescription) => {
  const expired = prescription.validUntil && new Date(prescription.validUntil) < new Date();
  const status = prescription.prescriptionType === 'uploaded'
    ? (prescription.isVerified ? 'Verified' : 'Pending verification')
    : (expired ? 'Completed' : 'Active');

  return {
    ...prescription,
    id: prescription._id,
    code: prescription._id?.slice(-8).toUpperCase() || 'Prescription',
    doctorName: prescription.doctor?.name || 'Doctor not listed',
    specialty: prescription.prescriptionType === 'uploaded' ? 'Uploaded document' : 'Doctor-issued',
    clinicName: prescription.fileName || 'Clinic not listed',
    date: prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '',
    status,
    medicines: (prescription.medicines || []).map((medicine) => ({
      name: medicine.medicineName,
      duration: medicine.duration || 'Not specified',
      instructions: [medicine.frequency, medicine.instructions].filter(Boolean).join(' · ') || 'No instructions recorded'
    })),
    diagnosis: prescription.diagnosis || 'Not recorded',
    notes: prescription.notes || ''
  };
};

export const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  const [diagnosisInput, setDiagnosisInput] = useState('');

  // View & Delete Modal States
  const [selectedRx, setSelectedRx] = useState(null);

  const filteredRx = prescriptions.filter(rx => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return rx.status === 'Active';
    if (activeTab === 'Pending verification') return rx.status === 'Pending verification';
    return rx.status === 'Completed' || rx.status === 'Verified';
  });

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const data = await api.get('/prescriptions/my', { requireAuth: true });
        setPrescriptions(data.map(mapPrescription));
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

    // Validate file type (PDF, JPG, PNG)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      setUploadErrorMsg('Invalid file format. Please upload a PDF, JPG, or PNG file.');
      setSelectedFile(null);
      return;
    }

    // The backend upload limit defaults to 5MB.
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrorMsg('File size exceeds the 5MB upload limit. Please select a smaller file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile({
      raw: file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: extension.toUpperCase()
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

    try {
      const prescription = await api.post('/prescriptions/upload', formData, { requireAuth: true });
      setPrescriptions((previous) => [mapPrescription(prescription), ...previous]);
      setUploadSuccessMsg(`Prescription "${selectedFile.name}" successfully uploaded and saved!`);
      setSelectedFile(null);
      setDiagnosisInput('');
    } catch (error) {
      setUploadErrorMsg(error.message || 'Unable to upload this prescription.');
    } finally {
      setIsUploading(false);
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
            <CheckCircle2 size={18} />
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
          {/* Drag & Drop File Zone */}
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

          {/* Selected File Preview Box */}
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

          {/* Upload Progress Bar */}
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

      {/* Tabs for Previous Prescriptions */}
      <div style={{ margin: '2rem 0 1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
          Previous Prescriptions ({filteredRx.length})
        </h3>
        <div className="category-chips">
          {['All', 'Active', 'Pending verification', 'Completed'].map(tab => (
            <button
              key={tab}
              className={`chip ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="prescriptions-list">
        {isLoading ? <p role="status">Loading prescriptions...</p> : filteredRx.map(rx => (
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
                  <h3 className="rx-doc-name">{rx.doctorName}</h3>
                  <p className="rx-doc-sub">{rx.specialty} • {rx.clinicName}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={`badge ${rx.status === 'Active' || rx.status === 'Verified' ? 'badge-success' : 'badge-neutral'}`}>
                  {rx.status}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {rx.date}
                </span>
              </div>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--neutral-800)', marginBottom: '0.65rem' }}>
                Diagnosis: <strong>{rx.diagnosis}</strong>
              </p>

              <table className="rx-meds-table">
                <thead>
                  <tr>
                    <th>Medication Name</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.length ? rx.medicines.map((med, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '700', color: 'var(--neutral-900)' }}>{med.name}</td>
                      <td>{med.duration}</td>
                      <td style={{ color: 'var(--primary-700)', fontWeight: '600' }}>{med.instructions}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3">{rx.fileName || 'No medicine details recorded for this document.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                Notes: "{rx.notes}"
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <Button variant="outline" size="sm" icon={Eye} onClick={() => setSelectedRx(rx)}>
                View Prescription
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* View Detail Modal */}
      {selectedRx && (
        <Modal
          isOpen={Boolean(selectedRx)}
          onClose={() => setSelectedRx(null)}
          title={`Prescription Record: ${selectedRx.code}`}
          subtitle={`${selectedRx.doctorName} • ${selectedRx.date}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--neutral-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Record Source</p>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedRx.clinicName}</p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem' }}>Prescribed Items</h4>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {selectedRx.medicines.map((med, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    <strong>{med.name}</strong> — {med.instructions} ({med.duration})
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.35rem' }}>Doctor Notes</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)' }}>{selectedRx.notes}</p>
            </div>

            <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
              <Button variant="outline" onClick={() => setSelectedRx(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
