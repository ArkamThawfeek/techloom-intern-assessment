import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, X as XIcon, Circle, AlertCircle, RotateCcw } from 'lucide-react';
import { api } from '../api.js';
import ConfirmModal from './ConfirmModal.jsx';
import ResultModal from './ResultModal.jsx';

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

  if (order.refund) {
    steps.push({ label: 'Refunded', time: order.refund.created_at, state: 'done' });
  }
  return steps;
}

function Dot({ state }) {
  const Icon = state === 'done' ? Check : state === 'failed' ? XIcon : state === 'current' ? Clock : Circle;
  return <div className={`timeline-dot ${state}`}><Icon size={14} /></div>;
}

export default function OrderDetail({ orderId, shippingAddress, onBack, onPay, onStartNewOrder, refreshKey }) {
  const [order, setOrder] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [error, setError] = useState('');

  async function refresh() { setOrder(await api.getOrder(orderId)); }
  useEffect(() => { refresh(); }, [orderId, refreshKey]);

  if (!order) return <div className="empty">Loading…</div>;

  const canPay = order.status === 'RESERVED';
  const canCancel = order.status === 'RESERVED' || order.status === 'PAID';
  const steps = buildSteps(order);

  async function confirmCancel() {
    try {
      const updated = await api.cancelOrder(orderId);
      setConfirming(false);
      setOrder(updated);
      setResultModal({
        tone: 'success',
        title: 'Order cancelled',
        description: updated.refund
          ? `Order #${updated.id} has been cancelled. A refund of Rs. ${Number(updated.refund.amount).toFixed(2)} has been processed to your wallet.`
          : `Order #${updated.id} has been cancelled and its reserved stock released back to inventory.`
      });
    } catch (err) {
      setConfirming(false);
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={onBack}><ArrowLeft size={14} /> Back to orders</button>
        <span className={`pill pill-${order.status.toLowerCase()}`}>{order.status}</span>
      </div>

      <div className="stack" style={{ marginBottom: 16 }}>
        {order.status === 'FAILED' && (
          <div className="status-banner danger">
            <AlertCircle size={18} />
            <div>
              Payment failed. Stock has been released and no charge was made.
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-danger-outline" onClick={onStartNewOrder}><RotateCcw size={13} /> Try again</button>
              </div>
            </div>
          </div>
        )}
        {order.status === 'EXPIRED' && (
          <div className="status-banner warn">
            <AlertCircle size={18} />
            <div>
              The reservation window passed before payment completed. Stock has been released back to inventory.
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={onStartNewOrder}>Back to shop</button>
              </div>
            </div>
          </div>
        )}
        {order.status === 'CANCELLED' && order.refund && (
          <div className="status-banner success">
            <Check size={18} />
            Order cancelled. A refund of Rs. {Number(order.refund.amount).toFixed(2)} has been processed to your wallet.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}><strong>Order #{order.id}</strong><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Placed {new Date(order.created_at).toLocaleString()}</span></div>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
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
            <div className="spread" style={{ marginTop: 8 }}><span>Subtotal</span><span className="num">Rs. {Number(order.total_amount).toFixed(2)}</span></div>
            <div className="spread"><span>Shipping</span><span className="num">Rs. 0.00</span></div>
            <div className="spread" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
              <strong>Total</strong><strong className="num">Rs. {Number(order.total_amount).toFixed(2)}</strong>
            </div>
          </div>

          <div className="row" style={{ alignItems: 'stretch' }}>
            {shippingAddress && (
              <div className="card" style={{ flex: 1 }}>
                <strong>Shipping address</strong>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7 }}>
                  {shippingAddress.name}<br />
                  {shippingAddress.address}<br />
                  {shippingAddress.city}, {shippingAddress.postalCode}<br />
                  {shippingAddress.country}
                </div>
              </div>
            )}
            <div className="card" style={{ flex: 1 }}>
              <strong>Payment information</strong>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7 }}>
                Method: Online wallet (mock payment)<br />
                {order.status === 'PAID' && <>Paid at: {new Date(order.updated_at).toLocaleString()}</>}
                {order.status === 'RESERVED' && 'Not yet paid'}
                {(order.status === 'FAILED' || order.status === 'EXPIRED') && 'No charge was made'}
                {order.status === 'CANCELLED' && (order.refund ? 'Refunded to wallet' : 'No charge was made')}
              </div>
            </div>
          </div>

          <div className="row">
            {canPay && <button className="btn btn-primary" onClick={() => onPay(order)}>Pay now</button>}
            {canCancel && <button className="btn btn-danger-outline" onClick={() => setConfirming(true)}>Cancel order</button>}
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>

        <div className="card">
          <strong>Order status</strong>
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

      {confirming && (
        <ConfirmModal
          title="Cancel this order?"
          description={
            order.status === 'PAID'
              ? 'This order is eligible for cancellation and refund. Stock will be restored and a refund issued to your wallet.'
              : 'This will release the reserved stock back to inventory.'
          }
          confirmLabel="Cancel order"
          onConfirm={confirmCancel}
          onClose={() => setConfirming(false)}
        />
      )}
      {resultModal && (
        <ResultModal {...resultModal} onClose={() => setResultModal(null)} />
      )}
    </div>
  );
}
