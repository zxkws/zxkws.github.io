import { onMounted, watch } from 'vue';
import { mainStore } from '@/store';

export function useTheme() {
  const store = mainStore();

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = systemDark ? 'dark' : 'light';
      root.classList.toggle('dark', resolved === 'dark');
      root.setAttribute('data-theme', resolved);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }
  };

  onMounted(() => {
    applyTheme(store.theme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_event) => {
      if (store.theme === 'system') {
        applyTheme('system');
      }
    });
  });

  watch(
    () => store.theme,
    (newTheme) => {
      applyTheme(newTheme);
    },
  );

  return {
    setTheme: store.setTheme,
  };
}
