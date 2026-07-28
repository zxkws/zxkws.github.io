import React, { type ReactNode } from 'react';
import { clearPwaCachesAndReload } from '../utils/pwa';

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCaches = () => {
    void clearPwaCachesAndReload({
      confirmMessage: '可能是旧版本缓存导致异常，是否清理缓存并刷新？（会导致离线缓存失效）',
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="workspace-page workspace-feedback-screen">
          <section className="workspace-panel workspace-feedback-card">
            <p className="workspace-page__eyebrow">Runtime error</p>
            <h1>页面暂时无法使用</h1>
            <p className="workspace-page__description">{this.state.error?.message || 'Sorry, something went wrong.'}</p>
            <div className="workspace-inline-actions workspace-feedback-actions">
              <button type="button" onClick={this.handleReload} className="workspace-button workspace-button--primary">
                刷新重试
              </button>
              <button type="button" onClick={this.handleClearCaches} className="workspace-button">
                清理缓存并刷新
              </button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
