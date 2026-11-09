const listeners = new Set();
let nextId = 0;

// duration (ms) opsional; bawaan 5 detik ditetapkan oleh ToastProvider.
export function showToast(message, variant = 'danger', duration) {
  const toast = { id: ++nextId, message: String(message), variant, duration };
  for (const listener of listeners) listener(toast);
  return toast.id;
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
