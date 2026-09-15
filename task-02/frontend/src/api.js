function getCustomerId() {
  let id = localStorage.getItem('shopmate_customer_id');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
    localStorage.setItem('shopmate_customer_id', id);
  }
  return id;
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Id': getCustomerId()
    },
    ...options
  });

  let body = null;
  try { body = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.code = body && body.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

async function multipartRequest(path, method, formData) {
  const res = await fetch(path, {
    method,
    headers: { 'X-Customer-Id': getCustomerId() },
    body: formData
  });

  let body = null;
  try { body = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.code = body && body.code;
    throw err;
  }
  return body;
}

function toProductFormData({ name, description, category, price, stock, imageFile, removeImage }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('description', description || '');
  fd.append('category', category || 'general');
  fd.append('price', String(price));
  fd.append('stock', String(stock));
  if (imageFile) fd.append('image', imageFile);
  if (removeImage) fd.append('removeImage', 'true');
  return fd;
}

export const api = {
  searchProducts: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))
    ).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  listCategories: () => request('/products/categories'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => multipartRequest('/products', 'POST', toProductFormData(data)),
  updateProduct: (id, data) => multipartRequest(`/products/${id}`, 'PUT', toProductFormData(data)),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getCart: () => request('/cart'),
  addToCart: (productId, quantity) => request('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  removeFromCart: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),

  checkout: (idempotencyKey) => request('/orders/checkout', { method: 'POST', body: JSON.stringify({ idempotencyKey }) }),
  getOrder: (id) => request(`/orders/${id}`),
  listOrders: () => request('/orders'),
  // No `mode` param exposed from the UI — the gateway decides success/failure itself.
  // It's still accepted here (and by the backend) purely for API-level testing.
  payOrder: (id, { mode, idempotencyKey } = {}) => request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify({ mode, idempotencyKey }) }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' })
};

export function newIdempotencyKey() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
}
