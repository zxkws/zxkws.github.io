const defaultAppConfig = {
    app: {
        strict: false,
        rootId: 'ice-container',
    },
    router: {
        type: 'browser',
    },
};
export default function getAppConfig(appExport) {
    const appConfig = (appExport === null || appExport === void 0 ? void 0 : appExport.default) || {};
    const { app, router, ...others } = appConfig;
    return {
        app: {
            ...defaultAppConfig.app,
            ...(app || {}),
        },
        router: {
            ...defaultAppConfig.router,
            ...(router || {}),
        },
        ...others,
    };
}
export function defineAppConfig(appConfigOrDefineAppConfig) {
    if (typeof appConfigOrDefineAppConfig === 'function') {
        return appConfigOrDefineAppConfig();
    }
    else {
        return appConfigOrDefineAppConfig;
    }
}
