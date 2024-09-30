import { callDataLoader } from './dataLoader.js';
/**
 * Call the getData of app config.
 */
async function getAppData(appExport, requestContext) {
    const hasGlobalLoader = typeof window !== 'undefined' && window.__ICE_DATA_LOADER__;
    const globalLoader = hasGlobalLoader ? window.__ICE_DATA_LOADER__ : null;
    if (globalLoader) {
        return await globalLoader.getData('__app');
    }
    const appDataLoaderConfig = appExport === null || appExport === void 0 ? void 0 : appExport.dataLoader;
    if (!appDataLoaderConfig) {
        return null;
    }
    if (process.env.ICE_CORE_REMOVE_DATA_LOADER !== 'true') {
        let loader;
        if (typeof appDataLoaderConfig === 'function' || Array.isArray(appDataLoaderConfig)) {
            loader = appDataLoaderConfig;
        }
        else {
            loader = appDataLoaderConfig.loader;
        }
        return await callDataLoader(loader, requestContext);
    }
}
export { getAppData, };
