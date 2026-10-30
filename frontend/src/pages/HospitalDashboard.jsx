import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Truck,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Pill
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import './pages.css';

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

  return (
    <div className="dashboard-page fade-in">
      {/* Alert Notices */}
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

      {/* Hero Banner */}
      <div className="dashboard-hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Building2 size={14} />
            <span>
              {hospital?.hospitalName || 'MediCare+ Healthcare Network'} • Lic: {hospital?.registrationNumber || 'HOSP-2024'}
            </span>
          </div>

          <h2 className="hero-title">{hospital?.hospitalName || user?.name || 'Healthcare Facility'}</h2>
          <p className="hero-desc">
            Facility overview: <strong>{stats.pendingOrders || 0} active pharmacy orders</strong> requiring preparation and <strong>₹{(stats.totalRevenue || 0).toLocaleString()}</strong> in verified collections.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
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
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Manage Medicine Stock
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="dashboard-grid">
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

      {/* Two Column Section: Recent Orders & Facility Details */}
      <div className="details-container" style={{ marginBottom: '2rem' }}>
        {/* Left Column: Facility Information Card */}
        <Card className="details-image-card" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', width: '100%' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Building2 size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{hospital?.hospitalName || 'MediCare+ Apex Hospital'}</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {hospital?.type ? hospital.type.toUpperCase() : 'PRIVATE'} HEALTHCARE FACILITY
              </p>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reg / License:</span>
              <strong>{hospital?.registrationNumber || 'HOSP-2024-ND-0881'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Operating Hours:</span>
              <strong>{hospital?.operatingHours?.open || '00:00'} – {hospital?.operatingHours?.close || '23:59'} (24/7)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>GST / Tax Rate:</span>
              <strong>{hospital?.taxRate || 18}%</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <MapPin size={16} />
              <span>{hospital?.address?.street || '42 Health Boulevard'}, {hospital?.address?.city || 'New Delhi'}</span>
            </div>
            {hospital?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Phone size={16} />
                <span>{hospital.phone}</span>
              </div>
            )}
            {hospital?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Mail size={16} />
                <span>{hospital.email}</span>
              </div>
            )}
          </div>

          {/* Departments Chips */}
          <div style={{ marginTop: '1.25rem', width: '100%' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--neutral-800)' }}>Departments</h4>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(hospital?.departments || ['General Medicine', 'Cardiology', 'Dermatology', '24/7 Pharmacy', 'Pathology']).map((dept) => (
                <span key={dept} className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>
                  {dept}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Right Column: Recent Pharmacy Orders */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pharmacy Orders</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Patient medication requests requiring dispatch
              </p>
            </div>
            <span className="badge badge-info">{recentOrders.length} Recent</span>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Package size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>No pharmacy orders in queue</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>When patients place medicine orders, they will show up here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--neutral-50)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      Order #{order._id.slice(-6).toUpperCase()} • {order.patient?.name || 'Customer'}
                    </h4>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'} • Total: <strong>₹{order.totalAmount || 0}</strong> • {order.patient?.phone || 'No phone'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
      </div>

      {/* Low Stock Medicine Alerts */}
      {lowStockMeds.length > 0 && (
        <Card style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Low Stock Inventory Alerts</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Medicines currently below the 20-unit safety threshold</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/medicines')}>
              View Full Catalog
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {lowStockMeds.map((med) => (
              <div
                key={med._id || med.name}
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  backgroundColor: 'var(--accent-amber-light)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>{med.name}</h4>
                  <p style={{ fontSize: '0.775rem', color: '#92400e' }}>Unit Price: ₹{med.unitPrice}</p>
                </div>
                <span className="badge badge-danger">
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
