import RuntimeModule from './runtimeModule';
import { DEFAULT_APP_CONFIG } from './constants';
import collectAppLifeCycle from './collectAppLifeCycle';
function mergeDefaultConfig(defaultConfig, config) {
    Object.keys(defaultConfig).forEach(function (key) {
        if (typeof config[key] === 'object' && config[key] !== null) {
            config[key] = mergeDefaultConfig(defaultConfig[key], config[key]);
        }
        else if (!Object.prototype.hasOwnProperty.call(config, key)) {
            config[key] = defaultConfig[key];
        }
    });
    return config;
}
export default (function (_a) {
    var loadRuntimeModules = _a.loadRuntimeModules, createElement = _a.createElement, _b = _a.runtimeAPI, runtimeAPI = _b === void 0 ? {} : _b, _c = _a.runtimeValue, runtimeValue = _c === void 0 ? {} : _c;
    var createBaseApp = function (appConfig, buildConfig, context, staticConfig) {
        // Merge default appConfig to user appConfig
        appConfig = mergeDefaultConfig(DEFAULT_APP_CONFIG, appConfig);
        context.createElement = createElement;
        context.enableRouter = runtimeValue.enableRouter;
        // Load runtime modules
        var runtime = new RuntimeModule(appConfig, buildConfig, context, staticConfig);
        Object.keys(runtimeAPI).forEach(function (apiKey) {
            runtime.registerRuntimeAPI(apiKey, runtimeAPI[apiKey]);
        });
        // Assign runtime plugin internal value
        Object.keys(runtimeValue).forEach(function (key) {
            runtime.setRuntimeValue(key, runtimeValue[key]);
        });
        loadRuntimeModules(runtime);
        // Collect app lifeCyle
        collectAppLifeCycle(appConfig);
        return {
            runtime: runtime,
            appConfig: appConfig
        };
    };
    return createBaseApp;
});
//# sourceMappingURL=createBaseApp.js.map