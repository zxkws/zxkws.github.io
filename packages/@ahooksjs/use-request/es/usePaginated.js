var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __rest = this && this.__rest || function (s, e) {
  var t = {};

  for (var p in s) {
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  }

  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
};

var __read = this && this.__read || function (o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o),
      r,
      ar = [],
      e;

  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) {
      ar.push(r.value);
    }
  } catch (error) {
    e = {
      error: error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }

  return ar;
};

var __spread = this && this.__spread || function () {
  for (var ar = [], i = 0; i < arguments.length; i++) {
    ar = ar.concat(__read(arguments[i]));
  }

  return ar;
};

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useAsync from './useAsync';
import useUpdateEffect from './utils/useUpdateEffect';

function usePaginated(service, options) {
  var paginated = options.paginated,
      _a = options.defaultPageSize,
      defaultPageSize = _a === void 0 ? 10 : _a,
      _b = options.refreshDeps,
      refreshDeps = _b === void 0 ? [] : _b,
      fetchKey = options.fetchKey,
      restOptions = __rest(options, ["paginated", "defaultPageSize", "refreshDeps", "fetchKey"]);

  useEffect(function () {
    if (fetchKey) {
      console.error("useRequest pagination's fetchKey will not work!");
    }
  }, []);

  var _c = useAsync(service, __assign({
    defaultParams: [{
      current: 1,
      pageSize: defaultPageSize
    }]
  }, restOptions)),
      data = _c.data,
      params = _c.params,
      run = _c.run,
      loading = _c.loading,
      rest = __rest(_c, ["data", "params", "run", "loading"]);

  var _d = params && params[0] ? params[0] : {},
      _e = _d.current,
      current = _e === void 0 ? 1 : _e,
      _f = _d.pageSize,
      pageSize = _f === void 0 ? defaultPageSize : _f,
      _g = _d.sorter,
      sorter = _g === void 0 ? {} : _g,
      _h = _d.filters,
      filters = _h === void 0 ? {} : _h; // 只改变 pagination，其他参数原样传递


  var runChangePagination = useCallback(function (paginationParams) {
    var _a = __read(params),
        oldPaginationParams = _a[0],
        restParams = _a.slice(1);

    run.apply(void 0, __spread([__assign(__assign({}, oldPaginationParams), paginationParams)], restParams));
  }, [run, params]);
  var total = (data === null || data === void 0 ? void 0 : data.total) || 0;
  var totalPage = useMemo(function () {
    return Math.ceil(total / pageSize);
  }, [pageSize, total]);
  var onChange = useCallback(function (c, p) {
    var toCurrent = c <= 0 ? 1 : c;
    var toPageSize = p <= 0 ? 1 : p;
    var tempTotalPage = Math.ceil(total / toPageSize);

    if (toCurrent > tempTotalPage) {
      toCurrent = Math.max(1, tempTotalPage);
    }

    runChangePagination({
      current: toCurrent,
      pageSize: toPageSize
    });
  }, [total, runChangePagination]);
  var changeCurrent = useCallback(function (c) {
    onChange(c, pageSize);
  }, [onChange, pageSize]);
  var changePageSize = useCallback(function (p) {
    onChange(current, p);
  }, [onChange, current]);
  var changeCurrentRef = useRef(changeCurrent);
  changeCurrentRef.current = changeCurrent;
  /* 分页场景下，如果 refreshDeps 变化，重置分页 */

  useUpdateEffect(function () {
    /* 只有自动执行的场景， refreshDeps 才有效 */
    if (!options.manual) {
      changeCurrentRef.current(1);
    }
  }, __spread(refreshDeps)); // 表格翻页 排序 筛选等

  var changeTable = useCallback(function (p, f, s) {
    runChangePagination({
      current: p.current,
      pageSize: p.pageSize || defaultPageSize,
      filters: f,
      sorter: s
    });
  }, [filters, sorter, runChangePagination]);
  return __assign({
    loading: loading,
    data: data,
    params: params,
    run: run,
    pagination: {
      current: current,
      pageSize: pageSize,
      total: total,
      totalPage: totalPage,
      onChange: onChange,
      changeCurrent: changeCurrent,
      changePageSize: changePageSize
    },
    tableProps: {
      dataSource: (data === null || data === void 0 ? void 0 : data.list) || [],
      loading: loading,
      onChange: changeTable,
      pagination: {
        current: current,
        pageSize: pageSize,
        total: total
      }
    },
    sorter: sorter,
    filters: filters
  }, rest);
}

export default usePaginated;