import { createBrowserHistory, createHashHistory, createMemoryHistory } from 'history';
import createInitHistory from '../createInitHistory';
import { setHistory } from '../storage';
var createHistory = function (_a) {
    var type = _a.type, basename = _a.basename, location = _a.location, customHistory = _a.customHistory, initialIndex = _a.initialIndex, initialEntries = _a.initialEntries;
    var history;
    if (process.env.__IS_SERVER__) {
        history = createMemoryHistory();
        history.location = location;
    }
    else if (customHistory) {
        history = customHistory;
    }
    else if (type === 'hash') {
        history = createHashHistory({ basename: basename });
    }
    else if (type === 'browser') {
        history = createBrowserHistory({ basename: basename });
    }
    else {
        history = createMemoryHistory({
            initialIndex: initialIndex,
            initialEntries: initialEntries
        });
    }
    setHistory(history);
    return history;
};
var initHistory = createInitHistory(createHistory);
export { initHistory };
export default createHistory;
//# sourceMappingURL=history.js.map