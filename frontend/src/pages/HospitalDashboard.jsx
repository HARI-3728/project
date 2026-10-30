import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Pill,
  Users,
  LayoutGrid,
  Menu,
  FileText,
  Loader2,
  Stethoscope,
  ShieldCheck,
  Receipt,
  Search,
  Eye,
  Syringe,
  ShieldAlert,
  Truck,
  Heart,
  FileCheck,
  Beaker,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import './pages.css';
import './hospital.css';

export const HospitalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // New Bill Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billForm, setBillForm] = useState({
    patientId: '',
    serviceName: 'General Consultation & Pharmacy',
    amount: '1200',
    paymentMethod: 'cash',
  });
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [dashRes, profRes] = await Promise.all([
        api.get('/hospital/me/dashboard', { requireAuth: true }),
        api.get('/hospital/me/profile', { requireAuth: true })
      ]);

      setDashboardData(dashRes);
      setProfile(profRes);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load hospital dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/hospital/orders/${orderId}/status`, { status: newStatus }, { requireAuth: true });
      setSuccessMessage(`Order updated to "${newStatus}".`);
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentOrders: (prev.recentOrders || []).map((o) =>
            o._id === orderId ? { ...o, status: newStatus } : o
          ),
          stats: {
            ...prev.stats,
            pendingOrders: newStatus === 'delivered' || newStatus === 'cancelled'
              ? Math.max(0, (prev.stats?.pendingOrders || 1) - 1)
              : prev.stats?.pendingOrders,
          },
        };
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update order status.');
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!billForm.patientId.trim() || !billForm.amount) {
      setErrorMessage('Patient ID and Amount are required.');
      return;
    }

    setIsSubmittingBill(true);
    try {
      const payload = {
        patient: billForm.patientId.trim(),
        items: [
          {
            description: billForm.serviceName.trim() || 'Medical Services',
            amount: Number(billForm.amount),
            quantity: 1,
          },
        ],
        paymentMethod: billForm.paymentMethod,
        paymentStatus: 'paid',
      };

      await api.post('/hospital/bills', payload, { requireAuth: true });
      setSuccessMessage('Patient bill generated successfully!');
      setIsBillModalOpen(false);
      setBillForm({
        patientId: '',
        serviceName: 'General Consultation & Pharmacy',
        amount: '1200',
        paymentMethod: 'cash',
      });

      // Reload dashboard stats
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to create patient bill.');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page fade-in">
        <LoadingState count={4} type="card" />
      </div>
    );
  }

  if (errorMessage && !dashboardData) {
    return (
      <div className="dashboard-page fade-in">
        <ErrorState
          title="Hospital Dashboard Unavailable"
          message={errorMessage}
          onRetry={loadData}
        />
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentOrders = dashboardData?.recentOrders || [];
  const lowStockMeds = dashboardData?.lowStockMeds || [];
  const hospital = profile || dashboardData?.hospital || {};

  return (      <div className="dashboard-page hospital-page fade-in">
      {/* Messages */}
      {successMessage && (
        <div className="upload-alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="upload-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Facility Hero */}
      <div className="hospital-hero">
        <div className="hospital-hero-inner">
          <div className="hospital-hero-tag">
            <Building2 size={14} />
            <span>
              {hospital?.hospitalName || 'MediCare+ Healthcare Network'} • Lic: {hospital?.registrationNumber || 'HOSP-2024'}
            </span>
          </div>

          <h2 className="hospital-hero-title">{hospital?.hospitalName || user?.name || 'Healthcare Facility'}</h2>
          <p className="hospital-hero-desc">
            Facility overview: <strong>{stats.pendingOrders || 0} active pharmacy orders</strong> requiring preparation and <strong>₹{(stats.totalRevenue || 0).toLocaleString()}</strong> in verified collections.
          </p>

          <div className="hospital-hero-actions">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsBillModalOpen(true)}
            >
              Generate Patient Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={Pill}
              onClick={() => navigate('/medicines')}
            >
              Manage Medicine Stock
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="hospital-stat-grid">
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders ?? 0}
          unit="orders"
          badgeText="Awaiting fulfillment"
          badgeType="warning"
          trend="up"
          trendValue="Live queue"
          icon={Clock}
          iconBgColor="var(--accent-amber-light)"
          iconColor="var(--accent-amber)"
        />

        <StatCard
          title="Total Pharmacy Orders"
          value={stats.totalOrders ?? 0}
          unit="completed orders"
          badgeText="All time"
          badgeType="info"
          trend="stable"
          trendValue="Fulfillments"
          icon={Package}
          iconBgColor="var(--primary-100)"
          iconColor="var(--primary-700)"
        />

        <StatCard
          title="Hospital Invoices"
          value={stats.totalBills ?? 0}
          unit="bills created"
          badgeText={`${stats.paidBillsCount || 0} paid`}
          badgeType="success"
          trend="up"
          trendValue="Patient Accounts"
          icon={FileSpreadsheet}
          iconBgColor="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
        />

        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue || 0).toLocaleString()}`}
          unit="settled"
          badgeText="Verified payments"
          badgeType="success"
          trend="up"
          trendValue="Billing cycle"
          icon={TrendingUp}
          iconBgColor="var(--primary-100)"
          iconColor="var(--primary-700)"
        />
      </div>

      {/* Facility profile + recent orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1rem', marginBottom: '0.5rem' }}>
        {/* Facility information card */}
        <Card className="hospital-card">
          <div className="hospital-card-head">
            <div>
              <div className="hospital-card-title">Facility Overview</div>
              <div className="hospital-card-sub">Operating profile and registration summary</div>
            </div>
            <span className="badge badge-info">
              {hospital?.type ? hospital.type.toUpperCase() : 'PRIVATE'}
            </span>
          </div>

          <div className="hospital-profile-card">
              <div className="hospital-profile-icon">
                <Building2 size={26} />
              </div>
              <div className="hospital-profile-meta">
                <div className="hospital-profile-name">{hospital?.hospitalName || 'MediCare+ Apex Hospital'}</div>
                <div className="hospital-profile-role">
                  {(hospital?.type || 'PRIVATE').toUpperCase()} HEALTHCARE FACILITY
                </div>
              </div>
            </div>

            <div className="hospital-profile-details">
              <div className="hospital-profile-row">
                <span>Registration / License</span>
                <strong>{hospital?.registrationNumber || 'HOSP-2024-ND-0881'}</strong>
              </div>
              <div className="hospital-profile-row">
                <span>Operating Hours</span>
                <strong>{hospital?.operatingHours?.open || '00:00'} – {hospital?.operatingHours?.close || '23:59'}</strong>
              </div>
              <div className="hospital-profile-row">
                <span>GST / Tax Rate</span>
                <strong>{hospital?.taxRate || 18}%</strong>
              </div>
              <div className="hospital-profile-row">
                <span>Location</span>
                <strong>{hospital?.address?.city || 'New Delhi'}</strong>
              </div>
              {hospital?.address?.street && (
                <div className="hospital-profile-row">
                  <span>Address</span>
                  <span>{hospital.address.street}</span>
                </div>
              )}
              {hospital?.phone && (
                <div className="hospital-profile-row">
                  <span>Contact</span>
                  <span className="hospital-contact"><Phone size={12} />{hospital.phone}</span>
                </div>
              )}
              {hospital?.email && (
                <div className="hospital-profile-row">
                  <span>Email</span>
                  <span className="hospital-contact"><Mail size={12} />{hospital.email}</span>
                </div>
              )}
            </div>

          <div className="hospital-departments">
            <div className="hospital-departments-label">Departments</div>
            <div className="hospital-departments-list">
              {(hospital?.departments || ['General Medicine', 'Cardiology', 'Dermatology', '24/7 Pharmacy', 'Pathology']).map((dept) => (
                <span key={dept} className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>
                  {dept}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent orders */}
        <Card className="hospital-card">
          <div className="hospital-card-head">
            <div>
              <div className="hospital-card-title">Pharmacy Orders — Live Queue</div>
              <div className="hospital-card-sub">Patient medication requests requiring dispatch</div>
            </div>
            <span className="badge badge-info">{recentOrders.length} Recent</span>
          </div>

          {recentOrders.length === 0 ? (
            <div className="hospital-empty">
              <Package size={36} />
              <div className="hospital-empty-title">No pharmacy orders in queue</div>
              <div className="hospital-empty-sub">When patients place medicine orders, they will show up here.</div>
            </div>
          ) : (
            <div className="hospital-order-list">
              {recentOrders.map((order) => (
                <div className="hospital-order-item" key={order._id}>
                  <div className="hospital-order-left">
                    <span className="hospital-order-id">
                      #{order._id?.slice?.( -6)?.toUpperCase?.() || String(order._id || '').slice(-6).toUpperCase()}
                    </span>
                    <div className="hospital-order-patient">
                      <div className="hospital-order-name">{order.patient?.name || 'Customer'}</div>
                      <div className="hospital-order-meta">
                        {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'} • ₹{order.totalAmount || 0}
                        {order.patient?.phone ? ` • ${order.patient.phone}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="hospital-order-right">
                    <span className={`badge ${order.status === 'delivered' ? 'badge-success' : order.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                      {order.status}
                    </span>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <select
                        className="form-input"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem', minHeight: 'auto', width: 'auto' }}
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>      {/* Low stock alert banner */}
      {lowStockMeds.length > 0 && (
        <div className="hospital-alert-banner" style={{ marginBottom: '0.5rem' }}>
          <div className="hospital-alert-content">
            <AlertTriangle size={20} style={{ color: '#b45309' }} />
            <div>
              <div className="hospital-alert-title">Low Stock Inventory Alerts</div>
              <div className="hospital-alert-sub">Medicines currently below the 20-unit safety threshold</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/medicines')} className="hospital-alert-action">
            View Full Catalog
          </Button>
        </div>
      )}

      {/* Low stock inventory cards */}
      {lowStockMeds.length > 0 && (
        <Card className="page-section" style={{ marginBottom: '0.5rem' }}>
          <div className="hospital-card-head">
            <div>
              <div className="hospital-card-title">Medicines Below Safety Threshold</div>
              <div className="hospital-card-sub">Items requiring replenishment before the next order batch</div>
            </div>
          </div>

          <div className="hospital-lowstock-grid">
            {lowStockMeds.map((med) => (
              <div className="hospital-lowstock-item" key={med._id || med.name}>
                <div>
                  <div className="hospital-lowstock-name">{med.name}</div>
                  <div className="hospital-lowstock-price">Unit Price: ₹{med.unitPrice}</div>
                </div>
                <span className="hospital-lowstock-badge badge badge-danger">
                  {med.stockQuantity} left
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Generate Patient Invoice Modal */}
      <Modal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        title="Generate Patient Invoice"
        subtitle="Create an official verified medical bill in the hospital accounts system"
      >
        <form onSubmit={handleCreateBill} className="auth-form">
          <div className="form-group">
            <label htmlFor="bill-patient">Patient User ID or Email</label>
            <input
              id="bill-patient"
              type="text"
              className="form-input"
              placeholder="e.g. Patient Mongo ID or email"
              value={billForm.patientId}
              onChange={(e) => setBillForm({ ...billForm, patientId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="bill-service">Service or Treatment Description</label>
            <input
              id="bill-service"
              type="text"
              className="form-input"
              value={billForm.serviceName}
              onChange={(e) => setBillForm({ ...billForm, serviceName: e.target.value })}
              placeholder="e.g. Diagnostic Blood Panel & Consultation"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="bill-amount">Amount (INR ₹)</label>
              <input
                id="bill-amount"
                type="number"
                min="0"
                step="1"
                className="form-input"
                value={billForm.amount}
                onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="bill-payment">Payment Method</label>
              <select
                id="bill-payment"
                className="form-input"
                value={billForm.paymentMethod}
                onChange={(e) => setBillForm({ ...billForm, paymentMethod: e.target.value })}
              >
                <option value="cash">Cash Counter</option>
                <option value="upi">UPI / QR Code</option>
                <option value="card">Credit / Debit Card</option>
                <option value="insurance">Health Insurance Claim</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmittingBill}
            disabled={isSubmittingBill}
          >
            Create Official Invoice
          </Button>
        </form>
      </Modal>
    </div>
  );
};
