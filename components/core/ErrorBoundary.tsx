import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 md:px-6 pt-4">
            <div className="bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
                <p className="mb-6">The application has encountered an unexpected error.</p>
                
                {this.state.error && (
                    <pre className="bg-gray-900 text-left text-xs p-4 rounded-md overflow-x-auto mb-6">
                        <code>{this.state.error.toString()}</code>
                    </pre>
                )}

                <button
                    onClick={this.handleReload}
                    className="px-6 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition-colors"
                >
                    Reload Application
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;