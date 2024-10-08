import { DEFAULT_APP_CONFIG } from './constants';
export default (function (createHistory) {
    return function (appConfig, options) {
        if (options === void 0) { options = { staticConfig: { routes: [] } }; }
        if (!appConfig.router) {
            appConfig.router = DEFAULT_APP_CONFIG.router;
        }
        var _a = options.initialContext, initialContext = _a === void 0 ? null : _a, _b = options.staticConfig, staticConfig = _b === void 0 ? { routes: [] } : _b;
        var router = appConfig.router;
        var _c = router.type, type = _c === void 0 ? DEFAULT_APP_CONFIG.router.type : _c, basename = router.basename, customHistory = router.history, initialEntries = router.initialEntries, initialIndex = router.initialIndex;
        var location = initialContext ? initialContext.location : null;
        var newHistory = createHistory({
            type: type,
            basename: basename,
            location: location,
            customHistory: customHistory,
            routes: staticConfig.routes,
            initialEntries: initialEntries,
            initialIndex: initialIndex
        });
        appConfig.router.history = newHistory;
    };
});
//# sourceMappingURL=createInitHistory.js.map