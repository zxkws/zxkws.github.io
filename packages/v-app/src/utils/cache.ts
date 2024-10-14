const namespace = "ICESTARK";

declare global {
  interface Window {
    [namespace]: Record<string, any>;
  }
}

export const setCache = (key: string, value: unknown) => {
  if (!window[namespace]) {
    window[namespace] = {};
  }
  window[namespace][key] = value;
};

export const getCache = (key: string) => {
  const iceStark = window[namespace];
  return iceStark && iceStark[key] ? iceStark[key] : null;
};
