/**
 * Toast Store - Global toast notifications
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
let toastIdSequence = 0;

function createToastId(): string {
  toastIdSequence = (toastIdSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${Date.now()}-${toastIdSequence}`;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function show(message: string, type: ToastType = 'info', duration = 5000) {
    const id = createToastId();
    const toast: Toast = { id, type, message, duration };

    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  function success(message: string, duration?: number) {
    return show(message, 'success', duration);
  }

  function error(message: string, duration?: number) {
    return show(message, 'error', duration ?? 7000);
  }

  function warning(message: string, duration?: number) {
    return show(message, 'warning', duration);
  }

  function info(message: string, duration?: number) {
    return show(message, 'info', duration);
  }

  function remove(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  }

  function clear() {
    toasts.value = [];
  }

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear,
  };
});
