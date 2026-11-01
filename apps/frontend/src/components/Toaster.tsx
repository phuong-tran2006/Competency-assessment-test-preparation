import type { ReactNode } from 'react';
import { useUIStore, type ToastKind } from '../store/uiStore';

const ICONS: Record<ToastKind, ReactNode> = {
  success: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  ),
  error: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  ),
  warning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
    />
  ),
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
};

const TONES: Record<ToastKind, { bar: string; icon: string; ring: string }> = {
  success: {
    bar: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-600',
    ring: 'border-emerald-100',
  },
  error: {
    bar: 'bg-red-500',
    icon: 'bg-red-100 text-red-600',
    ring: 'border-red-100',
  },
  warning: {
    bar: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-600',
    ring: 'border-amber-100',
  },
  info: {
    bar: 'bg-blue-900',
    icon: 'bg-blue-100 text-blue-900',
    ring: 'border-blue-100',
  },
};

/**
 * Khu vực hiển thị thông báo nổi, đặt một lần ở App.
 * role="status" + aria-live để trình đọc màn hình đọc được nội dung mới.
 */
export const Toaster = () => {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[100] flex flex-col gap-3 w-[min(22rem,calc(100vw-2.5rem))]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const tone = TONES[t.kind];
        return (
          <div
            key={t.id}
            className={`vact-toast flex overflow-hidden rounded-2xl bg-white border ${tone.ring} shadow-xl`}
          >
            <span className={`w-1.5 shrink-0 ${tone.bar}`} aria-hidden="true" />
            <div className="flex items-start gap-3 p-4 flex-1">
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${tone.icon}`}
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  {ICONS[t.kind]}
                </svg>
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-snug">
                  {t.title}
                </p>
                {t.message && (
                  <p className="mt-1 text-sm text-gray-600 leading-snug">
                    {t.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="shrink-0 text-gray-400 hover:text-gray-700 rounded-lg p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
