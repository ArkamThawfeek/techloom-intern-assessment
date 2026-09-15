import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.listProducts().then(setProducts);
    api.listOrders().then(setOrders);
  }, []);

  const byStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const revenue = orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + Number(o.total_amount), 0);

  // Every product's current stock, most urgent (lowest) first — not just a
  // filtered "low stock" shortlist, so the count always matches what's on
  // the Products page.
  const stockOverview = [...products].sort((a, b) => a.stock - b.stock);

  function stockTone(stock) {
    if (stock === 0) return 'pill-outstock';
    if (stock <= 5) return 'pill-reserved';
    return 'pill-instock';
  }
  function stockLabel(stock) {
    if (stock === 0) return 'Out of stock';
    if (stock <= 5) return `${stock} left — low`;
    return `${stock} in stock`;
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Products</div>
          <div className="value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Orders</div>
          <div className="value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Reserved (active)</div>
          <div className="value">{byStatus.RESERVED || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Paid revenue</div>
          <div className="value num">Rs. {revenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="spread" style={{ marginBottom: 12 }}><strong>Order status breakdown</strong></div>
          {orders.length === 0 && <div className="empty">No orders yet</div>}
          <div className="stack">
            {['RESERVED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'].filter((s) => byStatus[s]).map((s) => (
              <div className="spread" key={s}>
                <span>{s}</span>
                <strong>{byStatus[s]}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: 4 }}><strong>Stock levels</strong></div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Every product's current stock, lowest first
          </div>
          {stockOverview.length === 0 && <div className="empty">No products yet</div>}
          <div className="stack">
            {stockOverview.map((p) => (
              <div className="spread" key={p.id}>
                <span>{p.name}</span>
                <span className={`pill ${stockTone(p.stock)}`}>{stockLabel(p.stock)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
