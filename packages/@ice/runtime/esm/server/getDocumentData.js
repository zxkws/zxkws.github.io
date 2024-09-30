export default async function getDocumentData(options) {
    const { loaderConfig, requestContext, documentOnly } = options;
    if (loaderConfig) {
        const { loader } = loaderConfig;
        if (typeof loader === 'function') {
            return await loader(requestContext, { documentOnly });
        }
        else {
            console.warn('Document dataLoader only accepts function.');
        }
    }
}
