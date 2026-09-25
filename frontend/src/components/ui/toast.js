const listeners = new Set();
let nextId = 0;

export function showToast(message, variant = 'danger') {
  const toast = { id: ++nextId, message: String(message), variant };
  for (const listener of listeners) listener(toast);
  return toast.id;
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
