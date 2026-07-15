import React from 'react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | ApiError;
}

export class ApiErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error | ApiError): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error | ApiError, errorInfo: React.ErrorInfo) {
    console.error('API Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isApiError = error instanceof ApiError;

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-semibold">Something went wrong</h2>
            
            {isApiError ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {error.message}
                </p>
                {error.code && (
                  <p className="text-sm text-muted-foreground">
                    Error Code: {error.code}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                An unexpected error occurred. Please try again.
              </p>
            )}

            <Button onClick={this.handleReset} className="mt-4">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
