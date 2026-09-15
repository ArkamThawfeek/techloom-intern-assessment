import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, X as XIcon, Circle } from 'lucide-react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';

function buildSteps(order) {
  const steps = [{
    label: 'Reserved',
    time: order.created_at,
    state: order.status === 'RESERVED' ? 'current' : 'done'
  }];

  if (order.status === 'RESERVED') {
    steps.push({ label: 'Awaiting payment', state: 'pending' });
  } else if (order.status === 'PAID') {
    steps.push({ label: 'Paid', time: order.updated_at, state: 'done' });
  } else if (order.status === 'FAILED') {
    steps.push({ label: 'Payment failed', time: order.updated_at, state: 'failed' });
  } else if (order.status === 'EXPIRED') {
    steps.push({ label: 'Reservation expired', time: order.updated_at, state: 'failed' });
  } else if (order.status === 'CANCELLED') {
    steps.push({ label: 'Cancelled', time: order.updated_at, state: 'failed' });
  }
  return steps;
}

function Dot({ state }) {
  const Icon = state === 'done' ? Check : state === 'failed' ? XIcon : state === 'current' ? Clock : Circle;
  return <div className={`timeline-dot ${state}`}><Icon size={14} /></div>;
}

export default function OrderDetail({ orderId, onBack, onPay, onCancelled, refreshKey }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getOrder(orderId).then(setOrder); }, [orderId, refreshKey]);

  if (!order) return <div className="empty">Loading…</div>;

  const canPay = order.status === 'RESERVED';
  const canCancel = order.status === 'RESERVED' || order.status === 'PAID';
  const steps = buildSteps(order);

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.cancelOrder(orderId);
      onCancelled(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="btn" onClick={onBack}><ArrowLeft size={14} /> Back to orders</button>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid-2">
        <div className="card stack">
          <strong>Order #{order.id}</strong>
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.product_name}</td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">Rs. {Number(i.price_at_purchase).toFixed(2)}</td>
                  <td className="num">Rs. {(Number(i.price_at_purchase) * i.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="spread" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <strong>Total</strong>
            <strong className="num">Rs. {Number(order.total_amount).toFixed(2)}</strong>
          </div>

          <div className="row" style={{ marginTop: 8 }}>
            {canPay && <button className="btn btn-primary" onClick={() => onPay(order)}>Pay now</button>}
            {canCancel && (
              <button className="btn btn-danger-outline" onClick={cancel} disabled={busy}>Cancel order</button>
            )}
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>

        <div className="card">
          <strong>Order lifecycle</strong>
          <div className="timeline" style={{ marginTop: 16 }}>
            {steps.map((s, idx) => (
              <div className="timeline-step" key={s.label}>
                {idx < steps.length - 1 && <div className="line" />}
                <Dot state={s.state} />
                <div>
                  <div className="timeline-label">{s.label}</div>
                  {s.time && <div className="timeline-time">{new Date(s.time).toLocaleString()}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
