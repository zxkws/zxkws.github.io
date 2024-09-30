import * as Stream from 'stream';
import * as ReactDOMServer from 'react-dom/server';
import { getAllAssets } from '../Document.js';
const { Writable } = Stream;
export function renderToNodeStream(element, renderToNodeStreamOptions) {
    return (res, options) => {
        const { renderOptions, } = renderToNodeStreamOptions;
        const { preRender = false, } = renderOptions;
        const { pipe } = ReactDOMServer.renderToPipeableStream(element, {
            onShellReady() {
                // Pip after onAllReady when pre render SSR.
                if (!preRender) {
                    pipe(res);
                }
                (options === null || options === void 0 ? void 0 : options.onShellReady) && options.onShellReady();
            },
            onShellError(error) {
                (options === null || options === void 0 ? void 0 : options.onShellError) && (options === null || options === void 0 ? void 0 : options.onShellError(error));
            },
            onError(error) {
                (options === null || options === void 0 ? void 0 : options.onError) && (options === null || options === void 0 ? void 0 : options.onError(error));
            },
            onAllReady() {
                // For pre render SSR.
                if (preRender) {
                    const { renderOptions, routerContext, } = renderToNodeStreamOptions;
                    const { assetsManifest, } = renderOptions;
                    const { matches, loaderData, } = routerContext;
                    let renderAssets = getAllAssets(loaderData, matches, assetsManifest);
                    if (typeof window !== 'undefined' && window.renderAssets) {
                        renderAssets = renderAssets.concat(window.renderAssets);
                    }
                    (options === null || options === void 0 ? void 0 : options.onAllReady) && (options === null || options === void 0 ? void 0 : options.onAllReady({
                        renderAssets,
                    }));
                    // Pipe after collecting assets.
                    pipe(res);
                }
                else {
                    (options === null || options === void 0 ? void 0 : options.onAllReady) && (options === null || options === void 0 ? void 0 : options.onAllReady({
                        renderAssets: [],
                    }));
                }
            },
        });
    };
}
export function pipeToString(input) {
    return new Promise((resolve, reject) => {
        const bufferedChunks = [];
        const stream = new Writable({
            writev(chunks, callback) {
                chunks.forEach((chunk) => bufferedChunks.push(chunk.chunk));
                callback();
            },
        });
        stream.on('finish', () => {
            const result = Buffer.concat(bufferedChunks).toString();
            resolve(result);
        });
        stream.on('error', (error) => {
            reject(error);
        });
        input(stream, {
            onError: (error) => {
                reject(error);
            },
        });
    });
}
