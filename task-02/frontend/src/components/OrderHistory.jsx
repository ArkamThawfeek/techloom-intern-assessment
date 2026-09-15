import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const TABS = ['All', 'RESERVED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'];
const TAB_LABELS = { All: 'All', RESERVED: 'Reserved', PAID: 'Paid', FAILED: 'Failed', EXPIRED: 'Expired', CANCELLED: 'Cancelled' };

export default function OrderHistory({ onSelect, refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('All');

  useEffect(() => { api.listOrders().then(setOrders); }, [refreshKey]);

  const filtered = useMemo(
    () => tab === 'All' ? orders : orders.filter((o) => o.status === tab),
    [orders, tab]
  );

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>My orders</h1>

      <div className="status-tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {TAB_LABELS[t]} {t !== 'All' ? `(${orders.filter((o) => o.status === t).length})` : `(${orders.length})`}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="num">Rs. {Number(o.total_amount).toFixed(2)}</td>
                <td><span className={`pill pill-${o.status.toLowerCase()}`}>{o.status}</span></td>
                <td><button className="btn" onClick={() => onSelect(o.id)}>View</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" className="empty">No orders here</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
