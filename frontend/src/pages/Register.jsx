import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  ArrowRight,
  User,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import './auth.css';

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Orthopedist',
  'Endocrinologist',
  'Pediatrician',
  'Gynecologist & Obstetrician',
  'Neurologist',
  'Psychiatrist',
  'ENT Specialist',
  'Ophthalmologist',
];

const HOSPITAL_TYPES = [
  { value: 'private', label: 'Private Multispecialty Hospital' },
  { value: 'clinic', label: 'Specialty Clinic' },
  { value: 'diagnostic_centre', label: 'Diagnostic & Pathology Centre' },
  { value: 'pharmacy', label: '24/7 Pharmacy & Wellness' },
  { value: 'government', label: 'Government / Public Hospital' },
];

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = ['patient', 'doctor', 'hospital'].includes(searchParams.get('role'))
    ? searchParams.get('role')
    : 'patient';

  const [activeRole, setActiveRole] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // Patient specific
    bloodGroup: 'O+',
    age: '28',
    emergencyContact: '',
    // Doctor specific
    specialization: 'General Physician',
    registrationNumber: '',
    experience: '5',
    // Hospital specific
    hospitalName: '',
    hospitalType: 'private',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: activeRole,
        phone: (formData.phone || formData.emergencyContact).trim(),
      };

      if (activeRole === 'patient') {
        payload.bloodGroup = formData.bloodGroup;
        payload.age = formData.age;
        payload.emergencyContact = formData.emergencyContact.trim();
      } else if (activeRole === 'doctor') {
        payload.specialization = formData.specialization;
        payload.registrationNumber = formData.registrationNumber.trim();
        payload.experience = Number(formData.experience) || 0;
      } else if (activeRole === 'hospital') {
        payload.hospitalName = formData.hospitalName.trim();
        payload.hospitalType = formData.hospitalType;
        payload.registrationNumber = formData.registrationNumber.trim();
      }

      const nextUser = await register(payload);
      const actualRole = nextUser?.role || activeRole;

      if (actualRole === 'doctor') navigate('/doctor', { replace: true });
      else if (actualRole === 'hospital') navigate('/hospital', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check the form and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container fade-in">
      <div className="auth-card" style={{ maxWidth: '540px', width: '100%' }}>
        <div className="auth-brand">
          <div className="brand-logo">
            <Stethoscope size={28} />
          </div>
          <span className="brand-name" style={{ fontSize: '1.6rem' }}>
            MediCare<span className="brand-plus">+</span>
          </span>
        </div>

        {/* 3 Role Selection Tabs */}
        <div className="auth-role-tabs" role="tablist" aria-label="Registration Role Selection">
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'patient'}
            className={`auth-role-tab ${activeRole === 'patient' ? 'active' : ''}`}
            onClick={() => handleRoleChange('patient')}
          >
            <User size={18} />
            <span className="role-tab-label">Patient</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'doctor'}
            className={`auth-role-tab ${activeRole === 'doctor' ? 'active' : ''}`}
            onClick={() => handleRoleChange('doctor')}
          >
            <Stethoscope size={18} />
            <span className="role-tab-label">Doctor</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'hospital'}
            className={`auth-role-tab ${activeRole === 'hospital' ? 'active' : ''}`}
            onClick={() => handleRoleChange('hospital')}
          >
            <Building2 size={18} />
            <span className="role-tab-label">Hospital</span>
          </button>
        </div>

        <div className="auth-header-wrapper">
          <span className="role-access-pill">
            {activeRole === 'doctor' ? 'Physician Registration' : activeRole === 'hospital' ? 'Facility Registration' : 'Patient Registration'}
          </span>
          <h2 className="auth-title">
            {activeRole === 'doctor' ? 'Join as Doctor' : activeRole === 'hospital' ? 'Register Facility' : 'Create Health Account'}
          </h2>
          <p className="auth-subtitle">
            {activeRole === 'doctor'
              ? 'Join our medical network to manage appointments & write verifiable prescriptions'
              : activeRole === 'hospital'
              ? 'Register hospital or clinic to streamline pharmacy orders and patient billing'
              : 'Join MediCare+ to track medicines, vitals, prescriptions & AI healthcare'}
          </p>
        </div>

        {error && (
          <div className="auth-error-message" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Security / Verification Notices for privileged roles */}
        {activeRole === 'doctor' && (
          <div className="auth-security-notice">
            <ShieldAlert size={18} className="security-notice-icon" />
            <p>
              <strong>Administrative Verification:</strong> Doctor profiles are created with unverified status (<code>isVerified: false</code>). Public appointments become available after credential validation by hospital administrators.
            </p>
          </div>
        )}

        {activeRole === 'hospital' && (
          <div className="auth-security-notice">
            <ShieldAlert size={18} className="security-notice-icon" />
            <p>
              <strong>Institutional Compliance:</strong> Hospital accounts are registered in the MediCare+ network with audit tracking for pharmacy orders and patient invoices.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Common Full Name or Administrator Name */}
          <div className="form-group">
            <label htmlFor="name">
              {activeRole === 'doctor' ? 'Doctor Full Name' : activeRole === 'hospital' ? 'Administrator Full Name' : 'Full Name'}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder={activeRole === 'doctor' ? 'Dr. Sarah Connor, MD' : activeRole === 'hospital' ? 'Dr. John Sterling (Chief Medical Officer)' : 'Alex Morgan'}
              autoComplete="name"
              required
            />
          </div>

          {/* Hospital Name (if hospital) */}
          {activeRole === 'hospital' && (
            <div className="form-group">
              <label htmlFor="hospitalName">Hospital / Clinic / Center Name</label>
              <input
                id="hospitalName"
                name="hospitalName"
                type="text"
                className="form-input"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="e.g. Metro Care Superspecialty Hospital"
                required
              />
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">
              {activeRole === 'hospital' ? 'Facility Work Email' : activeRole === 'doctor' ? 'Doctor Work Email' : 'Email Address'}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder={activeRole === 'doctor' ? 'dr.sarah@medicare.com' : activeRole === 'hospital' ? 'admin@metrohospital.org' : 'alex@example.com'}
              autoComplete="username"
              required
            />
          </div>

          {/* Doctor-Specific Fields */}
          {activeRole === 'doctor' && (
            <>
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="specialization">Medical Specialization</label>
                  <select
                    id="specialization"
                    name="specialization"
                    className="form-input"
                    value={formData.specialization}
                    onChange={handleChange}
                    required
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="experience">Years of Experience</label>
                  <input
                    id="experience"
                    name="experience"
                    type="number"
                    min="0"
                    max="60"
                    className="form-input"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="8"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="registrationNumber">Medical Registration No.</label>
                  <input
                    id="registrationNumber"
                    name="registrationNumber"
                    type="text"
                    className="form-input"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. MCI-2024-9988"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Contact Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Hospital-Specific Fields */}
          {activeRole === 'hospital' && (
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="hospitalType">Facility Type</label>
                <select
                  id="hospitalType"
                  name="hospitalType"
                  className="form-input"
                  value={formData.hospitalType}
                  onChange={handleChange}
                  required
                >
                  {HOSPITAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="registrationNumber">Facility License No.</label>
                <input
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  className="form-input"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="e.g. HOSP-2024-DEL-01"
                  required
                />
              </div>
            </div>
          )}

          {/* Patient-Specific Fields */}
          {activeRole === 'patient' && (
            <>
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group</label>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    className="form-input"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    className="form-input"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="28"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="emergencyContact">Emergency Contact Phone</label>
                <input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="tel"
                  className="form-input"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                />
              </div>
            </>
          )}

          {/* Hospital Contact Phone (if hospital) */}
          {activeRole === 'hospital' && (
            <div className="form-group">
              <label htmlFor="phone">Facility Official Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 11 2345 6789"
                autoComplete="tel"
                required
              />
            </div>
          )}

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Create Password (min. 8 characters)</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input password-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            icon={ArrowRight}
            iconPosition="right"
          >
            Register as {activeRole === 'doctor' ? 'Doctor' : activeRole === 'hospital' ? 'Hospital' : 'Patient'}
          </Button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};
