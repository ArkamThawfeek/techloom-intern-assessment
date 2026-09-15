import { useEffect, useState } from 'react';
import { ArrowLeft, Timer } from 'lucide-react';
import { api } from '../api.js';
import StepIndicator from './StepIndicator.jsx';

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

const emptyAddress = { name: '', address: '', city: '', postalCode: '', country: '' };

export default function CheckoutShipping({ orderId, savedAddress, onBack, onCancelled, onExpired, onContinue }) {
  const [order, setOrder] = useState(null);
  const [address, setAddress] = useState(savedAddress || emptyAddress);
  const [error, setError] = useState('');

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

  async function goBackToCart() {
    const itemsSnapshot = order.items.map((i) => ({ productId: i.product_id, quantity: i.quantity }));
    if (order.status === 'RESERVED') {
      try { await api.cancelOrder(orderId); } catch { /* best-effort */ }
    }
    for (const item of itemsSnapshot) {
      try { await api.addToCart(item.productId, item.quantity); } catch { /* best-effort */ }
    }
    onBack();
  }

  function submit(e) {
    e.preventDefault();
    for (const key of ['name', 'address', 'city', 'postalCode', 'country']) {
      if (!address[key]) { setError('Please fill in every field.'); return; }
    }
    setError('');
    onContinue(address, order);
  }

  if (!order) return <div className="empty">Loading…</div>;

  return (
    <div>
      <div className="spread" style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Checkout</h1>
        <button className="btn" onClick={goBackToCart}><ArrowLeft size={14} /> Back to cart</button>
      </div>
      <StepIndicator current={1} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <form className="card" id="shipping-form" onSubmit={submit}>
          <div className="spread" style={{ marginBottom: 12 }}><strong>Shipping address</strong></div>
          <div className="field"><label>Full name</label><input value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} /></div>
          <div className="field"><label>Address</label><input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} /></div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label>City</label><input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></div>
            <div className="field" style={{ flex: 1 }}><label>Postal code</label><input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} /></div>
          </div>
          <div className="field"><label>Country</label><input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} /></div>
          {error && <div className="error-text">{error}</div>}
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={cancel}>Cancel order</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Continue to payment</button>
          </div>
        </form>

        <div className="card stack">
          {order.status === 'RESERVED' && remaining !== null && (
            <div className="reservation-banner">
              <Timer size={20} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Stock reservation</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Your items are reserved for:</div>
                <div className="countdown num">{fmt(remaining)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  If payment isn't completed within 5 minutes, the reservation expires and stock is released.
                </div>
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
}
