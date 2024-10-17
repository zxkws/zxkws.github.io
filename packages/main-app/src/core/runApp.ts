import { setAppConfig } from '@/config/appConfig';
import { initHistory } from './initHistory';
import { reactAppRenderer } from './renderer';
import ErrorBoundary from './ErrorBoundary';



const createBaseApp = () => {};

export const runApp = (appConfig) => {
  setAppConfig(appConfig);
  initHistory(appConfig);
  reactAppRenderer({
    ErrorBoundary,
    appConfig,
    appLifecycle: {
      createBaseApp,
    },
  });
};
