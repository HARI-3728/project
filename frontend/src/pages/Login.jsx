import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import './auth.css';

export const Login = () => {
  const [email, setEmail] = useState('alex.morgan@example.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await login('alex.morgan@example.com', 'password123');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed. Please confirm the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container fade-in">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo">
            <Stethoscope size={28} />
          </div>
          <span className="brand-name" style={{ fontSize: '1.6rem' }}>
            MediCare<span className="brand-plus">+</span>
          </span>
        </div>

        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Log in to manage your health, prescriptions & reminders</p>

        {error && <div className="auth-error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
            Sign In to Dashboard
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDemoLogin}
            icon={ShieldCheck}
          >
            Instant Demo Account Sign In
          </Button>
        </form>

        <p className="auth-footer-link">
          Don't have a MediCare+ account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};
