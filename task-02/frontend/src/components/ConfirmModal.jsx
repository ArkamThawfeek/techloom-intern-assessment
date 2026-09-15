import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, description, confirmLabel = 'Confirm', onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-circle warn"><AlertTriangle size={28} /></div>
        <div className="modal-title">{title}</div>
        <div className="modal-desc">{description}</div>
        <div className="row">
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Keep order</button>
          <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
