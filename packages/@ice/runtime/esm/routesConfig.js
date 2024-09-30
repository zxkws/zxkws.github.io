export function getMeta(matches, loadersData) {
    return getMergedValue('meta', matches, loadersData) || [];
}
export function getLinks(matches, loadersData) {
    return getMergedValue('links', matches, loadersData) || [];
}
export function getScripts(matches, loadersData) {
    return getMergedValue('scripts', matches, loadersData) || [];
}
export function getTitle(matches, loadersData) {
    return getMergedValue('title', matches, loadersData);
}
/**
 * merge value for each matched route
 */
function getMergedValue(key, matches, loadersData) {
    var _a;
    let result;
    for (let match of matches) {
        const routeId = match.route.id;
        const data = (_a = loadersData[routeId]) === null || _a === void 0 ? void 0 : _a.pageConfig;
        const value = data === null || data === void 0 ? void 0 : data[key];
        if (Array.isArray(value)) {
            // merge array
            result = result ? result.concat(value) : value;
        }
        else if (value) {
            // overwrite
            result = value;
        }
    }
    return result;
}
/**
 * update routes config to document.
 */
export async function updateRoutesConfig(loaderData) {
    const routeConfig = loaderData === null || loaderData === void 0 ? void 0 : loaderData.pageConfig;
    const title = routeConfig === null || routeConfig === void 0 ? void 0 : routeConfig.title;
    if (title) {
        document.title = title;
    }
    const meta = (routeConfig === null || routeConfig === void 0 ? void 0 : routeConfig.meta) || [];
    const links = (routeConfig === null || routeConfig === void 0 ? void 0 : routeConfig.links) || [];
    const scripts = (routeConfig === null || routeConfig === void 0 ? void 0 : routeConfig.scripts) || [];
    await Promise.all([
        updateMeta(meta),
        updateAssets('link', links),
        updateAssets('script', scripts),
    ]);
}
/**
 * find meta by 'next-meta-count' and update it
 */
function updateMeta(meta) {
    var _a;
    const headEl = document.head;
    const metaCountEl = headEl.querySelector('meta[name=ice-meta-count]');
    if (!metaCountEl) {
        console.warn('Can not find meta element.');
        return;
    }
    const headCount = Number(metaCountEl.content);
    const oldTags = [];
    for (let i = 0, j = metaCountEl.previousElementSibling; i < headCount; i++, j = j === null || j === void 0 ? void 0 : j.previousElementSibling) {
        if (((_a = j === null || j === void 0 ? void 0 : j.tagName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'meta') {
            oldTags.push(j);
        }
    }
    const newTags = meta.map(item => {
        return reactElementToDOM('meta', item);
    });
    oldTags.forEach((t) => t.parentNode.removeChild(t));
    newTags.forEach((t) => headEl.insertBefore(t, metaCountEl));
    metaCountEl.content = (newTags.length).toString();
}
const DOMAttributeNames = {
    acceptCharset: 'accept-charset',
    className: 'class',
    htmlFor: 'for',
    httpEquiv: 'http-equiv',
    noModule: 'noModule',
};
/**
 * map element props to dom
 * https://github.com/vercel/next.js/blob/canary/packages/next/client/head-manager.ts#L9
 */
function reactElementToDOM(type, props) {
    const el = document.createElement(type);
    for (const p in props) {
        // we don't render undefined props to the DOM
        if (props[p] === undefined)
            continue;
        const attr = DOMAttributeNames[p] || p.toLowerCase();
        if (type === 'script' &&
            (attr === 'async' || attr === 'defer' || attr === 'noModule')) {
            el[attr] = !!props[p];
        }
        else {
            el.setAttribute(attr, props[p]);
        }
    }
    return el;
}
const looseToArray = (input) => [].slice.call(input);
/**
 * Load links/scripts for current page.
 * Remove links/scripts for the last page.
 */
async function updateAssets(type, assets) {
    const oldTags = looseToArray(document.querySelectorAll(`${type}[data-route-${type}]`));
    await Promise.all(assets.map((asset) => {
        return appendTags(type, asset);
    }));
    oldTags.forEach((tag) => {
        var _a;
        // In some parcel case oldTags may be removed by other routes.
        (_a = tag.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(tag);
    });
}
async function appendTags(type, props) {
    return new Promise((resolve, reject) => {
        const tag = reactElementToDOM(type, props);
        tag.setAttribute(`data-route-${type}`, 'true');
        tag.onload = () => {
            resolve(null);
        };
        tag.onerror = () => {
            reject();
        };
        document.head.appendChild(tag);
    });
}
