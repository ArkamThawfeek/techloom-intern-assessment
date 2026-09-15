import { CheckCircle2 } from 'lucide-react';

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <CheckCircle2 size={15} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
