import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { formatProductCode } from '../productCode.js';

const empty = { name: '', price: '', stock: '' };

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function refresh() {
    setProducts(await api.listProducts());
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  function openAdd() {
    setEditingId(null);
    setForm(empty);
    setError('');
    setFormOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock) });
    setError('');
    setFormOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = { name: form.name, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (editingId) await api.updateProduct(editingId, payload);
      else await api.createProduct(payload);
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api.deleteProduct(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <div className="sub">Manage what's available at the counter</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add product</button>
      </div>

      <div className="search-input" style={{ maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} />
        <input placeholder="Search products by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {error && !formOpen && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="num" style={{ color: 'var(--text-muted)' }}>{formatProductCode(p.id)}</td>
                <td>{p.name}</td>
                <td className="num">Rs. {Number(p.price).toFixed(2)}</td>
                <td className="num">{p.stock}</td>
                <td><span className={`pill ${p.stock > 0 ? 'pill-instock' : 'pill-outstock'}`}>{p.stock > 0 ? 'In stock' : 'Out of stock'}</span></td>
                <td>
                  <div className="row">
                    <button className="btn btn-icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil size={14} /></button>
                    <button className="btn btn-icon" onClick={() => remove(p.id)} aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="empty">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-card" style={{ textAlign: 'left', maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="spread" style={{ marginBottom: 16 }}>
              <strong>{editingId ? 'Edit product' : 'New product'}</strong>
              <button className="btn btn-icon" onClick={() => setFormOpen(false)} aria-label="Close"><X size={15} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Price</label>
                <input required type="number" step="0.01" min="0" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="field">
                <label>Stock</label>
                <input required type="number" step="1" min="0" value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                {editingId ? 'Save changes' : 'Add product'}
              </button>
              {error && <div className="error-text">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
