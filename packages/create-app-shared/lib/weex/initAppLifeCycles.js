import { SHOW, HIDE } from '../constants';
import router from '../router';
import { emit as pageEmit } from '../pageLifeCycles';
import { emit } from '../appLifeCycles';
function initAppLifeCycles() {
    try {
        // https://weex.apache.org/docs/modules/globalEvent.html#addeventlistener
        // Use __weex_require__ in Rax project.
        var globalEvent = __weex_require__('@weex-module/globalEvent');
        globalEvent.addEventListener('WXApplicationDidBecomeActiveEvent', function () {
            router.current.visibilityState = true;
            // Emit app show
            emit(SHOW);
            // Emit page show
            pageEmit(SHOW, router.current.pathname);
        });
        globalEvent.addEventListener('WXApplicationWillResignActiveEvent', function () {
            router.current.visibilityState = false;
            // Emit page hide
            pageEmit(HIDE, router.current.pathname);
            // Emit app hide
            emit(HIDE);
        });
    }
    catch (err) {
        console.log("@weex-module/globalEvent error: ".concat(err));
    }
}
export default initAppLifeCycles;
//# sourceMappingURL=initAppLifeCycles.js.map