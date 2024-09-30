import React from 'react';
const Context = React.createContext(null);
const ActivityProvider = Context.Provider;
export const useActive = () => {
    const data = React.useContext(Context);
    return data === null || data === void 0 ? void 0 : data.active;
};
export default function Activity({ mode, children }) {
    const active = mode === 'visible';
    return (React.createElement(ActivityProvider, { value: {
            active,
        } },
        React.createElement("div", { style: { display: active ? 'block' : 'none' } }, children)));
}
