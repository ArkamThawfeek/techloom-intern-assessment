import { CheckCircle2, XCircle, Clock, CopyX } from 'lucide-react';

const ICONS = { success: CheckCircle2, danger: XCircle, warn: Clock, duplicate: CopyX };

export default function ResultModal({ tone, title, description, actionLabel = 'OK', onClose }) {
  const Icon = ICONS[tone] || ICONS.warn;
  const circleTone = tone === 'success' ? 'success' : tone === 'danger' || tone === 'duplicate' ? 'danger' : 'warn';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon-circle ${circleTone}`}>
          <Icon size={30} />
        </div>
        <div className="modal-title">{title}</div>
        <div className="modal-desc">{description}</div>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
