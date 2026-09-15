export default function StatusBadge({ status }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{status}</span>;
}
