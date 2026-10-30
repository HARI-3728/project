import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import './pages.css';

export const PatientOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.get('/orders/my', { requireAuth: true })
      .then(setOrders)
      .catch((error) => setErrorMessage(error.message || 'Unable to load medicine orders.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = status === 'all' || order.status === status;
    const query = search.trim().toLowerCase();
    const matchesQuery = !query
      || order.orderNumber?.toLowerCase().includes(query)
      || order.items?.some((item) => item.medicineName?.toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  }), [orders, search, status]);

  if (isLoading) return <div className="dashboard-page"><LoadingState count={3} type="card" /></div>;
  if (errorMessage) {
    return (
      <div className="dashboard-page">
        <ErrorState title="Medicine Orders Unavailable" message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Medicine Orders</h2>
          <p className="page-subtitle">Review your order history and current fulfillment status.</p>
        </div>
      </div>

      <div className="filter-toolbar">
        <div className="navbar-search flex-1">
          <Search className="search-icon" size={18} />
          <input
            type="search"
            aria-label="Search medicine orders"
            placeholder="Search by order number or medicine..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="form-input"
          aria-label="Filter orders by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          {['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map((value) => (
            <option key={value} value={value}>{value.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {filteredOrders.length ? (
        <div className="records-list">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="record-item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{order.orderNumber}</h3>
                  <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Date not available'}
                  </p>
                </div>
                <span className="badge badge-info">{order.status}</span>
              </div>
              {order.notes?.includes('DEMO DATA') && (
                <p className="badge badge-neutral" style={{ margin: '0.5rem 0' }}>DEMO DATA — fictional order</p>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                {(order.items || []).map((item, index) => (
                  <div key={`${order._id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.4rem 0' }}>
                    <span>{item.medicineName} × {item.quantity}</span>
                    <strong>₹{Number(item.lineTotal || 0).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total</span>
                <strong>₹{Number(order.totalAmount || 0).toLocaleString()}</strong>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: '0.5rem', padding: '2rem' }}>
            <ShoppingBag size={28} aria-hidden="true" />
            <h3>No matching orders</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {orders.length ? 'Try another search or status filter.' : 'Orders will appear here after they are placed.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
