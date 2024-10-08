import { SHOW, HIDE, ERROR, LAUNCH, NOT_FOUND, SHARE, TAB_ITEM_CLICK, UNHANDLED_REJECTION } from '../constants';
import { emit } from '../appLifeCycles';
function initAppLifeCycles() {
    window.addEventListener(LAUNCH, function (_a) {
        var options = _a.options, context = _a.context;
        emit(LAUNCH, context, options);
    });
    window.addEventListener('appshow', function (_a) {
        var options = _a.options, context = _a.context;
        emit(SHOW, context, options);
    });
    window.addEventListener('apphide', function (_a) {
        var context = _a.context;
        emit(HIDE, context);
    });
    window.addEventListener('apperror', function (_a) {
        var context = _a.context, error = _a.error;
        emit(ERROR, context, error);
    });
    window.addEventListener('pagenotfound', function (_a) {
        var context = _a.context, options = _a.options;
        emit(NOT_FOUND, context, options);
    });
    window.addEventListener('appshare', function (_a) {
        var context = _a.context, shareInfo = _a.shareInfo, options = _a.options;
        emit(SHARE, context, shareInfo, options);
    });
    window.addEventListener('tabitemclick', function (_a) {
        var options = _a.options, context = _a.context;
        emit(TAB_ITEM_CLICK, context, options);
    });
    window.addEventListener('unhandledrejection', function (_a) {
        var options = _a.options, context = _a.context;
        emit(UNHANDLED_REJECTION, context, options);
    });
}
export default initAppLifeCycles;
//# sourceMappingURL=initAppLifeCycles.js.map