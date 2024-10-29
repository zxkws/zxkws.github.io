import { createBrowserHistory } from 'history';
import { setHistory } from './storage';

const createHistory = (config: { basename: string }) => {
  const { basename } = config;
  const history = createBrowserHistory({ basename } as any);
  setHistory(history);
  return history;
};

export const initHistory = createHistory;
