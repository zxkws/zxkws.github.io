import { onMounted, watch } from 'vue';
import { mainStore } from '@/store';

export function useTheme() {
  const store = mainStore();

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  onMounted(() => {
    applyTheme(store.theme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (store.theme === 'system') {
        applyTheme('system');
      }
    });
  });

  watch(() => store.theme, (newTheme) => {
    applyTheme(newTheme);
  });

  return {
    setTheme: store.setTheme,
  };
}
