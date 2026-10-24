import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import './auth.css';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bloodGroup: 'O+',
    age: '28',
    emergencyContact: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register({
        ...formData,
        role: 'patient',
        phone: formData.emergencyContact,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container fade-in">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-brand">
          <div className="brand-logo">
            <Stethoscope size={28} />
          </div>
          <span className="brand-name" style={{ fontSize: '1.6rem' }}>
            MediCare<span className="brand-plus">+</span>
          </span>
        </div>

        <h2 className="auth-title">Create Health Account</h2>
        <p className="auth-subtitle">Join MediCare+ to track medicines, vitals & AI healthcare</p>

        {error && <div className="auth-error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Alex Morgan"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="alex@example.com"
              required
            />
          </div>

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
              placeholder="+1 (555) 019-2831"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Create Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            icon={ArrowRight}
            iconPosition="right"
          >
            Create My MediCare+ Account
          </Button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};
