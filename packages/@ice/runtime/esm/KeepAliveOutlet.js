import React, { useState, useEffect, useRef } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';
import ActivityComponent from './Activity.js';
// @ts-ignore
const Activity = React.unstable_Activity || ActivityComponent;
const OUTLET_LIMIT = 5;
export default function KeepAliveOutlet(props) {
    if (!Activity) {
        throw new Error('`<KeepAliveOutlet />` now requires react experimental version. Please install it first.');
    }
    const [outlets, setOutlets] = useState([]);
    const location = useLocation();
    const outlet = useOutlet();
    const outletLimit = props.limit || OUTLET_LIMIT;
    const keepAlivePaths = props.paths;
    // Save the first outlet for SSR hydration.
    const outletRef = useRef({
        key: location.key,
        pathname: location.pathname,
        outlet,
    });
    useEffect(() => {
        var _a;
        // If outlets is empty, save the first outlet for SSR hydration,
        // and should not call setOutlets to avoid re-render.
        if (outlets.length !== 0 ||
            ((_a = outletRef.current) === null || _a === void 0 ? void 0 : _a.pathname) !== location.pathname) {
            let currentOutlets = outletRef.current ? [outletRef.current] : outlets;
            if (keepAlivePaths && keepAlivePaths.length > 0) {
                currentOutlets = currentOutlets.filter(o => keepAlivePaths.includes(o.pathname));
            }
            const result = currentOutlets.some(o => o.pathname === location.pathname);
            if (!result) {
                setOutlets([
                    ...currentOutlets,
                    {
                        key: location.key,
                        pathname: location.pathname,
                        outlet,
                    },
                ].slice(-outletLimit));
                outletRef.current = null;
            }
        }
    }, [location.pathname, location.key, outlet, outlets, outletLimit, keepAlivePaths]);
    // Render initail outlet for SSR hydration.
    const renderOutlets = outlets.length === 0 ? [outletRef.current] : outlets;
    return (React.createElement(React.Fragment, null, renderOutlets.map((o) => {
        return (React.createElement(Activity, { key: o.key, mode: location.pathname === o.pathname ? 'visible' : 'hidden' }, o.outlet));
    })));
}
