import React, { isValidElement } from 'react';
import useMounted from './useMounted.js';
const ClientOnly = ({ children, fallback }) => {
    const mounted = useMounted();
    // Ref https://github.com/facebook/docusaurus/blob/v2.1.0/packages/docusaurus/src/client/exports/BrowserOnly.tsx
    if (mounted) {
        if (typeof children !== 'function' &&
            process.env.NODE_ENV === 'development') {
            throw new Error(`Error: The children of <ClientOnly> must be a "render function", e.g. <ClientOnly>{() => <span>{window.location.href}</span>}</ClientOnly>.
Current type: ${isValidElement(children) ? 'React element' : typeof children}`);
        }
        return React.createElement(React.Fragment, null, children === null || children === void 0 ? void 0 : children());
    }
    return fallback !== null && fallback !== void 0 ? fallback : null;
};
export default ClientOnly;
