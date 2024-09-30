import { debounce, throttle } from "@packages/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { isDocumentVisible } from "./utils";
import { getCache, setCache } from "./utils/cache";
import limit from "./utils/limit";
import usePersistFn from "./utils/usePersistFn";
import useUpdateEffect from "./utils/useUpdateEffect";
import subscribeFocus from "./utils/windowFocus";
import subscribeVisible from "./utils/windowVisible";

const DEFAULT_KEY = "AHOOKS_USE_REQUEST_DEFAULT_KEY";

class Fetch {
  constructor(service, config, subscribe, initState) {
    this.count = 0;
    this.pollingWhenVisibleFlag = false;
    this.pollingTimer = undefined;
    this.loadingDelayTimer = undefined;
    this.unsubscribe = [];
    this.state = {
      loading: false,
      params: [],
      data: undefined,
      error: undefined,
      run: this.run.bind(this),
      mutate: this.mutate.bind(this),
      refresh: this.refresh.bind(this),
      cancel: this.cancel.bind(this),
      unmount: this.unmount.bind(this),
    };
    this.service = service;
    this.config = config;
    this.subscribe = subscribe;

    if (initState) {
      this.state = { ...this.state, ...initState };
    }

    this.debounceRun = this.config.debounceInterval
      ? debounce(this._run.bind(this), this.config.debounceInterval)
      : undefined;
    this.throttleRun = this.config.throttleInterval
      ? throttle(this._run.bind(this), this.config.throttleInterval)
      : undefined;
    this.limitRefresh = limit(
      this.refresh.bind(this),
      this.config.focusTimespan
    );

    if (this.config.pollingInterval) {
      this.unsubscribe.push(subscribeVisible(this.rePolling.bind(this)));
    }

    if (this.config.refreshOnWindowFocus) {
      this.unsubscribe.push(subscribeFocus(this.limitRefresh.bind(this)));
    }
  }

  setState(s = {}) {
    this.state = { ...this.state, ...s };
    this.subscribe(this.state);
  }

  async _run(...args) {
    if (this.pollingTimer) clearTimeout(this.pollingTimer);
    if (this.loadingDelayTimer) clearTimeout(this.loadingDelayTimer);

    this.count += 1;
    const currentCount = this.count;

    this.setState({ loading: !this.config.loadingDelay, params: args });

    if (this.config.loadingDelay) {
      this.loadingDelayTimer = setTimeout(
        () => this.setState({ loading: true }),
        this.config.loadingDelay
      );
    }

    try {
      const res = await this.service(...args);
      if (currentCount !== this.count) return new Promise(() => {});

      if (this.loadingDelayTimer) clearTimeout(this.loadingDelayTimer);
      const formattedResult = this.config.formatResult
        ? this.config.formatResult(res)
        : res;

      this.setState({
        data: formattedResult,
        error: undefined,
        loading: false,
      });

      if (this.config.onSuccess) this.config.onSuccess(formattedResult, args);
      return formattedResult;
    } catch (error) {
      if (currentCount !== this.count) return new Promise(() => {});

      if (this.loadingDelayTimer) clearTimeout(this.loadingDelayTimer);

      this.setState({ data: undefined, error, loading: false });

      if (this.config.onError) this.config.onError(error, args);

      if (this.config.throwOnError) throw error;

      console.error(error);
      return Promise.reject(
        "useRequest caught an exception. Set options.throwOnError to handle it."
      );
    } finally {
      if (currentCount === this.count && this.config.pollingInterval) {
        if (!isDocumentVisible() && !this.config.pollingWhenHidden) {
          this.pollingWhenVisibleFlag = true;
          return;
        }

        this.pollingTimer = setTimeout(
          () => this._run(...args),
          this.config.pollingInterval
        );
      }
    }
  }

  run(...args) {
    if (this.debounceRun) {
      this.debounceRun(...args);
      return Promise.resolve(null);
    }

    if (this.throttleRun) {
      this.throttleRun(...args);
      return Promise.resolve(null);
    }

    return this._run(...args);
  }

  cancel() {
    if (this.debounceRun) this.debounceRun.cancel();
    if (this.throttleRun) this.throttleRun.cancel();
    if (this.loadingDelayTimer) clearTimeout(this.loadingDelayTimer);
    if (this.pollingTimer) clearTimeout(this.pollingTimer);

    this.pollingWhenVisibleFlag = false;
    this.count += 1;
    this.setState({ loading: false });
  }

  refresh() {
    return this.run(...this.state.params);
  }

  rePolling() {
    if (this.pollingWhenVisibleFlag) {
      this.pollingWhenVisibleFlag = false;
      this.refresh();
    }
  }

  mutate(data) {
    const newData = typeof data === "function" ? data(this.state.data) : data;
    this.setState({ data: newData });
  }

  unmount() {
    this.cancel();
    this.unsubscribe.forEach((s) => s());
  }
}

function useAsync(service, options = {}) {
  const {
    refreshDeps = [],
    manual = false,
    onSuccess = () => {},
    onError = () => {},
    defaultLoading = false,
    loadingDelay,
    pollingInterval = 0,
    pollingWhenHidden = true,
    defaultParams = [],
    refreshOnWindowFocus = false,
    focusTimespan = 5000,
    fetchKey,
    cacheKey,
    cacheTime = 5 * 60 * 1000,
    staleTime = 0,
    debounceInterval,
    throttleInterval,
    initialData,
    ready = true,
    throwOnError = false,
  } = options;

  const newstFetchKey = useRef(DEFAULT_KEY);
  const servicePersist = usePersistFn(service);
  const onSuccessPersist = usePersistFn(onSuccess);
  const onErrorPersist = usePersistFn(onError);
  const fetchKeyPersist = usePersistFn(fetchKey);
  const formatResultPersist = usePersistFn(options.formatResult);

  const config = {
    formatResult: formatResultPersist,
    onSuccess: onSuccessPersist,
    onError: onErrorPersist,
    loadingDelay,
    pollingInterval,
    pollingWhenHidden,
    refreshOnWindowFocus: !manual && refreshOnWindowFocus,
    focusTimespan,
    debounceInterval,
    throttleInterval,
    throwOnError,
  };

  const subscribe = usePersistFn((key, data) => {
    setFetches((s) => ({ ...s, [key]: data }));
  });

  const [fetches, setFetches] = useState(() => {
    if (cacheKey) {
      const cacheData = getCache(cacheKey)?.data;
      if (cacheData) {
        newstFetchKey.current = cacheData.newstFetchKey;
        const newFetches = {};
        Object.keys(cacheData.fetches).forEach((key) => {
          const cacheFetch = cacheData.fetches[key];
          newFetches[key] = new Fetch(
            servicePersist,
            config,
            subscribe.bind(null, key),
            {
              loading: cacheFetch.loading,
              params: cacheFetch.params,
              data: cacheFetch.data,
              error: cacheFetch.error,
            }
          ).state;
        });
        return newFetches;
      }
    }
    return {};
  });

  const fetchesRef = useRef(fetches);
  fetchesRef.current = fetches;

  const readyMemoryParams = useRef();
  const run = useCallback(
    (...args) => {
      if (!ready) {
        readyMemoryParams.current = args;
        return;
      }

      const key = fetchKeyPersist ? fetchKeyPersist(...args) : DEFAULT_KEY;
      newstFetchKey.current = key === undefined ? DEFAULT_KEY : key;

      let currentFetch = fetchesRef.current[newstFetchKey.current];
      if (!currentFetch) {
        const newFetch = new Fetch(
          servicePersist,
          config,
          subscribe.bind(null, newstFetchKey.current),
          {
            data: initialData,
          }
        );
        currentFetch = newFetch.state;
        setFetches((s) => ({ ...s, [newstFetchKey.current]: currentFetch }));
      }

      return currentFetch.run(...args);
    },
    [fetchKey, subscribe, ready]
  );

  const runRef = useRef(run);
  runRef.current = run;

  useUpdateEffect(() => {
    if (cacheKey) {
      setCache(cacheKey, cacheTime, {
        fetches,
        newstFetchKey: newstFetchKey.current,
      });
    }
  }, [cacheKey, fetches]);

  useUpdateEffect(() => {
    if (ready && readyMemoryParams.current) {
      runRef.current(...readyMemoryParams.current);
      readyMemoryParams.current = undefined;
    }
  }, [ready]);

  useEffect(() => {
    if (!manual && Object.keys(fetches).length === 0) {
      runRef.current(...defaultParams);
    }
  }, []);

  const reset = useCallback(() => {
    Object.values(fetchesRef.current).forEach((f) => f.unmount());
    newstFetchKey.current = DEFAULT_KEY;
    setFetches({});
  }, []);

  useUpdateEffect(() => {
    if (!manual) {
      Object.values(fetchesRef.current).forEach((f) => f.refresh());
    }
  }, [...refreshDeps]);

  useEffect(
    () => () => {
      Object.values(fetchesRef.current).forEach((f) => f.unmount());
    },
    []
  );

  const notExecutedWarning = useCallback(() => {
    throw new Error(
      "useRequest hasn't executed. Set manual: true for useRequest to execute."
    );
  }, []);

  return {
    loading: fetches[newstFetchKey.current]?.loading || defaultLoading,
    data: fetches[newstFetchKey.current]?.data,
    error: fetches[newstFetchKey.current]?.error,
    params: fetches[newstFetchKey.current]?.params || [],
    run: manual ? run : notExecutedWarning,
    mutate: fetches[newstFetchKey.current]?.mutate || notExecutedWarning,
    refresh: fetches[newstFetchKey.current]?.refresh || notExecutedWarning,
    cancel: fetches[newstFetchKey.current]?.cancel || notExecutedWarning,
    reset,
  };
}

export default useAsync;
