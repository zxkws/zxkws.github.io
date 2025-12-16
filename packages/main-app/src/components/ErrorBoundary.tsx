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
        <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg)] p-6 text-[var(--color-text)]">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--glass-border)] bg-[var(--stage-bg)] p-6 shadow-[var(--stage-shadow)]">
            <div className="text-lg font-semibold">页面出错了</div>
            <div className="mt-2 text-sm text-[var(--color-muted)]">
              {this.state.error?.message || 'Sorry, something went wrong.'}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                刷新重试
              </button>
              <button
                type="button"
                onClick={this.handleClearCaches}
                className="rounded-lg border border-[var(--glass-border)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-black/5"
              >
                清理缓存并刷新
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
