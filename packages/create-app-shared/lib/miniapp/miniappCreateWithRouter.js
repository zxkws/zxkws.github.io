function miniappCreateWithRouter(_a) {
    var createElement = _a.createElement;
    var withRouter = function (Component) {
        function Wrapper(props) {
            var history = window.history;
            return createElement(Component, Object.assign({}, props, {
                history: history,
                location: history.location,
            }));
        }
        // eslint-disable-next-line
        Wrapper.displayName = 'withRouter(' + (Component.displayName || Component.name) + ')';
        Wrapper.WrappedComponent = Component;
        return Wrapper;
    };
    return withRouter;
}
export default miniappCreateWithRouter;
//# sourceMappingURL=miniappCreateWithRouter.js.map