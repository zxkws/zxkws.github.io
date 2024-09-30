import * as React from 'react';
import { useAppContext, useAppData } from './AppContext.js';
import { getMeta, getTitle, getLinks, getScripts } from './routesConfig.js';
import getCurrentRoutePath from './utils/getCurrentRoutePath.js';
const Context = React.createContext(undefined);
Context.displayName = 'DocumentContext';
function useDocumentContext() {
    const value = React.useContext(Context);
    return value;
}
export const DocumentContextProvider = Context.Provider;
export const Meta = (props) => {
    const { matches, loaderData } = useAppContext();
    const meta = getMeta(matches, loaderData);
    const { MetaElement = 'meta', } = props;
    return (React.createElement(React.Fragment, null,
        meta.map(item => React.createElement(MetaElement, { key: item.name, ...props, ...item })),
        React.createElement(MetaElement, { ...props, name: "ice-meta-count", content: meta.length.toString() })));
};
export const Title = (props) => {
    const { matches, loaderData } = useAppContext();
    const title = getTitle(matches, loaderData);
    const { TitleElement = 'title', ...rest } = props;
    return (React.createElement(TitleElement, { ...rest }, title));
};
export const Links = (props) => {
    const { loaderData, matches, assetsManifest } = useAppContext();
    const { LinkElement = 'link', ...rest } = props;
    const routeLinks = getLinks(matches, loaderData);
    const pageAssets = getPageAssets(matches, assetsManifest);
    const entryAssets = getEntryAssets(assetsManifest);
    const styles = entryAssets.concat(pageAssets).filter(path => path.indexOf('.css') > -1);
    return (React.createElement(React.Fragment, null,
        routeLinks.map(routeLinkProps => {
            return React.createElement(LinkElement, { key: routeLinkProps.href, ...rest, ...routeLinkProps, "data-route-link": true });
        }),
        styles.map(style => React.createElement(LinkElement, { key: style, ...rest, rel: "stylesheet", type: "text/css", href: style }))));
};
export const Scripts = (props) => {
    const { loaderData, matches, assetsManifest } = useAppContext();
    const { ScriptElement = 'script', ...rest } = props;
    const routeScripts = getScripts(matches, loaderData);
    const pageAssets = getPageAssets(matches, assetsManifest);
    const entryAssets = getEntryAssets(assetsManifest);
    // Page assets need to be load before entry assets, so when call dynamic import won't cause duplicate js chunk loaded.
    let scripts = pageAssets.concat(entryAssets).filter(path => path.indexOf('.js') > -1);
    if (assetsManifest.dataLoader) {
        scripts.unshift(`${assetsManifest.publicPath}${assetsManifest.dataLoader}`);
    }
    // Unique scripts for duplicate chunks.
    const jsSet = {};
    scripts = scripts.filter((script) => {
        if (jsSet[script])
            return false;
        jsSet[script] = true;
        return true;
    });
    return (React.createElement(React.Fragment, null,
        React.createElement(Data, { ScriptElement: ScriptElement }),
        routeScripts.map(routeScriptProps => {
            return React.createElement(ScriptElement, { key: routeScriptProps.src, ...rest, ...routeScriptProps, "data-route-script": true });
        }),
        scripts.map(script => {
            return React.createElement(ScriptElement, { key: script, src: script, ...rest });
        })));
};
export function getAllAssets(loaderData, matches, assetsManifest) {
    const routeLinks = getLinks(matches, loaderData);
    const routeScripts = getScripts(matches, loaderData);
    const pageAssets = getPageAssets(matches, assetsManifest);
    const entryAssets = getEntryAssets(assetsManifest);
    // Page assets need to be load before entry assets, so when call dynamic import won't cause duplicate js chunk loaded.
    const assets = [].concat(routeLinks).concat(routeScripts).concat(pageAssets).concat(entryAssets);
    if (assetsManifest.dataLoader) {
        assets.unshift(`${assetsManifest.publicPath}${assetsManifest.dataLoader}`);
    }
    return assets;
}
export function usePageAssets() {
    const { loaderData, matches, assetsManifest } = useAppContext();
    return getAllAssets(loaderData, matches, assetsManifest);
}
// use app context separately
export const Data = (props) => {
    const { documentOnly, matches, downgrade, renderMode, serverData, loaderData, revalidate } = useAppContext();
    const appData = useAppData();
    const { ScriptElement = 'script', } = props;
    const matchedIds = matches.map(match => match.route.id);
    const routePath = matches.length > 0 ? encodeURI(getCurrentRoutePath(matches)) : '';
    const windowContext = {
        appData,
        loaderData,
        routePath,
        downgrade,
        matchedIds,
        documentOnly,
        renderMode,
        serverData,
        revalidate,
    };
    return (
    // Disable hydration warning for csr, initial app data may not equal csr result.
    // Should merge global context when there are multiple <Data />.
    React.createElement(ScriptElement, { suppressHydrationWarning: documentOnly, dangerouslySetInnerHTML: { __html: `!(function () {var a = window.__ICE_APP_CONTEXT__ || {};var b = ${JSON.stringify(windowContext)};for (var k in a) {b[k] = a[k]}window.__ICE_APP_CONTEXT__=b;})();` } }));
};
export const FirstChunkCache = () => {
    return React.createElement("div", { dangerouslySetInnerHTML: { __html: '<!--fcc-->' } });
};
export const Main = (props) => {
    const { main } = useDocumentContext();
    const { appConfig } = useAppContext();
    return (React.createElement("div", { id: appConfig.app.rootId, ...props }, main));
};
/**
 * merge assets info for matched route
 */
export function getPageAssets(matches, assetsManifest) {
    const { pages, publicPath } = assetsManifest;
    let result = [];
    matches.forEach(match => {
        const { componentName } = match.route;
        const assets = pages[componentName];
        assets && assets.forEach(filePath => {
            result.push(`${publicPath}${filePath}`);
        });
    });
    return result;
}
export function getEntryAssets(assetsManifest) {
    const { entries, publicPath } = assetsManifest;
    let result = [];
    Object.values(entries).forEach(assets => {
        result = result.concat(assets);
    });
    return result.map((filePath) => {
        const prefixes = ['http:', 'https:', '//'];
        if (prefixes.some(prefix => filePath.startsWith(prefix))) {
            return filePath;
        }
        else {
            return `${publicPath}${filePath}`;
        }
    });
}
