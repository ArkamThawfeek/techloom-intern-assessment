import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';

const PAGE_SIZE = 8;

export default function OrdersList({ onSelect, refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => { api.listOrders().then(setOrders); }, [refreshKey]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <div className="sub">Every order placed at the counter</div>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Order</th><th>Date &amp; time</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {pageOrders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td className="num">Rs. {Number(o.total_amount).toFixed(2)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td><button className="btn" onClick={() => onSelect(o.id)}>View</button></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="5" className="empty">No orders yet — place one from POS / New order</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {orders.length > PAGE_SIZE && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-icon" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13 }}>{page} / {totalPages}</span>
          <button className="btn btn-icon" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
