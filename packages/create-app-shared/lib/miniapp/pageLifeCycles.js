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
import { SHOW, HIDE, MINIAPP_PAGE_LIFECYCLE } from '../constants';
function addPageLifeCycle(cycle, callback) {
    document.addEventListener(MINIAPP_PAGE_LIFECYCLE[cycle], callback);
}
function createPageLifeCycle(useEffect) {
    return function (cycle, callback) {
        useEffect(function () {
            // When component did mount, it will trigger usePageShow callback
            if (cycle === SHOW) {
                callback();
            }
            addPageLifeCycle(cycle, callback);
            return function () {
                document.removeEventListener(MINIAPP_PAGE_LIFECYCLE[cycle], callback);
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
                addPageLifeCycle(SHOW, _this.onShow.bind(_this));
            }
            if (_this.onHide) {
                addPageLifeCycle(HIDE, _this.onHide.bind(_this));
            }
            return _this;
        }
        Wrapper.prototype.componentWillUnmount = function () {
            var _a;
            // eslint-disable-next-line no-unused-expressions
            (_a = _super.prototype.componentWillUnmount) === null || _a === void 0 ? void 0 : _a.call(this);
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