import * as React from 'react';
export default function RouteWrapper(props) {
    const { wrappers = [], id, isLayout, routeExports } = props;
    // layout should only be wrapped by Wrapper with `layout: true`
    const filtered = isLayout ? wrappers.filter(wrapper => wrapper.layout === true) : wrappers;
    const RouteWrappers = filtered.map(item => item.Wrapper);
    let element;
    if (RouteWrappers.length) {
        element = RouteWrappers.reduce((preElement, CurrentWrapper) => (React.createElement(CurrentWrapper, { routeId: id, routeExports: routeExports }, preElement)), props.children);
    }
    else {
        element = props.children;
    }
    return element;
}
