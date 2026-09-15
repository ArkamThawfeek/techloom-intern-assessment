import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { formatProductCode } from '../productCode.js';
import ProductImage from './ProductImage.jsx';

export default function Browse({ query, onOpenProduct, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState('name-asc');
  const [maxPrice, setMaxPrice] = useState(null);
  const priceTouched = useRef(false);

  useEffect(() => { api.listCategories().then(setCategories); }, []);

  useEffect(() => {
    api.searchProducts({ q: query, availableOnly: availableOnly || undefined }).then(setProducts);
  }, [query, availableOnly]);

  const priceCeiling = useMemo(() => {
    if (!products.length) return 100;
    return Math.max(100, Math.ceil(Math.max(...products.map((p) => Number(p.price))) / 10) * 10);
  }, [products]);

  const effectiveMaxPrice = priceTouched.current ? maxPrice : priceCeiling;

  function onPriceChange(value) {
    priceTouched.current = true;
    setMaxPrice(value);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategories.length) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }
    list = list.filter((p) => Number(p.price) <= effectiveMaxPrice);
    const [field, dir] = sort.split('-');
    list = [...list].sort((a, b) => {
      const va = field === 'price' ? Number(a.price) : a.name.toLowerCase();
      const vb = field === 'price' ? Number(b.price) : b.name.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, selectedCategories, sort, effectiveMaxPrice]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  return (
    <div>
      <div className="hero">
        <h2>Everything you need, all in one place.</h2>
        <p>Discover products that fit your lifestyle and your budget.</p>
      </div>

      <div className="browse-layout">
        <div className="filters-panel card">
          <div className="filter-group">
            <div className="filter-title">Category</div>
            {categories.map((c) => (
              <label key={c}>
                <input type="checkbox" checked={selectedCategories.includes(c)} onChange={() => toggleCategory(c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <div className="spread">
              <div className="filter-title" style={{ marginBottom: 0 }}>Max price: Rs. {effectiveMaxPrice}</div>
              {priceTouched.current && (
                <button
                  type="button"
                  className="btn-link"
                  style={{ fontSize: 11 }}
                  onClick={() => { priceTouched.current = false; setMaxPrice(null); }}
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="range" min="0" max={priceCeiling} step="5"
              value={effectiveMaxPrice}
              onChange={(e) => onPriceChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filter-group">
            <div className="filter-title">Availability</div>
            <label>
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
              In stock only
            </label>
          </div>
        </div>

        <div>
          <div className="spread" style={{ marginBottom: 14 }}>
            <strong>Products ({filtered.length})</strong>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          <div className="product-grid">
            {filtered.map((p) => (
              <div className="product-card" key={p.id} onClick={() => onOpenProduct(p.id)}>
                <ProductImage src={p.image_url} alt={p.name} />
                <div className="name">{p.name}</div>
                <div className="cat">{p.category} · {formatProductCode(p.id)}</div>
                <div className="spread">
                  <span className="price num">Rs. {Number(p.price).toFixed(2)}</span>
                  <span className={`pill ${p.stock > 0 ? 'pill-instock' : 'pill-outstock'}`}>
                    {p.stock > 0 ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={p.stock === 0}
                  onClick={(e) => { e.stopPropagation(); onAddToCart(p.id); }}
                >
                  Add to cart
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty">No products match your filters</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
