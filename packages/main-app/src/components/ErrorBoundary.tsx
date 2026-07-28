import React, { type ReactNode } from 'react';
import { readLanguage, translate } from '../i18n';
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
      confirmMessage: translate(readLanguage(), 'error.cacheConfirm'),
    });
  };

  render() {
    if (this.state.hasError) {
      const language = readLanguage();
      return (
        <div className="workspace-page workspace-feedback-screen">
          <section className="workspace-panel workspace-feedback-card">
            <p className="workspace-page__eyebrow">Runtime error</p>
            <h1>{translate(language, 'error.runtimeTitle')}</h1>
            <p className="workspace-page__description">
              {this.state.error?.message || translate(language, 'error.runtimeFallback')}
            </p>
            <div className="workspace-inline-actions workspace-feedback-actions">
              <button type="button" onClick={this.handleReload} className="workspace-button workspace-button--primary">
                {translate(language, 'common.retry')}
              </button>
              <button type="button" onClick={this.handleClearCaches} className="workspace-button">
                {translate(language, 'common.clearCacheReload')}
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
