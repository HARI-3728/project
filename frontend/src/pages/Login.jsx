import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  User,
  Building2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import './auth.css';

const ROLE_CONFIG = {
  patient: {
    label: 'Patient Login',
    shortLabel: 'Patient',
    icon: User,
    title: 'Patient Portal',
    subtitle: 'Sign in to access your prescriptions, reminders & health records',
    demoEmail: 'patient@medicare.com',
    demoPassword: 'Password123!',
    dashboardPath: '/',
    badge: 'Patient Access',
  },
  doctor: {
    label: 'Doctor Login',
    shortLabel: 'Doctor',
    icon: Stethoscope,
    title: 'Doctor Portal',
    subtitle: 'Sign in to manage consultations, appointments & clinical records',
    demoEmail: 'doctor@medicare.com',
    demoPassword: 'Password123!',
    dashboardPath: '/doctor',
    badge: 'Physician Access',
  },
  hospital: {
    label: 'Hospital Login',
    shortLabel: 'Hospital',
    icon: Building2,
    title: 'Hospital Management',
    subtitle: 'Sign in to manage facility pharmacy orders, billing & inventory',
    demoEmail: 'hospital@medicare.com',
    demoPassword: 'Password123!',
    dashboardPath: '/hospital',
    badge: 'Facility Admin',
  },
};

export const Login = () => {
  const [activeRole, setActiveRole] = useState('patient');
  const [email, setEmail] = useState(ROLE_CONFIG.patient.demoEmail);
  const [password, setPassword] = useState(ROLE_CONFIG.patient.demoPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleNotice, setRoleNotice] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (roleKey) => {
    setActiveRole(roleKey);
    setError('');
    setRoleNotice('');
    setEmail(ROLE_CONFIG[roleKey].demoEmail);
    setPassword(ROLE_CONFIG[roleKey].demoPassword);
  };

  const getDashboardForRole = (role) => {
    if (role === 'doctor') return '/doctor';
    if (role === 'hospital') return '/hospital';
    return '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRoleNotice('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      const actualRole = loggedInUser?.role || 'patient';

      if (actualRole !== activeRole) {
        setRoleNotice(
          `Logged in successfully as a ${actualRole}. Redirecting to your ${actualRole} dashboard...`
        );
      }

      const destination = getDashboardForRole(actualRole);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setRoleNotice('');
    setIsLoading(true);

    const config = ROLE_CONFIG[activeRole];
    try {
      const loggedInUser = await login(config.demoEmail, config.demoPassword);
      const actualRole = loggedInUser?.role || activeRole;
      const destination = getDashboardForRole(actualRole);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || `Demo login for ${config.shortLabel} failed. Please confirm the backend is reachable.`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentConfig = ROLE_CONFIG[activeRole];

  return (
    <div className="auth-page-container fade-in">
      <div className="auth-card" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="auth-brand">
          <div className="brand-logo">
            <Stethoscope size={28} />
          </div>
          <span className="brand-name" style={{ fontSize: '1.6rem' }}>
            MediCare<span className="brand-plus">+</span>
          </span>
        </div>

        {/* 3 Clear Role Selector Options */}
        <div className="auth-role-tabs" role="tablist" aria-label="Login Role Selection">
          {Object.entries(ROLE_CONFIG).map(([roleKey, conf]) => {
            const Icon = conf.icon;
            const isSelected = activeRole === roleKey;
            return (
              <button
                type="button"
                key={roleKey}
                role="tab"
                id={`tab-${roleKey}`}
                aria-selected={isSelected}
                className={`auth-role-tab ${isSelected ? 'active' : ''}`}
                onClick={() => handleRoleChange(roleKey)}
              >
                <Icon size={18} />
                <span className="role-tab-label">{conf.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="auth-header-wrapper">
          <span className="role-access-pill">{currentConfig.badge}</span>
          <h2 className="auth-title">{currentConfig.title}</h2>
          <p className="auth-subtitle">{currentConfig.subtitle}</p>
        </div>

        {error && (
          <div className="auth-error-message" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {roleNotice && (
          <div className="upload-alert success" role="status">
            <span>{roleNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              {activeRole === 'hospital' ? 'Hospital / Administrator Email' : activeRole === 'doctor' ? 'Doctor Work Email' : 'Patient Email Address'}
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={currentConfig.demoEmail}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
            Sign In to {currentConfig.shortLabel} Dashboard
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDemoLogin}
            disabled={isLoading}
            icon={ShieldCheck}
          >
            Instant {currentConfig.shortLabel} Demo Sign In
          </Button>
        </form>

        <p className="auth-footer-link">
          Don't have an account?{' '}
          <Link to={`/register?role=${activeRole}`}>
            Register as {currentConfig.shortLabel}
          </Link>
        </p>
      </div>
    </div>
  );
};
