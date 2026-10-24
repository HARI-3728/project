import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Pill,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RotateCcw,
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { EDUCATIONAL_DISCLAIMER } from '../data/medicinesData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { mapMedicine } from '../lib/medicines';
import './pages.css';

export const Medicines = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedManufacturer, setSelectedManufacturer] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [selectedRx, setSelectedRx] = useState('All');

  const [medicinesList, setMedicinesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const categories = useMemo(() => {
    return ['All', ...new Set(medicinesList.map(m => m.category).filter(Boolean))];
  }, [medicinesList]);

  const manufacturers = useMemo(() => {
    return ['All', ...new Set(medicinesList.map(m => m.manufacturer).filter(Boolean))];
  }, [medicinesList]);

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const data = await api.get('/medicines?page=1&limit=20');
        setMedicinesList(data.map(mapMedicine));
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load the medicine catalog.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMedicines();
  }, []);

  // Multi-criteria Filter Pipeline
  const filteredMedicines = useMemo(() => {
    return medicinesList.filter(med => {
      // 1. Search Query (name, manufacturer, category)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        med.name.toLowerCase().includes(q) ||
        (med.manufacturer || '').toLowerCase().includes(q) ||
        med.category.toLowerCase().includes(q)
      );

      // 2. Category Filter
      const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;

      // 3. Manufacturer Filter
      const matchesManufacturer = selectedManufacturer === 'All' || med.manufacturer === selectedManufacturer;

      // 4. Price Filter
      let matchesPrice = true;
      if (selectedPriceRange === 'under50') matchesPrice = med.price < 50;
      else if (selectedPriceRange === '50to100') matchesPrice = med.price >= 50 && med.price <= 100;
      else if (selectedPriceRange === 'above100') matchesPrice = med.price > 100;

      // 5. Availability Filter
      let matchesAvailability = true;
      if (selectedAvailability === 'In Stock') matchesAvailability = med.stockStatus === 'In Stock';
      else if (selectedAvailability === 'Low Stock') matchesAvailability = med.stockStatus === 'Low Stock';
      else if (selectedAvailability === 'Out of Stock') matchesAvailability = med.stockStatus === 'Out of Stock';

      // 6. Prescription Filter
      let matchesRx = true;
      if (selectedRx === 'rx') matchesRx = med.prescriptionRequired === true;
      else if (selectedRx === 'otc') matchesRx = med.prescriptionRequired === false;

      return matchesSearch && matchesCategory && matchesManufacturer && matchesPrice && matchesAvailability && matchesRx;
    });
  }, [searchQuery, selectedCategory, selectedManufacturer, selectedPriceRange, selectedAvailability, selectedRx, medicinesList]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedManufacturer('All');
    setSelectedPriceRange('All');
    setSelectedAvailability('All');
    setSelectedRx('All');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'All' || selectedManufacturer !== 'All' ||
    selectedPriceRange !== 'All' || selectedAvailability !== 'All' || selectedRx !== 'All';

  return (
    <div className="medicines-page fade-in">
      {/* Educational Disclaimer Banner */}
      <div className="educational-disclaimer-banner">
        <ShieldAlert size={20} className="disclaimer-icon" />
        <p>{EDUCATIONAL_DISCLAIMER}</p>
      </div>

      <div className="page-header">
        <div>
          <h2 className="page-title">Medicine Catalog ({filteredMedicines.length} of {medicinesList.length})</h2>
          <p className="page-subtitle">Search and filter the configured medicine catalog</p>
        </div>
      </div>
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="medicine-filter-panel">
        <div className="search-filter-row">
          <div className="navbar-search flex-1">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by medicine name, manufacturer, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" icon={RotateCcw} onClick={resetAllFilters}>
              Reset Filters
            </Button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="filter-controls-grid">
          {/* Category Filter */}
          <div className="filter-select-group">
            <label><Tag size={14} /> Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-input"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="filter-select-group">
            <label><Building2 size={14} /> Manufacturer</label>
            <select
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              className="form-input"
            >
              {manufacturers.map(manufacturer => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
              ))}
            </select>
          </div>

          {/* Price Filter */}
          <div className="filter-select-group">
            <label>Price Range</label>
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="form-input"
            >
              <option value="All">All Prices</option>
              <option value="under50">Under ₹50</option>
              <option value="50to100">₹50–₹100</option>
              <option value="above100">Above ₹100</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div className="filter-select-group">
            <label>Availability / Stock</label>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="form-input"
            >
              <option value="All">All Stock Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Prescription Required Filter */}
          <div className="filter-select-group">
            <label><FileText size={14} /> Prescription</label>
            <select
              value={selectedRx}
              onChange={(e) => setSelectedRx(e.target.value)}
              className="form-input"
            >
              <option value="All">All Types</option>
              <option value="rx">Prescription Required (Rx)</option>
              <option value="otc">Over-The-Counter (OTC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicines Grid */}
      {isLoading ? <p role="status">Loading medicine catalog...</p> : filteredMedicines.length > 0 ? (
        <div className="medicines-grid">
          {filteredMedicines.map(med => (
            <Card
              key={med.id}
              className="med-card"
              hoverable
              onClick={() => navigate(`/medicines/${med.id}`)}
            >
              <div className="med-card-img-wrapper">
                {med.image ? <img src={med.image} alt={med.name} /> : (
                  <div className="med-image-placeholder" aria-label="No medicine image available">
                    <Pill size={36} />
                  </div>
                )}

                {/* Stock Status Badge */}
                <span className={`badge med-stock-badge ${
                  med.stockStatus === 'In Stock' ? 'badge-success' :
                  med.stockStatus === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {med.stockStatus === 'In Stock' && <CheckCircle2 size={12} />}
                  {med.stockStatus === 'Low Stock' && <AlertTriangle size={12} />}
                  {med.stockStatus === 'Out of Stock' && <XCircle size={12} />}
                  {med.stockStatus}
                </span>

                {/* Rx Badge */}
                <span className={`badge med-rx-badge ${med.prescriptionRequired ? 'badge-danger' : 'badge-info'}`}>
                  {med.prescriptionRequired ? 'Rx Required' : 'OTC Available'}
                </span>
              </div>

              <div className="med-card-content">
                <div>
                  <h3 className="med-title">{med.name}</h3>
                  <p className="med-brand">{med.manufacturer || 'Manufacturer not listed'}</p>

                  <p className="med-desc-snippet">
                    {med.generalDescription}
                  </p>
                </div>

                <div className="med-card-footer">
                  <div>
                    <span className="med-price">{med.formattedPrice}</span>
                    <span className="med-form"> ({med.form})</span>
                  </div>

                  <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">
                    Details & Alternatives
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title="No Medicines Match Filter"
          description="We couldn't find any medicine matching your active search query and filter criteria."
          actionText="Reset All Filters"
          onAction={resetAllFilters}
        />
      )}

    </div>
  );
};
