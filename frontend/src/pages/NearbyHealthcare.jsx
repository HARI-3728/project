import React, { useState, useMemo } from 'react';
import {
  MapPin, Phone, Star, Clock, Navigation, Search, X,
  Building2, Pill, Filter, ChevronRight, Ambulance,
  ShieldCheck, Truck, Calendar, BadgeCheck
} from 'lucide-react';
import { nearbyHospitals, nearbyPharmacies, allNearbyFacilities } from '../data/nearbyHealthcareData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import './pages.css';

const CATEGORIES = [
  { key: 'all', label: 'All Facilities', icon: Building2, count: allNearbyFacilities.length },
  { key: 'hospital', label: 'Hospitals', icon: Building2, count: nearbyHospitals.length },
  { key: 'pharmacy', label: 'Pharmacies', icon: Pill, count: nearbyPharmacies.length },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Any Status' },
  { key: 'open', label: 'Open Now' },
  { key: 'closed', label: 'Currently Closed' },
];

const SORT_OPTIONS = [
  { key: 'distance', label: 'Nearest First' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'name', label: 'Name (A-Z)' },
];

export const NearbyHealthcare = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Filter + sort logic
  const filteredFacilities = useMemo(() => {
    let results = [...allNearbyFacilities];

    // Category filter
    if (activeCategory === 'hospital') {
      results = results.filter(f => f.category === 'Hospital');
    } else if (activeCategory === 'pharmacy') {
      results = results.filter(f => f.category === 'Pharmacy');
    }

    // Status filter
    if (statusFilter === 'open') {
      results = results.filter(f => f.isOpen);
    } else if (statusFilter === 'closed') {
      results = results.filter(f => !f.isOpen);
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
    if (sortBy === 'distance') {
      results.sort((a, b) => a.distanceValue - b.distanceValue);
    } else if (sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [searchQuery, activeCategory, statusFilter, sortBy]);

  const openCount = filteredFacilities.filter(f => f.isOpen).length;

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedFacility(null);
    }, 1500);
  };

  const clearSearch = () => setSearchQuery('');

  return (
    <div className="nearby-page fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Nearby Healthcare</h2>
          <p className="page-subtitle">
            Find hospitals, clinics, and pharmacies near you
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
            <span className="nearby-stat-value">{nearbyHospitals.length}</span>
            <span className="nearby-stat-label">Hospitals</span>
          </div>
        </div>
        <div className="nearby-stats-divider" />
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Pill size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">{nearbyPharmacies.length}</span>
            <span className="nearby-stat-label">Pharmacies</span>
          </div>
        </div>
        <div className="nearby-stats-divider" />
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">{openCount}</span>
            <span className="nearby-stat-label">Open Now</span>
          </div>
        </div>
        <div className="nearby-stats-divider" />
        <div className="nearby-stat-item">
          <div className="nearby-stat-icon" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <Navigation size={18} />
          </div>
          <div>
            <span className="nearby-stat-value">10 km</span>
            <span className="nearby-stat-label">Search Radius</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="nearby-category-tabs">
        {CATEGORIES.map(cat => {
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="nearby-filter-select"
            >
              {STATUS_FILTERS.map(sf => (
                <option key={sf.key} value={sf.key}>{sf.label}</option>
              ))}
            </select>
          </div>
          <div className="nearby-filter-select-group">
            <Navigation size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="nearby-filter-select"
            >
              {SORT_OPTIONS.map(so => (
                <option key={so.key} value={so.key}>{so.label}</option>
              ))}
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
      {filteredFacilities.length > 0 ? (
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
                <img src={facility.image} alt={facility.name} loading="lazy" />
                <div className="nearby-card-img-overlay">
                  <span className={`nearby-status-pill ${facility.isOpen ? 'open' : 'closed'}`}>
                    <span className="nearby-status-dot" />
                    {facility.isOpen ? 'Open' : 'Closed'}
                  </span>
                  {facility.is24x7 && (
                    <span className="nearby-badge-24x7">24/7</span>
                  )}
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
                  <div className="nearby-card-rating">
                    <Star size={14} />
                    <span>{facility.rating}</span>
                    <span className="nearby-rating-reviews">({facility.reviews})</span>
                  </div>
                </div>

                <div className="nearby-card-info-row">
                  <MapPin size={14} />
                  <span>{facility.address}</span>
                </div>
                <div className="nearby-card-info-row">
                  <Navigation size={14} />
                  <span>{facility.distance} away</span>
                </div>
                <div className="nearby-card-info-row">
                  <Clock size={14} />
                  <span>{facility.hours}</span>
                </div>

                {/* Services Tags */}
                <div className="nearby-card-services">
                  {facility.services.slice(0, 3).map((srv, idx) => (
                    <span key={idx} className="nearby-service-tag">{srv}</span>
                  ))}
                  {facility.services.length > 3 && (
                    <span className="nearby-service-tag more">+{facility.services.length - 3}</span>
                  )}
                </div>

                {/* Extra Info Row */}
                <div className="nearby-card-extras">
                  {facility.waitTime && facility.waitTime !== 'Closed' && (
                    <span className="nearby-extra-chip wait">
                      <Clock size={12} /> {facility.waitTime} wait
                    </span>
                  )}
                  {facility.hasDelivery && (
                    <span className="nearby-extra-chip delivery">
                      <Truck size={12} /> Delivery: {facility.deliveryTime}
                    </span>
                  )}
                  {facility.beds && (
                    <span className="nearby-extra-chip beds">
                      <BadgeCheck size={12} /> {facility.beds} beds
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="nearby-card-actions">
                  <a href={`tel:${facility.phone}`} className="nearby-action-link">
                    <Button variant="outline" size="sm" icon={Phone} style={{ width: '100%' }}>
                      Call Now
                    </Button>
                  </a>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={facility.category === 'Hospital' ? Calendar : ChevronRight}
                    style={{ flex: 1 }}
                    onClick={() => setSelectedFacility(facility)}
                  >
                    {facility.category === 'Hospital' ? 'Book Visit' : 'View Details'}
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
          description={`No results for "${searchQuery || activeCategory}". Try adjusting your search or filters.`}
          actionText="Clear Filters"
          onAction={() => { setSearchQuery(''); setActiveCategory('all'); setStatusFilter('all'); }}
          actionIcon={X}
        />
      )}

      {/* Facility Detail / Booking Modal */}
      {selectedFacility && (
        <Modal
          isOpen={Boolean(selectedFacility)}
          onClose={() => { setSelectedFacility(null); setBookingSuccess(false); }}
          title={selectedFacility.name}
          subtitle={`${selectedFacility.type} · ${selectedFacility.address}`}
          maxWidth="580px"
        >
          {bookingSuccess ? (
            <div className="nearby-booking-success">
              <div className="nearby-success-icon-box">
                <ShieldCheck size={42} />
              </div>
              <h3>
                {selectedFacility.category === 'Hospital'
                  ? 'Appointment Confirmed!'
                  : 'Request Submitted!'}
              </h3>
              <p>
                {selectedFacility.category === 'Hospital'
                  ? `Your visit at ${selectedFacility.name} has been reserved. Check your email for confirmation.`
                  : `Your inquiry for ${selectedFacility.name} has been received. A pharmacist will contact you shortly.`}
              </p>
            </div>
          ) : (
            <>
              {/* Modal Info Header */}
              <div className="nearby-modal-info">
                <img src={selectedFacility.image} alt={selectedFacility.name} className="nearby-modal-img" />
                <div className="nearby-modal-meta-grid">
                  <div className="nearby-modal-meta-item">
                    <Star size={14} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)' }} />
                    <span><strong>{selectedFacility.rating}</strong> ({selectedFacility.reviews} reviews)</span>
                  </div>
                  <div className="nearby-modal-meta-item">
                    <Navigation size={14} style={{ color: 'var(--primary-600)' }} />
                    <span>{selectedFacility.distance} away</span>
                  </div>
                  <div className="nearby-modal-meta-item">
                    <Clock size={14} style={{ color: 'var(--neutral-500)' }} />
                    <span>{selectedFacility.hours}</span>
                  </div>
                  <div className="nearby-modal-meta-item">
                    <Phone size={14} style={{ color: 'var(--accent-blue)' }} />
                    <a href={`tel:${selectedFacility.phone}`} style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {selectedFacility.phone}
                    </a>
                  </div>
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

              {/* Booking / Inquiry Form */}
              <form onSubmit={handleBookingSubmit} className="nearby-modal-form">
                {selectedFacility.category === 'Hospital' ? (
                  <>
                    <div className="form-group">
                      <label>Department / Specialty</label>
                      <select className="form-input">
                        {selectedFacility.services.map((s, idx) => (
                          <option key={idx} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Preferred Date</label>
                        <input type="date" className="form-input" defaultValue="2026-09-08" required />
                      </div>
                      <div className="form-group">
                        <label>Time Slot</label>
                        <select className="form-input">
                          <option value="09:00 AM">09:00 AM</option>
                          <option value="10:30 AM">10:30 AM</option>
                          <option value="02:00 PM">02:00 PM</option>
                          <option value="04:30 PM">04:30 PM</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Reason for Visit (Optional)</label>
                      <input type="text" className="form-input" placeholder="e.g. Annual checkup, follow-up..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Service Required</label>
                      <select className="form-input">
                        {selectedFacility.services.map((s, idx) => (
                          <option key={idx} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Prescription / Medicine Name</label>
                      <input type="text" className="form-input" placeholder="e.g. Amoxicillin 500mg, Metformin..." />
                    </div>
                    {selectedFacility.hasDelivery && (
                      <div className="nearby-delivery-note">
                        <Truck size={16} />
                        <span>Home delivery available — estimated {selectedFacility.deliveryTime}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="modal-footer" style={{ margin: '1.25rem -1.5rem -1.5rem -1.5rem' }}>
                  <Button variant="outline" onClick={() => setSelectedFacility(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {selectedFacility.category === 'Hospital' ? 'Confirm Booking' : 'Submit Inquiry'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};
