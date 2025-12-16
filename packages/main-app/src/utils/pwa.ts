type ClearPwaCachesOptions = {
  confirm?: boolean;
  confirmMessage?: string;
};

export const clearPwaCachesAndReload = async (options: ClearPwaCachesOptions = {}) => {
  const { confirm = true, confirmMessage = '确认清理缓存并刷新？（会导致离线缓存失效）' } = options;

  if (confirm && window.confirm(confirmMessage) === false) return;

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }

    if ('serviceWorker' in navigator) {
      const getRegistrations = navigator.serviceWorker.getRegistrations?.bind(navigator.serviceWorker);
      if (getRegistrations) {
        const regs = await getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.unregister();
      }
    }
  } finally {
    window.location.reload();
  }
};
