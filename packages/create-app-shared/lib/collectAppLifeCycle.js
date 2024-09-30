import { addAppLifeCycle } from './appLifeCycles';
import { SHOW, LAUNCH, ERROR, HIDE, TAB_ITEM_CLICK, NOT_FOUND, SHARE, UNHANDLED_REJECTION, } from './constants';
export default function collectAppLifeCycle(appConfig) {
    var _a = appConfig.app, onLaunch = _a.onLaunch, onShow = _a.onShow, onError = _a.onError, onHide = _a.onHide, onTabItemClick = _a.onTabItemClick;
    // multi-end valid lifecycle
    // Add app launch callback
    addAppLifeCycle(LAUNCH, onLaunch);
    // Add app show callback
    addAppLifeCycle(SHOW, onShow);
    // Add app error callback
    addAppLifeCycle(ERROR, onError);
    // Add app hide callback
    addAppLifeCycle(HIDE, onHide);
    // Add tab bar item click callback
    addAppLifeCycle(TAB_ITEM_CLICK, onTabItemClick);
    // Add lifecycle callbacks which only valid in Alibaba MiniApp
    var _b = appConfig.app, onPageNotFound = _b.onPageNotFound, onShareAppMessage = _b.onShareAppMessage, onUnhandledRejection = _b.onUnhandledRejection;
    // Add global share callback
    addAppLifeCycle(SHARE, onShareAppMessage);
    // Add unhandledrejection callback
    addAppLifeCycle(UNHANDLED_REJECTION, onUnhandledRejection);
    // Add page not found callback
    addAppLifeCycle(NOT_FOUND, onPageNotFound);
}
//# sourceMappingURL=collectAppLifeCycle.js.map