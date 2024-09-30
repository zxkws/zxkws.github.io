import { getHistory } from '../storage';
export default function (history) {
    var _a;
    if (history === void 0) { history = getHistory(); }
    return ((_a = history === null || history === void 0 ? void 0 : history.location) === null || _a === void 0 ? void 0 : _a._currentPageOptions) || {};
}
//# sourceMappingURL=getSearchParams.js.map