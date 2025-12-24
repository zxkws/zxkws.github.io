import { v4 as uuidv4 } from 'uuid';

interface Options {
  appId: string;
  endpoint: string;
}

interface MonitorEvent {
  type: string;
  data: any;
  userId: string;
  timestamp: number;
  appId: string;
  page: string;
}

let SDK_OPTIONS: Options;
let USER_ID: string;

function resolveUrl(input: string): string {
  try {
    return new URL(input, window.location.href).toString();
  } catch {
    return input;
  }
}

function isReportEndpoint(url: string): boolean {
  if (!SDK_OPTIONS?.endpoint) return false;
  const endpointAbs = resolveUrl(SDK_OPTIONS.endpoint);
  const urlAbs = resolveUrl(url);
  return urlAbs === endpointAbs || urlAbs.startsWith(`${endpointAbs}?`) || urlAbs.startsWith(endpointAbs);
}

function getUserId(): string {
  if (!USER_ID) {
    let userId = localStorage.getItem('web_monitor_user_id');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('web_monitor_user_id', userId);
    }
    USER_ID = userId;
  }
  return USER_ID;
}

function sendData(event: MonitorEvent) {
  if (!SDK_OPTIONS || !SDK_OPTIONS.endpoint) {
    console.warn('WebMonitor SDK not initialized or endpoint not provided.');
    return;
  }

  const payload = JSON.stringify(event);
  if (navigator.sendBeacon) {
    // Keep it as a "simple" request (text/plain) to avoid CORS preflight.
    navigator.sendBeacon(SDK_OPTIONS.endpoint, payload);
  } else {
    // Fallback for browsers that do not support sendBeacon
    fetch(SDK_OPTIONS.endpoint, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      keepalive: true, // Important for keeping requests alive during page dismissal
    }).catch(error => {
      console.error('Failed to send data via fetch:', error);
    });
  }
}

function trackPageView() {
  if (!SDK_OPTIONS) return;

  const event: MonitorEvent = {
    type: 'pv',
    data: {
      path: window.location.pathname,
      referrer: document.referrer,
      title: document.title,
    },
    userId: getUserId(),
    timestamp: Date.now(),
    appId: SDK_OPTIONS.appId,
    page: window.location.href,
  };
  sendData(event);
}

function handleHistoryChange() {
  trackPageView();
}

function setupErrorTracking() {
  window.onerror = (message, source, lineno, colno, error) => {
    if (!SDK_OPTIONS) return;
    const errorEvent: MonitorEvent = {
      type: 'error',
      data: {
        message: typeof message === 'string' ? message : 'Script Error',
        source,
        lineno,
        colno,
        stack: error ? error.stack : undefined,
        errorType: error ? error.name : 'UnknownError',
      },
      userId: getUserId(),
      timestamp: Date.now(),
      appId: SDK_OPTIONS.appId,
      page: window.location.href,
    };
    sendData(errorEvent);
  };

  window.onunhandledrejection = (event) => {
    if (!SDK_OPTIONS) return;
    const reason = event.reason;
    const errorEvent: MonitorEvent = {
      type: 'error',
      data: {
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        errorType: 'UnhandledPromiseRejection',
      },
      userId: getUserId(),
      timestamp: Date.now(),
      appId: SDK_OPTIONS.appId,
      page: window.location.href,
    };
    sendData(errorEvent);
  };
}

function setupPerformanceTracking() {
  if (!('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver not supported in this browser.');
    return;
  }

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (!SDK_OPTIONS) return;
      // Prevent a feedback loop: reporting itself can generate "resource" entries.
      if (typeof entry.name === 'string' && isReportEndpoint(entry.name)) return;
      const perfEvent: MonitorEvent = {
        type: 'performance',
        data: {
          name: entry.name,
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          // Add more performance-specific data if needed
          ...entry.toJSON(), // Capture all available properties
        },
        userId: getUserId(),
        timestamp: Date.now(),
        appId: SDK_OPTIONS.appId,
        page: window.location.href,
      };
      sendData(perfEvent);
    });
  });

  // Observe common performance metrics
  // Avoid observing "resource" by default: too noisy and can include beacon/fetch, causing recursive reporting.
  // Some browsers throw if "buffered" is used with "entryTypes"; observe per-type with a fallback.
  const entryTypes = ['paint', 'largest-contentful-paint', 'layout-shift', 'navigation'] as const;
  entryTypes.forEach((type) => {
    try {
      observer.observe({ type, buffered: true });
    } catch (error) {
      try {
        observer.observe({ type });
      } catch (observeError) {
        console.warn(`[web-monitor-sdk] PerformanceObserver type not supported: ${type}`, observeError);
      }
    }
  });

  // White Screen Time (approximation - FCP can be a good proxy)
  // More accurate white screen time typically requires monitoring DOM changes
  // or a custom script that determines when the "first meaningful paint" happens.
  // For simplicity and standard compliance, we'll rely on FCP via PerformanceObserver.
}


export function init(options: Options) {
  SDK_OPTIONS = options;
  getUserId(); // Initialize user ID

  // Initial page view
  trackPageView();

  // Track page views for SPA navigation
  const pushState = history.pushState;
  history.pushState = function (...args: Parameters<History['pushState']>) {
    pushState.apply(history, args);
    handleHistoryChange();
  };

  const replaceState = history.replaceState;
  history.replaceState = function (...args: Parameters<History['replaceState']>) {
    replaceState.apply(history, args);
    handleHistoryChange();
  };

  window.addEventListener('popstate', handleHistoryChange);
  window.addEventListener('hashchange', handleHistoryChange); // For hash-based routing

  // Setup error tracking
  setupErrorTracking();

  // Setup performance tracking
  setupPerformanceTracking();
}
