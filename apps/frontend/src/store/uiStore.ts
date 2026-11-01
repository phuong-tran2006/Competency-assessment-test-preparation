import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  /** Thời gian tự tắt (ms). 0 = không tự tắt. */
  duration: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: nút xác nhận màu đỏ (hành động khó hoàn tác). */
  tone?: 'default' | 'danger';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((ok: boolean) => void) | null;
}

interface UIState {
  toasts: Toast[];
  confirmState: ConfirmState;

  notify: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => number;
  success: (title: string, message?: string) => number;
  error: (title: string, message?: string) => number;
  info: (title: string, message?: string) => number;
  warning: (title: string, message?: string) => number;
  dismiss: (id: number) => void;

  /** Mở hộp xác nhận, trả Promise<boolean> để dùng thay window.confirm. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

const CLOSED: ConfirmState = {
  open: false,
  title: '',
  message: undefined,
  confirmLabel: undefined,
  cancelLabel: undefined,
  tone: 'default',
  resolve: null,
};

let nextId = 1;

export const useUIStore = create<UIState>()((set, get) => ({
  toasts: [],
  confirmState: CLOSED,

  notify: ({ kind, title, message, duration }) => {
    const id = nextId++;
    // Lỗi mặc định giữ lâu hơn vì người dùng cần thời gian đọc
    const ms = duration ?? (kind === 'error' ? 6000 : 4000);
    set((state) => ({
      toasts: [...state.toasts, { id, kind, title, message, duration: ms }],
    }));
    if (ms > 0) {
      setTimeout(() => get().dismiss(id), ms);
    }
    return id;
  },

  success: (title, message) => get().notify({ kind: 'success', title, message }),
  error: (title, message) => get().notify({ kind: 'error', title, message }),
  info: (title, message) => get().notify({ kind: 'info', title, message }),
  warning: (title, message) => get().notify({ kind: 'warning', title, message }),

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ confirmState: { ...CLOSED, ...options, open: true, resolve } });
    }),

  resolveConfirm: (ok) => {
    const { resolve } = get().confirmState;
    set({ confirmState: CLOSED });
    resolve?.(ok);
  },
}));

/** Dùng được ngoài component React (service, interceptor). */
export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().success(title, message),
  error: (title: string, message?: string) =>
    useUIStore.getState().error(title, message),
  info: (title: string, message?: string) =>
    useUIStore.getState().info(title, message),
  warning: (title: string, message?: string) =>
    useUIStore.getState().warning(title, message),
};

/** Thay cho window.confirm: const ok = await confirmDialog({ title: '...' }) */
export const confirmDialog = (options: ConfirmOptions) =>
  useUIStore.getState().confirm(options);
