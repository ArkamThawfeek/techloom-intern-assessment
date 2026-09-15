import { useEffect, useState } from 'react';
import { ArrowLeft, Wallet, CreditCard, Truck, Timer } from 'lucide-react';
import { api, newIdempotencyKey } from '../api.js';
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

export default function Payment({ order, onBack, onResolved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState(order.expires_at);

  const remaining = useCountdown(expiresAt);

  useEffect(() => {
    if (remaining !== 0) return;
    let cancelled = false;
    api.getOrder(order.id).then((fresh) => {
      if (cancelled) return;
      if (fresh.status === 'EXPIRED') {
        onResolved(fresh);
      } else {
        setExpiresAt(fresh.expires_at);
      }
    });
    return () => { cancelled = true; };
  }, [remaining]);

  async function process() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.payOrder(order.id, { idempotencyKey: newIdempotencyKey() });
      onResolved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Payment</h1>
        <button className="btn" onClick={onBack}><ArrowLeft size={14} /> Back</button>
      </div>
      <StepIndicator current={2} />

      <div className="card stack" style={{ maxWidth: 480 }}>
        <div className="spread">
          <span>Order #{order.id}</span>
          <strong className="num" style={{ fontSize: 20 }}>Rs. {Number(order.total_amount).toFixed(2)}</strong>
        </div>

        {remaining !== null && (
          <div className="reservation-banner">
            <Timer size={18} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 13 }}>Complete payment before your reservation expires</div>
              <div className="countdown num" style={{ fontSize: 22 }}>{fmt(remaining)}</div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Payment method</div>
          <div className="payment-method-row disabled"><CreditCard size={16} /> Credit / debit card <span style={{ marginLeft: 'auto', fontSize: 11 }}>Not available</span></div>
          <div className="payment-method-row selected"><Wallet size={16} /> Online wallet (mock payment)</div>
          <div className="payment-method-row disabled"><Truck size={16} /> Cash on delivery <span style={{ marginLeft: 'auto', fontSize: 11 }}>Not available</span></div>
        </div>

        <button className="btn btn-primary btn-block" onClick={process} disabled={busy}>
          {busy ? 'Processing…' : 'Process payment'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          This is a dummy payment gateway. No real charges will be made😊.
        </div>
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
