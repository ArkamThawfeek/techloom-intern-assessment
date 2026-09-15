import { useEffect, useState } from 'react';
import { ArrowLeft, Timer } from 'lucide-react';
import { api } from '../api.js';

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt) - new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function fmt(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Checkout({ orderId, onBack, onCancelled, onPay, onExpired }) {
  const [order, setOrder] = useState(null);

  async function refresh() {
    const o = await api.getOrder(orderId);
    setOrder(o);
    return o;
  }
  useEffect(() => { refresh(); }, [orderId]);

  const remaining = useCountdown(order?.status === 'RESERVED' ? order.expires_at : null);

  useEffect(() => {
    if (remaining === 0 && order?.status === 'RESERVED') {
      refresh().then((o) => { if (o.status === 'EXPIRED') onExpired(o); });
    }
  }, [remaining]);

  async function cancel() {
    const updated = await api.cancelOrder(orderId);
    onCancelled(updated);
  }

  // "Back to cart" isn't just a view switch — the stock is genuinely reserved
  // under this order, so going back has to release it and hand the items back
  // to the cart, or they'd sit locked away with no way to adjust the order.
  async function goBackToCart() {
    const itemsSnapshot = order.items.map((i) => ({ productId: i.product_id, quantity: i.quantity }));
    if (order.status === 'RESERVED') {
      try { await api.cancelOrder(orderId); } catch { /* best-effort; nothing to release if this fails */ }
    }
    onBack(itemsSnapshot);
  }

  if (!order) return <div className="empty">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Checkout</h1>
          <div className="sub">Order #{order.id}</div>
        </div>
        <button className="btn" onClick={goBackToCart}><ArrowLeft size={14} /> Back to cart</button>
      </div>

      <div className="card stack" style={{ maxWidth: 480 }}>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.product_name}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">Rs. {(Number(i.price_at_purchase) * i.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="spread" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <strong>Total</strong>
          <strong className="num">Rs. {Number(order.total_amount).toFixed(2)}</strong>
        </div>

        {order.status === 'RESERVED' && remaining !== null && (
          <div className="reservation-banner">
            <Timer size={20} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Stock reserved</div>
              <div className="countdown num">{fmt(remaining)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                remaining — if payment isn't completed in time, the reservation expires and stock is released.
              </div>
            </div>
          </div>
        )}

        <div className="row">
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={cancel}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onPay(order)}
            disabled={remaining === 0}
          >
            {remaining === 0 ? 'Reservation expired' : 'Pay now'}
          </button>
        </div>
      </div>
    </div>
  );
}
