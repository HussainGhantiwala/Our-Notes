import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] route render failed", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="paper max-w-md rounded-sm p-8 text-center">
            <p className="font-hand text-3xl text-ink">Something went wrong. Reload.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-sm border border-ink/15 bg-cream/80 px-4 py-2 font-hand text-xl text-ink-soft hover:text-rose"
            >
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
