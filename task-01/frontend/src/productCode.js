// Turns the database id (already guaranteed unique) into a human-readable code,
// e.g. id=7 -> "P0007". No schema change needed — the uniqueness already exists.
export function formatProductCode(id) {
  return `P${String(id).padStart(4, '0')}`;
}
