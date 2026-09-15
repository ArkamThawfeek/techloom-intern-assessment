import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
import { api, newIdempotencyKey } from '../api.js';
import { formatProductCode } from '../productCode.js';

export default function POS({ onCheckedOut, initialCart, onConsumedInitialCart }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState(() => {
    const seed = {};
    (initialCart || []).forEach((i) => { seed[i.productId] = i.quantity; });
    return seed;
  });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (initialCart) onConsumedInitialCart?.();
  }, []);

  async function refresh() {
    setProducts(await api.listProducts());
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  function addToCart(id) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function inc(id) { setCart((c) => ({ ...c, [id]: c[id] + 1 })); }
  function dec(id) {
    setCart((c) => {
      const next = { ...c, [id]: c[id] - 1 };
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }
  function removeLine(id) {
    setCart((c) => { const next = { ...c }; delete next[id]; return next; });
  }

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => String(p.id) === productId);
      return product ? { product, quantity } : null;
    })
    .filter(Boolean);

  const total = cartItems.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  async function checkout() {
    setError('');
    setPlacing(true);
    try {
      const order = await api.createOrder(
        cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        newIdempotencyKey()
      );
      setCart({});
      await refresh();
      onCheckedOut(order);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>POS / New order</h1>
          <div className="sub">Add items to the cart and reserve stock at checkout</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="search-input" style={{ marginBottom: 14 }}>
            <Search size={15} />
            <input placeholder="Search products by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="product-grid">
            {filtered.map((p) => (
              <div className="product-card" key={p.id}>
                <div className="name">{p.name}</div>
                <div className="stock" style={{ color: 'var(--text-muted)' }}>{formatProductCode(p.id)}</div>
                <div className="price num">Rs. {Number(p.price).toFixed(2)}</div>
                <div className="stock">Stock: {p.stock}</div>
                <button className="add-btn" disabled={p.stock === 0} onClick={() => addToCart(p.id)} aria-label={`Add ${p.name}`}>
                  <Plus size={15} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty">No products found</div>}
          </div>
        </div>

        <div className="card stack">
          <div className="spread"><strong>Current cart ({cartItems.length})</strong></div>
          {cartItems.length === 0 && <div className="empty">Cart is empty</div>}
          {cartItems.map((i) => (
            <div key={i.product.id}>
              <div className="spread">
                <span>{i.product.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({formatProductCode(i.product.id)})</span></span>
                <button className="btn btn-icon" onClick={() => removeLine(i.product.id)} aria-label="Remove"><Trash2 size={13} /></button>
              </div>
              <div className="spread" style={{ marginTop: 4 }}>
                <div className="qty-stepper">
                  <button onClick={() => dec(i.product.id)}><Minus size={12} /></button>
                  <span className="num">{i.quantity}</span>
                  <button onClick={() => inc(i.product.id)} disabled={i.quantity >= i.product.stock}><Plus size={12} /></button>
                </div>
                <span className="num">Rs. {(Number(i.product.price) * i.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
          {cartItems.length > 0 && (
            <>
              <div className="spread" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <strong>Total</strong>
                <strong className="num">Rs. {total.toFixed(2)}</strong>
              </div>
              <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={checkout} disabled={placing}>
                {placing ? 'Reserving stock…' : 'Proceed to checkout'}
              </button>
            </>
          )}
          {error && <div className="error-text">{error}</div>}
        </div>
      </div>
    </div>
  );
}
