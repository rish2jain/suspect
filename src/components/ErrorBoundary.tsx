import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '48px 24px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: 'var(--color-text, #2C2420)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '16px' }}>{'\u{1F50E}'}</p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-muted, #7A706A)', marginBottom: '24px' }}>
            The case file got corrupted. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: 'var(--color-action, #1A6B5A)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
