import { Component, type ErrorInfo, type ReactNode } from 'react';
import { renderCardoErrorScreen, type CardoErrorSurface } from './error-screen';

interface Props {
  children: ReactNode;
  surface?: CardoErrorSurface;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time failures after bootstrap and shows the unified Cardo error screen.
 */
export class CardoErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CardoErrorBoundary', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      // Render into #root via DOM screen for one consistent fatal surface.
      if (typeof document !== 'undefined') {
        queueMicrotask(() => {
          renderCardoErrorScreen({
            error: this.state.error,
            surface: this.props.surface,
          });
        });
      }
      return null;
    }
    return this.props.children;
  }
}
