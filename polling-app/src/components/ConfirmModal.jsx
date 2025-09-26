export default function ConfirmModal({ open, title = "Are you sure?", message, confirmLabel = "Continue", cancelLabel = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl bg-card border border-stroke p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        {message && <p className="text-muted mb-6 whitespace-pre-wrap">{message}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
