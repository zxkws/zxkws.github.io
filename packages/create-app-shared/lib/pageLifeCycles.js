var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { SHOW, HIDE } from './constants';
import router from './router';
// visibleListeners => { [pathname]: { show: [], hide: [] } }
var visibleListeners = {};
function addPageLifeCycle(cycle, callback) {
    var _a;
    var pathname = router.current.pathname;
    if (!visibleListeners[pathname]) {
        visibleListeners[pathname] = (_a = {},
            _a[SHOW] = [],
            _a[HIDE] = [],
            _a);
    }
    visibleListeners[pathname][cycle].push(callback);
}
export function emit(cycle, pathname) {
    var _a;
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    // Ensure queue exists
    if (visibleListeners[pathname] && visibleListeners[pathname][cycle]) {
        for (var i = 0, l = visibleListeners[pathname][cycle].length; i < l; i++) {
            (_a = visibleListeners[pathname][cycle])[i].apply(_a, args);
        }
    }
}
function createPageLifeCycle(useEffect) {
    return function (cycle, callback) {
        useEffect(function () {
            // When component did mount, it will trigger usePageShow callback
            if (cycle === SHOW) {
                callback();
            }
            var pathname = router.current.pathname;
            addPageLifeCycle(cycle, callback);
            return function () {
                if (visibleListeners[pathname]) {
                    var index = visibleListeners[pathname][cycle].indexOf(callback);
                    if (index > -1) {
                        visibleListeners[pathname][cycle].splice(index, 1);
                    }
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
    };
}
export function withPageLifeCycle(Component) {
    var Wrapper = /** @class */ (function (_super) {
        __extends(Wrapper, _super);
        function Wrapper(props, context) {
            var _this = _super.call(this, props, context) || this;
            if (_this.onShow) {
                // trigger onShow after addPageLifeCycle
                _this.onShow();
                addPageLifeCycle(SHOW, _this.onShow.bind(_this));
            }
            if (_this.onHide) {
                addPageLifeCycle(HIDE, _this.onHide.bind(_this));
            }
            // Keep the path name corresponding to current page component
            _this.pathname = router.current.pathname;
            return _this;
        }
        Wrapper.prototype.componentWillUnmount = function () {
            var _a;
            // eslint-disable-next-line no-unused-expressions
            (_a = _super.prototype.componentWillUnmount) === null || _a === void 0 ? void 0 : _a.call(this);
            visibleListeners[this.pathname] = null;
        };
        return Wrapper;
    }(Component));
    Wrapper.displayName = "withPageLifeCycle(".concat(Component.displayName || Component.name, ")");
    return Wrapper;
}
export function createUsePageLifeCycle(_a) {
    var useEffect = _a.useEffect;
    var usePageShow = function (callback) {
        createPageLifeCycle(useEffect)(SHOW, callback);
    };
    var usePageHide = function (callback) {
        createPageLifeCycle(useEffect)(HIDE, callback);
    };
    return {
        usePageShow: usePageShow,
        usePageHide: usePageHide
    };
}
//# sourceMappingURL=pageLifeCycles.js.map