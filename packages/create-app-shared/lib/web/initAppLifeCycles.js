import { SHOW, HIDE, ERROR } from '../constants';
import { getHistory } from '../storage';
import router from '../router';
import { emit as pageEmit } from '../pageLifeCycles';
import { emit } from '../appLifeCycles';
function initAppLifeCycles() {
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
            // Get history
            var history = getHistory();
            var currentPathName = history ? history.location.pathname : router.current.pathname;
            // The app switches from foreground to background
            if (currentPathName === router.current.pathname) {
                router.current.visibilityState = document.visibilityState === 'visible';
                if (router.current.visibilityState) {
                    // Emit app show
                    emit(SHOW);
                    // Emit page show
                    pageEmit(SHOW, router.current.pathname);
                }
                else {
                    // Emit page hide
                    pageEmit(HIDE, router.current.pathname);
                    // Emit app hide
                    emit(HIDE);
                }
            }
        });
        // Emit error lifeCycles
        window.addEventListener('error', function (event) {
            emit(ERROR, null, event.error);
        });
    }
}
export default initAppLifeCycles;
//# sourceMappingURL=initAppLifeCycles.js.map