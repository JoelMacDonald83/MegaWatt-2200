import React, { Component, ErrorInfo, ReactNode } from 'react';
import { debugService } from '../services/debugService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our debug service
    debugService.log("ErrorBoundary caught an error", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // Render a custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg-main)] text-[var(--text-primary)] p-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--text-danger)] mb-4">Something went wrong.</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-6">
            An unexpected error occurred. Please try reloading the application.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors"
          >
            Reload Page
          </button>
          {this.state.error && (
            <details className="mt-8 text-left w-full max-w-2xl">
              <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Error Details</summary>
              <pre className="mt-2 p-4 bg-[var(--bg-input)] rounded-md text-[var(--text-danger)] text-sm overflow-auto">
                {this.state.error.toString()}
                {this.state.error.stack && `\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
