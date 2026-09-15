async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
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

export const api = {
  listProducts: () => request('/products'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  listOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (items, idempotencyKey) =>
    request('/orders', { method: 'POST', body: JSON.stringify({ items, idempotencyKey }) }),
  payOrder: (id, { mode, idempotencyKey }) =>
    request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify({ mode, idempotencyKey }) }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' })
};

export function newIdempotencyKey() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
}
