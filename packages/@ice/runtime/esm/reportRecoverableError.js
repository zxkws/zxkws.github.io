function isRuntimeWarning(error) {
    return error instanceof Error ? [
        'This Suspense boundary received an update before it finished hydrating.',
    ].some((message) => { var _a; return (_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes(message); }) : false;
}
export const defaultOnRecoverableError = typeof reportError === 'function'
    ? reportError
    : function (error) {
        console['error'](error);
    };
const reportRecoverableError = (error, errorStack, options) => {
    const ignoreError = (options === null || options === void 0 ? void 0 : options.ignoreRuntimeWarning) && isRuntimeWarning(error);
    if (!ignoreError) {
        if (process.env.NODE_ENV === 'production') {
            // Report error stack in production by default.
            if ((errorStack === null || errorStack === void 0 ? void 0 : errorStack.componentStack) && error instanceof Error) {
                const detailError = new Error(error.message);
                detailError.name = error.name;
                detailError.stack = `${error.name}: ${error.message}${errorStack.componentStack}`;
                defaultOnRecoverableError(detailError);
                return;
            }
        }
        // Fallback to default error handler.
        defaultOnRecoverableError(error);
    }
};
export default reportRecoverableError;
