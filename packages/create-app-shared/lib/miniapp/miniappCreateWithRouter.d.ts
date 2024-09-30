declare function miniappCreateWithRouter({ createElement }: {
    createElement: any;
}): (Component: any) => {
    (props: any): any;
    displayName: string;
    WrappedComponent: any;
};
export default miniappCreateWithRouter;
