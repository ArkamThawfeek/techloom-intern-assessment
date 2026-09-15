export function formatProductCode(id) {
  return `P${String(id).padStart(4, '0')}`;
}
