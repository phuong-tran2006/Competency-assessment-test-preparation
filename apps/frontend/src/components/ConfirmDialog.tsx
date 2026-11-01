import { useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';

/**
 * Hộp xác nhận dùng chung, thay cho window.confirm.
 * Đặt một lần ở App; mở bằng `await confirmDialog({ title: '...' })`.
 */
export const ConfirmDialog = () => {
  const { open, title, message, confirmLabel, cancelLabel, tone } = useUIStore(
    (s) => s.confirmState,
  );
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Esc để hủy, focus vào nút xác nhận khi mở
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveConfirm(false);
    };
    document.addEventListener('keydown', onKey);
    // Chặn cuộn trang phía sau lớp phủ
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, resolveConfirm]);

  if (!open) return null;

  const danger = tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm vact-overlay"
      onClick={() => resolveConfirm(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vact-confirm-title"
        aria-describedby={message ? 'vact-confirm-message' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="vact-dialog w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}
              aria-hidden="true"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </span>

            <div className="flex-1 min-w-0">
              <h2
                id="vact-confirm-title"
                className="text-lg font-bold text-gray-900 leading-snug"
              >
                {title}
              </h2>
              {message && (
                <p
                  id="vact-confirm-message"
                  className="mt-2 text-sm text-gray-600 leading-relaxed"
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
          >
            {cancelLabel ?? 'Hủy'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => resolveConfirm(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500'
            }`}
          >
            {confirmLabel ?? 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};
