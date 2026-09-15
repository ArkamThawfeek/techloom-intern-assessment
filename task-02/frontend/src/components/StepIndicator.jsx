const STEPS = [
  { id: 1, label: 'Shipping' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Confirmation' }
];

export default function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((s, idx) => (
        <div key={s.id} style={{ display: 'contents' }}>
          <div className={`step ${current === s.id ? 'active' : current > s.id ? 'done' : ''}`}>
            <span className="dot">{s.id}</span>
            {s.label}
          </div>
          {idx < STEPS.length - 1 && <div className="sep" />}
        </div>
      ))}
    </div>
  );
}
