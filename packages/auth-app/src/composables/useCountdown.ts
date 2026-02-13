import { onBeforeUnmount, ref } from 'vue';

export const useCountdown = () => {
  const secondsLeft = ref(0);
  let timer: number | null = null;

  const start = (seconds: number) => {
    secondsLeft.value = Math.max(0, Math.floor(seconds));
    if (timer) window.clearInterval(timer);
    if (secondsLeft.value <= 0) return;
    timer = window.setInterval(() => {
      secondsLeft.value = Math.max(0, secondsLeft.value - 1);
      if (secondsLeft.value <= 0 && timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }, 1000);
  };

  const stop = () => {
    secondsLeft.value = 0;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
  });

  return { secondsLeft, start, stop };
};

