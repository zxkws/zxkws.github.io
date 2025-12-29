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

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUserId(): string {
  if (!USER_ID) {
    let userId = localStorage.getItem('web_monitor_user_id');
    if (!userId) {
      userId = generateUUID();
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

  // Optimize payload: remove undefined/null values if necessary to save bytes
  const payloadStr = JSON.stringify(event);

  // 1. Try sendBeacon (Preferred for reliability on unload, though it uses POST)
  // Most modern analytics use this.
  if (navigator.sendBeacon) {
    const blob = new Blob([payloadStr], { type: 'application/json; charset=UTF-8' });
    const success = navigator.sendBeacon(SDK_OPTIONS.endpoint, blob);
    if (success) return;
  }

  // 2. Fallback to Image Beacon (GET)
  // "GET should be enough" - use 1x1 gif for maximum compatibility.
  // Warning: URL length limits apply (typically ~2KB). Large stack traces may be truncated or fail.
  const query = `?data=${encodeURIComponent(payloadStr)}`;
  const fullUrl = `${SDK_OPTIONS.endpoint}${query}`;
  
  if (fullUrl.length < 2048) {
    const img = new Image();
    img.src = fullUrl;
    return;
  }

  // 3. Fallback to fetch (keepalive) if Image URL is too long or sendBeacon failed/unavailable
  fetch(SDK_OPTIONS.endpoint, {
    method: 'POST',
    body: payloadStr,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    keepalive: true,
  }).catch(error => {
    // Silent fail or minimal log to avoid loops
    // console.error('Failed to send data:', error); 
  });
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
  // Fix: Use addEventListener instead of overwriting window.onerror
  window.addEventListener('error', (event) => {
    if (!SDK_OPTIONS) return;
    
    // ErrorEvent properties
    const { message, filename, lineno, colno, error } = event;

    const errorEvent: MonitorEvent = {
      type: 'error',
      data: {
        message: typeof message === 'string' ? message : 'Script Error',
        source: filename,
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
  }, true); // Use capturing phase to catch more errors

  // Fix: Use addEventListener instead of overwriting window.onunhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
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
  });
}

function setupPerformanceTracking() {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (!SDK_OPTIONS) return;
      // Filter out reports to own endpoint to prevent loops
      if (typeof entry.name === 'string' && isReportEndpoint(entry.name)) return;
      
      const perfEvent: MonitorEvent = {
        type: 'performance',
        data: {
          name: entry.name,
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          ...entry.toJSON(),
        },
        userId: getUserId(),
        timestamp: Date.now(),
        appId: SDK_OPTIONS.appId,
        page: window.location.href,
      };
      sendData(perfEvent);
    });
  });

  const entryTypes = ['paint', 'largest-contentful-paint', 'layout-shift', 'navigation'] as const;
  entryTypes.forEach((type) => {
    try {
      observer.observe({ type, buffered: true });
    } catch {
      // Fallback or ignore
    }
  });
}

export function init(options: Options) {
  SDK_OPTIONS = options;
  getUserId(); 

  trackPageView();

  // Monkey-patch history for SPA support
  // Consider providing an option to disable this if the app handles it
  const originalPushState = history.pushState;
  history.pushState = function (...args: Parameters<History['pushState']>) {
    originalPushState.apply(history, args);
    handleHistoryChange();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args: Parameters<History['replaceState']>) {
    originalReplaceState.apply(history, args);
    handleHistoryChange();
  };

  window.addEventListener('popstate', handleHistoryChange);
  window.addEventListener('hashchange', handleHistoryChange);

  setupErrorTracking();
  setupPerformanceTracking();
}