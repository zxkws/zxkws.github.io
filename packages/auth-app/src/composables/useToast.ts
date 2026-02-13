import { onBeforeUnmount, ref } from 'vue';

export type ToastPayload = { text: string; type: 'error' | 'success' };

export const useToast = () => {
  const toast = ref<ToastPayload | null>(null);
  let timer: number | null = null;

  const showToast = (text: string, type: ToastPayload['type'] = 'error') => {
    toast.value = { text, type };
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast.value = null;
    }, 3200);
  };

  onBeforeUnmount(() => {
    if (timer) window.clearTimeout(timer);
  });

  return { toast, showToast };
};

