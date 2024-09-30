var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var RuntimeModule = /** @class */ (function () {
    function RuntimeModule(appConfig, buildConfig, context, staticConfig) {
        var _this = this;
        this.registerRuntimeAPI = function (key, api) {
            if (_this.apiRegistration[key]) {
                console.warn("api ".concat(key, " had already been registered"));
            }
            else {
                _this.apiRegistration[key] = api;
            }
        };
        this.applyRuntimeAPI = function (key) {
            var _a;
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (!_this.apiRegistration[key]) {
                console.warn("unknown api ".concat(key));
            }
            else {
                return (_a = _this.apiRegistration)[key].apply(_a, args);
            }
        };
        this.setRuntimeValue = function (key, value) {
            if (Object.prototype.hasOwnProperty.call(_this.internalValue, key)) {
                console.warn("internal value ".concat(key, " had already been registered"));
            }
            else {
                _this.internalValue[key] = value;
            }
        };
        this.getRuntimeValue = function (key) {
            return _this.internalValue[key];
        };
        // plugin-router 会调用
        this.setRenderApp = function (renderRouter) {
            _this.renderApp = renderRouter;
        };
        // plugin-icestark 会调用
        this.wrapperRouterRender = function (wrapper) {
            // pass origin router render for custom requirement
            _this.renderApp = wrapper(_this.renderApp);
        };
        this.addProvider = function (Provider) {
            // must promise user's providers are wrapped by the plugins' providers
            _this.AppProvider.unshift(Provider);
        };
        this.addDOMRender = function (render) {
            _this.modifyDOMRender = render;
        };
        this.modifyRoutes = function (modifyFn) {
            _this.modifyRoutesRegistration.push(modifyFn);
        };
        this.modifyRoutesComponent = function (modify) {
            _this.routesComponent = modify(_this.routesComponent);
        };
        this.wrapperPageComponent = function (wrapperPage) {
            _this.wrapperPageRegistration.push(wrapperPage);
        };
        this.wrapperRoutes = function (routes) {
            return routes.map(function (item) {
                if (item.children) {
                    item.children = _this.wrapperRoutes(item.children);
                }
                else if (item.component) {
                    item.routeWrappers = _this.wrapperPageRegistration;
                }
                return item;
            });
        };
        this.getWrapperPageRegistration = function () {
            return _this.wrapperPageRegistration;
        };
        this.getAppComponent = function () {
            var _a;
            // 表示是否启用 pluin-router runtime，何时不启用：1. SPA + router: false 2. MPA + 对应 pages 文件下面没有 routes.[j|t]s 这个文件
            var enableRouter = _this.getRuntimeValue('enableRouter');
            if (enableRouter) {
                var routes = _this.wrapperRoutes(_this.modifyRoutesRegistration.reduce(function (acc, curr) {
                    return curr(acc);
                }, []));
                // renderApp define by plugin-router
                return _this.renderApp(routes, _this.routesComponent);
            }
            else {
                // 通过 appConfig.app.renderComponent 渲染
                var renderComponent = (_a = _this.appConfig.app) === null || _a === void 0 ? void 0 : _a.renderComponent;
                // default renderApp
                return _this.renderApp(_this.wrapperPageRegistration.reduce(function (acc, curr) {
                    var compose = curr(acc);
                    if (acc.pageConfig) {
                        compose.pageConfig = acc.pageConfig;
                    }
                    if (acc.getInitialProps) {
                        compose.getInitialProps = acc.getInitialProps;
                    }
                    return compose;
                }, renderComponent));
            }
        };
        this.AppProvider = [];
        this.appConfig = appConfig;
        this.buildConfig = buildConfig;
        this.context = context;
        // Rax App 里的 app.json
        this.staticConfig = staticConfig;
        this.modifyDOMRender = null;
        this.apiRegistration = {};
        this.internalValue = {};
        this.renderApp = function (AppComponent) { return AppComponent; };
        this.routesComponent = false;
        this.modifyRoutesRegistration = [];
        this.wrapperPageRegistration = [];
    }
    RuntimeModule.prototype.loadModule = function (module) {
        var enableRouter = this.getRuntimeValue('enableRouter');
        var runtimeAPI = {
            addProvider: this.addProvider,
            addDOMRender: this.addDOMRender,
            applyRuntimeAPI: this.applyRuntimeAPI,
            wrapperPageComponent: this.wrapperPageComponent,
            appConfig: this.appConfig,
            buildConfig: this.buildConfig,
            context: this.context,
            setRenderApp: this.setRenderApp,
            staticConfig: this.staticConfig,
            getRuntimeValue: this.getRuntimeValue,
        };
        if (enableRouter) {
            runtimeAPI = __assign(__assign({}, runtimeAPI), { modifyRoutes: this.modifyRoutes, wrapperRouterRender: this.wrapperRouterRender, modifyRoutesComponent: this.modifyRoutesComponent });
        }
        var runtimeModule = module.default || module;
        if (module)
            runtimeModule(runtimeAPI);
    };
    RuntimeModule.prototype.composeAppProvider = function () {
        var _this = this;
        if (!this.AppProvider.length)
            return null;
        return this.AppProvider.reduce(function (ProviderComponent, CurrentProvider) {
            return function (_a) {
                var children = _a.children, rest = __rest(_a, ["children"]);
                var element = CurrentProvider
                    ? _this.context.createElement(CurrentProvider, __assign({}, rest), children)
                    : children;
                return _this.context.createElement(ProviderComponent, __assign({}, rest), element);
            };
        });
    };
    return RuntimeModule;
}());
export default RuntimeModule;
//# sourceMappingURL=runtimeModule.js.map