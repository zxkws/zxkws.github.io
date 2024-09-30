import { useLoaderData } from 'react-router-dom';
function useData() {
    var _a;
    return (_a = useLoaderData()) === null || _a === void 0 ? void 0 : _a.data;
}
function useConfig() {
    var _a;
    return (_a = useLoaderData()) === null || _a === void 0 ? void 0 : _a.pageConfig;
}
export { useData, useConfig, };
