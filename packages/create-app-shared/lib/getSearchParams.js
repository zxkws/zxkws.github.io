import * as queryString from 'query-string';
import { getHistory } from './storage';
export default function (history) {
    var _a;
    if (history === void 0) { history = getHistory(); }
    // SSR 会在渲染前通过 setHistory 设置通过 request 信息模拟的 history
    var search = (_a = history === null || history === void 0 ? void 0 : history.location) === null || _a === void 0 ? void 0 : _a.search;
    if (!search && typeof window !== 'undefined') {
        search = window.location.search;
    }
    return queryString.parse(search);
}
//# sourceMappingURL=getSearchParams.js.map