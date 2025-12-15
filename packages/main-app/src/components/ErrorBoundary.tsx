import React, { type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
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
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              刷新重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
