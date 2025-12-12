import type { ChatStateSnapshot } from '../types';

const STORAGE_KEY = 'codex-chat-state@v1';

export const loadSnapshot = (): ChatStateSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ChatStateSnapshot;
    if (!parsed.conversations) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[codex-chat-app] Failed to load snapshot', error);
    return null;
  }
};

export const persistSnapshot = (snapshot: ChatStateSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[codex-chat-app] Failed to persist snapshot', error);
  }
};

export const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};
