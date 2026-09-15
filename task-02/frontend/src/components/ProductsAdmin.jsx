import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { api } from '../api.js';
import { formatProductCode } from '../productCode.js';
import ProductImage from './ProductImage.jsx';

const empty = { name: '', description: '', category: '', price: '', stock: '' };

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_MB = 5;

export default function ProductsAdmin({ notify }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileInputRef = useRef(null);

  async function refresh() {
    setProducts(await api.searchProducts({}));
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  function resetImageState() {
    setImageFile(null);
    setPreviewUrl('');
    setImageRemoved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openAdd() {
    setEditingId(null);
    setForm(empty);
    setError('');
    resetImageState();
    setFormOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      price: String(p.price),
      stock: String(p.stock)
    });
    setError('');
    setImageFile(null);
    setImageRemoved(false);
    setPreviewUrl(p.image_url || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormOpen(true);
  }

  function onPickFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_FILE_MB}MB.`);
      return;
    }

    setImageFile(file);
    setImageRemoved(false);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setPreviewUrl('');
    setImageRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category || 'general',
        price: Number(form.price),
        stock: Number(form.stock),
        imageFile,
        removeImage: imageRemoved
      };

      if (editingId) await api.updateProduct(editingId, payload);
      else await api.createProduct(payload);

      setFormOpen(false);
      notify?.(editingId ? 'Product updated' : 'Product added — now visible on Home');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteProduct(id);
      notify?.('Product removed');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Manage products</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Add, edit, or remove items from the storefront</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add product</button>
      </div>

      <div className="search-input" style={{ maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} />
        <input placeholder="Search products by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr><th></th><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td><ProductImage src={p.image_url} alt={p.name} size={14} style={{ width: 36, height: 36, borderRadius: 6 }} /></td>
                <td className="num" style={{ color: 'var(--text-muted)' }}>{formatProductCode(p.id)}</td>
                <td>{p.name}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.category}</td>
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
              <tr><td colSpan="8" className="empty">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-card" style={{ textAlign: 'left', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="spread" style={{ marginBottom: 16 }}>
              <strong>{editingId ? 'Edit product' : 'New product'}</strong>
              <button className="btn btn-icon" onClick={() => setFormOpen(false)} aria-label="Close"><X size={15} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="field">
                <label>Product photo</label>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <ProductImage src={previewUrl} alt="Preview" size={20} style={{ width: 64, height: 64, borderRadius: 8, flexShrink: 0 }} />
                  <div className="stack" style={{ gap: 6 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={onPickFile}
                      style={{ display: 'none' }}
                      id="product-image-input"
                    />
                    <label htmlFor="product-image-input" className="btn" style={{ cursor: 'pointer', width: 'fit-content' }}>
                      <Upload size={14} /> {previewUrl ? 'Change photo' : 'Upload photo'}
                    </label>
                    {previewUrl && (
                      <button type="button" className="btn-link" onClick={removeImage}>Remove photo</button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPEG, PNG, WEBP, or GIF — up to {MAX_FILE_MB}MB. Stored in the database.</div>
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Category</label>
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. electronics" />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Price (Rs.)</label>
                  <input required type="number" step="0.01" min="0" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Stock</label>
                  <input required type="number" step="1" min="0" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Saving…' : (editingId ? 'Save changes' : 'Add product')}
              </button>
              {error && <div className="error-text">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
