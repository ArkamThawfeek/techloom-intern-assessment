import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { formatProductCode } from '../productCode.js';
import ProductImage from './ProductImage.jsx';

export default function Cart({ onContinueShopping, onCheckout, refreshKey, notify }) {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() { setCart(await api.getCart()); }
  useEffect(() => { refresh(); }, [refreshKey]);

  async function setQty(productId, quantity) {
    if (quantity <= 0) {
      await api.removeFromCart(productId);
      notify?.('Removed from cart');
    } else {
      await api.addToCart(productId, quantity);
    }
    refresh();
  }

  async function removeItem(productId) {
    await api.removeFromCart(productId);
    notify?.('Removed from cart');
    refresh();
  }

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      await onCheckout();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>My cart ({cart.items.length})</h1>
        <button className="btn-link" onClick={onContinueShopping}>Continue shopping</button>
      </div>

      {cart.items.length === 0 ? (
        <div className="card empty">Your cart is empty</div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {cart.items.map((i) => (
                <tr key={i.product_id}>
                  <td>
                    <div className="row">
                      <ProductImage src={i.image_url} alt={i.name} size={16} style={{ width: 40, height: 40, borderRadius: 6 }} />
                      {i.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({formatProductCode(i.product_id)})</span>
                    </div>
                  </td>
                  <td className="num">Rs. {Number(i.price).toFixed(2)}</td>
                  <td>
                    <div className="qty-stepper">
                      <button onClick={() => setQty(i.product_id, i.quantity - 1)}>−</button>
                      <span className="num">{i.quantity}</span>
                      <button onClick={() => setQty(i.product_id, i.quantity + 1)} disabled={i.quantity >= i.stock}>+</button>
                    </div>
                  </td>
                  <td className="num">Rs. {(Number(i.price) * i.quantity).toFixed(2)}</td>
                  <td><button className="btn btn-icon" onClick={() => removeItem(i.product_id)} aria-label="Remove"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cart.items.length > 0 && (
        <div className="card" style={{ maxWidth: 360, marginLeft: 'auto', marginTop: 20 }}>
          <div className="spread"><span>Subtotal</span><span className="num">Rs. {cart.total.toFixed(2)}</span></div>
          <div className="spread" style={{ marginTop: 6 }}><span>Shipping</span><span className="num">Rs. 0.00</span></div>
          <div className="spread" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <strong>Total</strong><strong className="num">Rs. {cart.total.toFixed(2)}</strong>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={checkout} disabled={busy}>
            {busy ? 'Reserving stock…' : 'Proceed to checkout'}
          </button>
          {error && <div className="error-text">{error}</div>}
        </div>
      )}
    </div>
  );
}
