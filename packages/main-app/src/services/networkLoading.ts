type Listener = (_active: boolean) => void;

let counter = 0;
const listeners = new Set<Listener>();

const emit = () => {
  const active = counter > 0;
  for (const fn of listeners) {
    fn(active);
  }
};

export const pushLoading = () => {
  counter += 1;
  emit();
};

export const popLoading = () => {
  counter = Math.max(0, counter - 1);
  emit();
};

export const subscribeLoading = (listener: Listener) => {
  listeners.add(listener);
  listener(counter > 0);
  return () => listeners.delete(listener);
};

export const resetLoading = () => {
  counter = 0;
  emit();
};

export const isLoading = () => counter > 0;
