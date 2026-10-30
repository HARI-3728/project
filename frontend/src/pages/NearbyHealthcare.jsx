import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin, Phone, Clock, Search, X,
  Building2, Pill, Filter, Ambulance,
} from 'lucide-react';
import { nearbyPharmacies } from '../data/nearbyHealthcareData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import './pages.css';

const mapHospital = (hospital) => ({
  id: `hospital-${hospital._id}`,
  name: hospital.hospitalName,
  category: 'Hospital',
  type: hospital.type || 'Healthcare Facility',
  address: [
    hospital.address?.street,
    hospital.address?.city,
    hospital.address?.state,
    hospital.address?.pincode,
    hospital.address?.country,
  ].filter(Boolean).join(', ') || 'Address not provided',
  phone: hospital.phone || hospital.user?.phone || '',
  hours: hospital.operatingHours?.open && hospital.operatingHours?.close
    ? `${hospital.operatingHours.open}–${hospital.operatingHours.close}`
    : 'Hours not listed',
  services: [...(hospital.departments || []), ...(hospital.facilities || [])],
  image: hospital.logo || null,
  isDemo: hospital.registrationNumber?.startsWith('DEMO-') || false,
});

export const NearbyHealthcare = () => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedFacility, setSelectedFacility] = useState(null);

  useEffect(() => {
    api.get('/hospital?page=1&limit=100')
      .then((data) => setHospitals(data.map(mapHospital)))
      .catch((error) => setLoadError(error.message || 'Unable to load hospital directory.'))
      .finally(() => setIsLoading(false));
  }, []);

  const demoPharmacies = useMemo(() => nearbyPharmacies.map((facility) => ({
    ...facility,
    isDemo: true,
  })), []);
  const allFacilities = useMemo(() => [...hospitals, ...demoPharmacies], [hospitals, demoPharmacies]);
  const categories = [
    { key: 'all', label: 'All Facilities', icon: Building2, count: allFacilities.length },
    { key: 'hospital', label: 'Hospitals', icon: Building2, count: hospitals.length },
    { key: 'pharmacy', label: 'Pharmacies', icon: Pill, count: demoPharmacies.length },
  ];

  // Filter + sort logic
  const filteredFacilities = useMemo(() => {
    let results = [...allFacilities];

    // Category filter
    if (activeCategory === 'hospital') {
      results = results.filter(f => f.category === 'Hospital');
    } else if (activeCategory === 'pharmacy') {
      results = results.filter(f => f.category === 'Pharmacy');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.services.some(s => s.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [allFacilities, searchQuery, activeCategory, sortBy]);

  const clearSearch = () => setSearchQuery('');

  return (
    <div className="nearby-page fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Nearby Healthcare</h2>
          <p className="page-subtitle">
            Browse the hospital directory and fictional pharmacy examples; live location is unavailable.
          </p>
        </div>
        <a href="tel:112" className="nearby-emergency-btn">
          <Ambulance size={18} />
          <span>Emergency: 112</span>
        </a>
      </div>

      {/* Stats Summary Bar */}
      <div className="nearby-stats-bar">
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <Building2 size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">{isLoading ? '…' : hospitals.length}</span>
            <span className="nearby-stat-label">Hospitals</span>
          </div>
        </div>
        <div className="nearby-stats-divider" />
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Pill size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">{demoPharmacies.length}</span>
            <span className="nearby-stat-label">Demo pharmacies</span>
          </div>
        </div>
        <div className="nearby-stats-divider" />
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <MapPin size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">Unavailable</span>
            <span className="nearby-stat-label">Live status</span>
          </div>
        </div>
      </div>
      <div className="upload-alert info" role="note">
        Hospital details are loaded from the directory. Pharmacy cards are fictional demonstration examples; distance, live availability, booking, and delivery are not connected.
      </div>
      {loadError && <div className="upload-alert error" role="alert">{loadError}</div>}

      {/* Category Tabs */}
      <div className="nearby-category-tabs">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              className={`nearby-cat-tab ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
              <span className="nearby-cat-count">{cat.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Filters Bar */}
      <div className="nearby-filter-bar">
        <div className="nearby-search-wrapper">
          <Search size={18} className="nearby-search-icon" />
          <input
            type="text"
            className="nearby-search-input"
            placeholder="Search by name, type, service, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="nearby-search-clear" onClick={clearSearch}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="nearby-filter-controls">
          <div className="nearby-filter-select-group">
            <Filter size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="nearby-filter-select"
            >
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="nearby-results-meta">
        <span className="nearby-results-count">
          Showing <strong>{filteredFacilities.length}</strong> {filteredFacilities.length === 1 ? 'facility' : 'facilities'}
          {searchQuery && <> matching "<em>{searchQuery}</em>"</>}
        </span>
      </div>

      {/* Facilities Grid */}
      {isLoading ? (
        <p role="status">Loading hospital directory…</p>
      ) : filteredFacilities.length > 0 ? (
        <div className="nearby-facilities-grid">
          {filteredFacilities.map((facility, index) => (
            <Card
              key={facility.id}
              className="nearby-facility-card"
              hoverable
              padding="none"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {/* Image Section */}
              <div className="nearby-card-img-wrapper">
                {facility.image
                  ? <img src={facility.image} alt={facility.name} loading="lazy" />
                  : <div className="nearby-placeholder-image"><Building2 size={44} /></div>}
                <div className="nearby-card-img-overlay">
                  {facility.isDemo && <span className="nearby-badge-24x7">DEMO DATA</span>}
                </div>
                <div className="nearby-card-category-badge">
                  {facility.category === 'Hospital' ? <Building2 size={12} /> : <Pill size={12} />}
                  {facility.type}
                </div>
              </div>

              {/* Content Section */}
              <div className="nearby-card-body">
                <div className="nearby-card-header-row">
                  <h3 className="nearby-card-title">{facility.name}</h3>
                </div>

                <div className="nearby-card-info-row">
                  <MapPin size={14} />
                  <span>{facility.address}</span>
                </div>
                <div className="nearby-card-info-row">
                  <Clock size={14} />
                  <span>{facility.hours}</span>
                </div>
                {facility.phone && (
                  <div className="nearby-card-info-row">
                    <Phone size={14} />
                    <span>{facility.phone}</span>
                  </div>
                )}

                {/* Services Tags */}
                <div className="nearby-card-services">
                  {facility.services.slice(0, 3).map((srv, idx) => (
                    <span key={idx} className="nearby-service-tag">{srv}</span>
                  ))}
                  {facility.services.length > 3 && (
                    <span className="nearby-service-tag more">+{facility.services.length - 3}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="nearby-card-actions">
                  {facility.phone && (
                    <a href={`tel:${facility.phone}`} className="nearby-action-link">
                      <Button variant="outline" size="sm" icon={Phone} style={{ width: '100%' }}>
                        Call
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    icon={facility.category === 'Hospital' ? Building2 : Pill}
                    style={{ flex: 1 }}
                    onClick={() => setSelectedFacility(facility)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No Facilities Found"
          description={`No results for "${searchQuery || activeCategory}". Try adjusting your search or category.`}
          actionText="Clear Filters"
          onAction={() => { setSearchQuery(''); setActiveCategory('all'); }}
          actionIcon={X}
        />
      )}

      {/* Facility details */}
      {selectedFacility && (
        <Modal
          isOpen={Boolean(selectedFacility)}
          onClose={() => setSelectedFacility(null)}
          title={selectedFacility.name}
          subtitle={`${selectedFacility.type} · ${selectedFacility.address}`}
          maxWidth="580px"
        >
          <>
              {/* Modal Info Header */}
              <div className="nearby-modal-info">
                {selectedFacility.image
                  ? <img src={selectedFacility.image} alt={selectedFacility.name} className="nearby-modal-img" />
                  : <div className="nearby-modal-img nearby-placeholder-image"><Building2 size={44} /></div>}
                <div className="nearby-modal-meta-grid">
                  <div className="nearby-modal-meta-item">
                    <Clock size={14} style={{ color: 'var(--neutral-500)' }} />
                    <span>{selectedFacility.hours}</span>
                  </div>
                  {selectedFacility.phone && <div className="nearby-modal-meta-item">
                    <Phone size={14} style={{ color: 'var(--accent-blue)' }} />
                    <a href={`tel:${selectedFacility.phone}`} style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {selectedFacility.phone}
                    </a>
                  </div>}
                </div>

                <div className="nearby-modal-services-list">
                  <span className="nearby-modal-services-label">Available Services</span>
                  <div className="nearby-modal-services-tags">
                    {selectedFacility.services.map((srv, idx) => (
                      <span key={idx} className="nearby-service-tag">{srv}</span>
                    ))}
                  </div>
                </div>
              </div>
              {selectedFacility.isDemo && (
                <p className="upload-alert info" role="note">Fictional example only. No booking or inquiry has been submitted.</p>
              )}
              <div className="modal-footer" style={{ margin: '1.25rem -1.5rem -1.5rem -1.5rem' }}>
                <Button variant="outline" onClick={() => setSelectedFacility(null)}>Close</Button>
                {selectedFacility.phone && (
                  <a href={`tel:${selectedFacility.phone}`}>
                    <Button variant="primary" icon={Phone}>Call facility</Button>
                  </a>
                )}
              </div>
          </>
        </Modal>
      )}
    </div>
  );
};
