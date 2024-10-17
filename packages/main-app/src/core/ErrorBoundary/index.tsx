import React from 'react';
/* eslint-disable */
class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error?: Error | null; errorInfo?: any }> {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: {
        componentStack: '',
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ error, errorInfo });
  }

  render(): React.ReactNode {
    const { children } = this.props;
    const { error, errorInfo } = this.state;
    if (error !== null || errorInfo) {
      return (
        <>
          <div>枣糕，出错了</div>
        </>
      );
    }
    return children || null;
  }
}

export default ErrorBoundary;
