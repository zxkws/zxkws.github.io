type Listener = (_active: boolean) => void;

let counter = 0;
const listeners = new Set<Listener>();

const emit = () => {
  const active = counter > 0;
  listeners.forEach((fn) => fn(active));
};

export const startLoading = () => {
  counter += 1;
  emit();
};

export const stopLoading = () => {
  counter = Math.max(0, counter - 1);
  emit();
};

export const subscribeLoading = (listener: Listener) => {
  listeners.add(listener);
  listener(counter > 0);
  return () => listeners.delete(listener);
};

export const isLoading = () => counter > 0;
