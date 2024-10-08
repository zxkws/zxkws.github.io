/// <reference types="react" />
type Listener = () => any;
export declare function withPageLifeCycle<P>(Component: React.ComponentClass<P>): import("react").ComponentClass<{}, any>;
export declare function createUsePageLifeCycle({ useEffect }: {
    useEffect: any;
}): {
    usePageShow: (callback: Listener) => void;
    usePageHide: (callback: Listener) => void;
};
export {};
