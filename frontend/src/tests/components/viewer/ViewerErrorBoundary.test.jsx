import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ViewerErrorBoundary } from '../../../components/viewer/ViewerErrorBoundary';

function ProblemChild({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Failed to fetch dynamically imported module: DataroomViewer.js');
  }
  return <div>Viewer Loaded Successfully</div>;
}

describe('ViewerErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ViewerErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ViewerErrorBoundary>
    );

    expect(screen.getByText('Viewer Loaded Successfully')).toBeInTheDocument();
  });

  it('renders error fallback UI with Reload button when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ViewerErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ViewerErrorBoundary>
    );

    expect(screen.getByText('Failed to load viewer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('invokes onRetry callback when Reload button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetryMock = vi.fn();

    render(
      <ViewerErrorBoundary onRetry={onRetryMock}>
        <ProblemChild shouldThrow={true} />
      </ViewerErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Reload/i }));
    expect(onRetryMock).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
