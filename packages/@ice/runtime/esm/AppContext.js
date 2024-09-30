import * as React from 'react';
const Context = React.createContext(undefined);
Context.displayName = 'AppContext';
function useAppContext() {
    const value = React.useContext(Context);
    return value;
}
function useAppData() {
    const value = React.useContext(Context);
    return value.appData;
}
const AppContextProvider = Context.Provider;
export { useAppContext, useAppData, AppContextProvider, };
