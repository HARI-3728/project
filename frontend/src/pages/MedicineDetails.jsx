import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  FileText,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  Pill
} from 'lucide-react';
import { EDUCATIONAL_DISCLAIMER } from '../data/medicinesData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { mapMedicine } from '../lib/medicines';
import './pages.css';

export const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [medicine, setMedicine] = useState(null);
  const [alternativeMedicines, setAlternativeMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadMedicine = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [medicineData, catalog] = await Promise.all([
          api.get(`/medicines/${encodeURIComponent(id)}`),
          api.get('/medicines?page=1&limit=20')
        ]);
        const selectedMedicine = mapMedicine(medicineData);
        setMedicine(selectedMedicine);
        setAlternativeMedicines(
          catalog
            .map(mapMedicine)
            .filter((item) => item.category === selectedMedicine.category && item.id !== selectedMedicine.id)
        );
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load this medicine.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMedicine();
  }, [id]);

  if (!medicine) {
    if (isLoading) return <p role="status">Loading medicine details...</p>;
    return (
      <ErrorState
        title="Medicine Record Not Found"
        message={errorMessage || 'The requested medicine could not be found in the catalog.'}
        onRetry={() => navigate('/medicines')}
      />
    );
  }

  return (
    <div className="medicine-details-page fade-in">
      <div style={{ marginBottom: '1.25rem' }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/medicines')}>
          Back to Medicine Catalog
        </Button>
      </div>

      {/* Educational Disclaimer Box */}
      <div className="educational-disclaimer-box">
        <div className="disclaimer-header">
          <ShieldAlert size={20} />
          <span>Educational Prototype Disclaimer</span>
        </div>
        <p>{EDUCATIONAL_DISCLAIMER}</p>
      </div>

      {/* Main Details Grid */}
      <div className="details-container">
        {/* Left Column Image & Badges */}
        <Card className="details-image-card">
          {medicine.image ? (
            <img src={medicine.image} alt={medicine.name} className="details-img" />
          ) : (
            <div className="details-image-placeholder" aria-label="No medicine image available">
              <Pill size={56} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', justifyContent: 'center' }}>
            <span className="badge badge-success">{medicine.category}</span>
            <span className={`badge ${medicine.prescriptionRequired ? 'badge-danger' : 'badge-info'}`}>
              {medicine.prescriptionRequired ? 'Rx Required' : 'OTC Available'}
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
            {medicine.name}
          </h2>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Manufacturer: <strong>{medicine.manufacturer || 'Not listed'}</strong> • {medicine.form}
          </p>

          <div className="details-price-badge">
            <span className="price-val">{medicine.formattedPrice}</span>
            <span className="stock-val">
              Stock Status: <strong>{medicine.stockStatus}</strong> ({medicine.stockCount} units)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1.5rem' }}>
            <Button variant="primary" icon={RefreshCw} onClick={() => navigate('/prescriptions')}>
              Manage Prescriptions
            </Button>
            <Button variant="outline" icon={Sparkles} onClick={() => navigate('/ai-assistant')}>
              Ask MediCare AI About This Medicine
            </Button>
          </div>
        </Card>

        {/* Right Column Specifications */}
        <div className="details-main-info">
          {/* Key Specifications Grid */}
          <div className="info-section">
            <h3 className="info-section-title">
              <Info className="text-primary" size={20} />
              Pharmaceutical Specifications
            </h3>

            <div className="specifications-grid">
              <div className="spec-item">
                <span className="spec-label">Medicine Name:</span>
                <span className="spec-value">{medicine.name}</span>
              </div>

              <div className="spec-item">
                <span className="spec-label">Manufacturer:</span>
                <span className="spec-value">{medicine.manufacturer || 'Not listed'}</span>
              </div>

              <div className="spec-item">
                <span className="spec-label">Therapeutic Category:</span>
                <span className="spec-value">{medicine.category}</span>
              </div>

              <div className="spec-item">
                <span className="spec-label">Retail Price:</span>
                <span className="spec-value">{medicine.formattedPrice}</span>
              </div>

              <div className="spec-item">
                <span className="spec-label">Stock Status:</span>
                <span className={`badge ${
                  medicine.stockStatus === 'In Stock' ? 'badge-success' :
                  medicine.stockStatus === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {medicine.stockStatus} ({medicine.stockCount} left)
                </span>
              </div>

              <div className="spec-item">
                <span className="spec-label">Prescription Needed:</span>
                <span className={`badge ${medicine.prescriptionRequired ? 'badge-danger' : 'badge-info'}`}>
                  {medicine.prescriptionRequired ? 'Yes (Doctor Prescription Required)' : 'No (Over-The-Counter)'}
                </span>
              </div>
            </div>
          </div>

          {/* General Description */}
          <div className="info-section">
            <h3 className="info-section-title">
              <FileText className="text-primary" size={20} />
              General Description & Indications
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--neutral-800)', lineHeight: '1.6' }}>
              {medicine.generalDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Other medicines in this category */}
      <div className="alternatives-section">
        <div className="section-header-row" style={{ marginTop: '2.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Other Medicines in This Category</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              These are catalog items in the {medicine.category} category, not therapeutic substitutes.
            </p>
          </div>
        </div>

        {alternativeMedicines.length > 0 ? (
          <div className="alternatives-grid">
            {alternativeMedicines.map(alt => (
              <Card key={alt.id} className="alt-med-card" hoverable onClick={() => navigate(`/medicines/${alt.id}`)}>
                <div className="alt-med-img-wrapper">
                  {alt.image ? <img src={alt.image} alt={alt.name} /> : <Pill size={32} aria-label="No image" />}
                </div>
                <div className="alt-med-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>{alt.manufacturer || 'Manufacturer not listed'}</span>
                    <span className="alt-price">{alt.formattedPrice}</span>
                  </div>
                  <h4 className="alt-title">{alt.name}</h4>
                  <p className="alt-desc">{alt.generalDescription}</p>

                  <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px dashed var(--border-subtle)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No other catalog medicines are listed in this category.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
