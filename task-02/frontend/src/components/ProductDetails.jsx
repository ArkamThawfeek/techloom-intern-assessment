import { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { api } from '../api.js';
import { formatProductCode } from '../productCode.js';
import ProductImage from './ProductImage.jsx';

export default function ProductDetails({ productId, onBack, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => { api.getProduct(productId).then(setProduct); setQty(1); }, [productId]);

  if (!product) return <div className="empty">Loading…</div>;

  return (
    <div>
      <button className="btn" style={{ marginBottom: 16 }} onClick={onBack}><ArrowLeft size={14} /> Back to products</button>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
        <ProductImage src={product.image_url} alt={product.name} size={56} style={{ aspectRatio: '1', borderRadius: 12 }} />

        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'capitalize' }}>{product.category} · {formatProductCode(product.id)}</div>
          <h1 style={{ margin: '0 0 10px', fontSize: 22 }}>{product.name}</h1>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Rs. {Number(product.price).toFixed(2)}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, maxWidth: 480 }}>{product.description}</p>

          <div className="row" style={{ margin: '16px 0' }}>
            <span className={`pill ${product.stock > 0 ? 'pill-instock' : 'pill-outstock'}`}>
              {product.stock > 0 ? `In stock (${product.stock} available)` : 'Out of stock'}
            </span>
          </div>

          {product.stock > 0 && (
            <div className="row">
              <div className="qty-stepper">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={12} /></button>
                <span className="num">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))}><Plus size={12} /></button>
              </div>
              <button className="btn btn-primary" onClick={() => onAddToCart(product.id, qty)}>Add to cart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
