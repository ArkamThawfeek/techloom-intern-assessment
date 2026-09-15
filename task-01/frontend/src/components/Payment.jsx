import { useEffect, useState } from 'react';
import { ArrowLeft, Timer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api, newIdempotencyKey } from '../api.js';

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

export default function Payment({ order: initialOrder, onBack, onResolved, onCancelled }) {
  const [order, setOrder] = useState(initialOrder);
  const [mode, setMode] = useState('SUCCESS');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remaining = useCountdown(order.status === 'RESERVED' ? order.expires_at : null);
  const expired = remaining === 0;

  // Timeout can only ever be selected once the real reservation clock has actually
  // run out — it's not a thing you can simulate while time still remains, since
  // that wouldn't reflect how a real reservation window works.
  useEffect(() => {
    if (!expired && mode === 'TIMEOUT') setMode('SUCCESS');
  }, [expired]);

  // If the cashier just waits without clicking anything, resolve it automatically
  // the moment the clock runs out — no click required.
  useEffect(() => {
    if (remaining !== 0) return;
    let cancelled = false;
    api.getOrder(order.id).then((fresh) => {
      if (cancelled) return;
      if (fresh.status === 'EXPIRED') onResolved(fresh);
      else setOrder(fresh);
    });
    return () => { cancelled = true; };
  }, [remaining]);

  async function process() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.payOrder(order.id, { mode, idempotencyKey: newIdempotencyKey() });
      onResolved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.cancelOrder(order.id);
      onCancelled(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const OUTCOMES = [
    { id: 'SUCCESS', label: 'Success', cls: 'success', Icon: CheckCircle2, disabled: false },
    { id: 'FAILURE', label: 'Failure', cls: 'failure', Icon: XCircle, disabled: false },
    { id: 'TIMEOUT', label: 'Timeout', cls: 'timeout', Icon: Clock, disabled: !expired }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payment</h1>
          <div className="sub">Order #{order.id}</div>
        </div>
        <button className="btn" onClick={onBack}><ArrowLeft size={14} /> Back</button>
      </div>

      <div className="card stack" style={{ maxWidth: 460 }}>
        <div className="spread">
          <span>Total amount</span>
          <strong className="num" style={{ fontSize: 20 }}>Rs. {Number(order.total_amount).toFixed(2)}</strong>
        </div>

        {remaining !== null && (
          <div className="reservation-banner">
            <Timer size={20} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Complete payment before the reservation expires</div>
              <div className="countdown num">{fmt(remaining)}</div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Payment outcome</div>
          <div className="outcome-grid">
            {OUTCOMES.map(({ id, label, cls, Icon, disabled }) => (
              <div
                key={id}
                className={`outcome-card ${cls} ${mode === id ? 'selected' : ''}`}
                style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                onClick={() => { if (!disabled) setMode(id); }}
                title={id === 'TIMEOUT' && disabled ? 'Becomes available once the reservation actually expires' : undefined}
              >
                <Icon size={22} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={cancel} disabled={busy}>
            Cancel order
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={process}
            disabled={busy || expired}
          >
            {expired ? 'Reservation expired' : busy ? 'Processing…' : 'Process payment'}
          </button>
        </div>
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
