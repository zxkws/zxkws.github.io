import { useRef, useContext } from 'react';
import useAsync from './useAsync';
import useLoadMore from './useLoadMore';
import usePaginated from './usePaginated';
import ConfigContext from './configContext';

function useRequest(service, options = {}) {
  const contextConfig = useContext(ConfigContext);
  const finalOptions = { ...contextConfig, ...options };

  const { paginated, loadMore, requestMethod } = finalOptions;
  const paginatedRef = useRef(paginated);
  const loadMoreRef = useRef(loadMore);

  if (paginatedRef.current !== paginated) {
    throw new Error('You should not modify the paginated of options');
  }

  if (loadMoreRef.current !== loadMore) {
    throw new Error('You should not modify the loadMore of options');
  }

  paginatedRef.current = paginated;
  loadMoreRef.current = loadMore;

  // Default fetch function proxy
  const fetchProxy = (...args) =>
    fetch(...args).then((res) => {
      if (res.ok) {
        return res.json();
      }
      throw new Error(res.statusText);
    });

  const finalRequestMethod = requestMethod || fetchProxy;
  let promiseService;

  switch (typeof service) {
    case 'string':
      promiseService = () => finalRequestMethod(service);
      break;

    case 'object':
      const { url, ...rest } = service;
      promiseService = () => requestMethod ? requestMethod(service) : fetchProxy(url, rest);
      break;

    default:
      promiseService = (...args) => {
        return new Promise((resolve, reject) => {
          const s = service(...args);
          let fn = s;

          if (!s.then) {
            switch (typeof s) {
              case 'string':
                fn = finalRequestMethod(s);
                break;

              case 'object':
                const { url, ...rest } = s;
                fn = requestMethod ? requestMethod(s) : fetchProxy(url, rest);
                break;
            }
          }

          fn.then(resolve).catch(reject);
        });
      };
  }

  if (loadMore) {
    return useLoadMore(promiseService, finalOptions);
  }

  if (paginated) {
    return usePaginated(promiseService, finalOptions);
  }

  return useAsync(promiseService, finalOptions);
}

const UseRequestProvider = ConfigContext.Provider;
// UseAPIProvider 已经废弃，此处为了兼容 umijs 插件 plugin-request
const UseAPIProvider = UseRequestProvider;

export { useAsync, usePaginated, useLoadMore, UseRequestProvider, UseAPIProvider };
export default useRequest;
