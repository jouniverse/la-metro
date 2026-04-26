import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-[var(--color-surface)] p-8">
          <div className="text-center max-w-md">
            <div className="text-[var(--color-error)] text-lg font-bold tracking-wider mb-2">
              [ SYSTEM_ERROR ]
            </div>
            <div className="text-[var(--color-on-surface-variant)] text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[var(--color-primary)] text-[#080808] text-xs font-bold tracking-wider uppercase hover:opacity-90 transition-opacity"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
