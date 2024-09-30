import * as React from 'react';
export default class AppErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            error: null,
        };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('AppErrorBoundary', error, errorInfo);
    }
    render() {
        if (this.state.error) {
            // TODO: Show the error message and the error stack.
            return React.createElement("h1", null, "Something went wrong.");
        }
        return this.props.children;
    }
}
