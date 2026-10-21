import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataroomLoadingProgress } from '../../../components/viewer/DataroomLoadingProgress';
import '../../../i18n';

describe('DataroomLoadingProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, brand info, and initial progress state', () => {
    render(
      <DataroomLoadingProgress
        publicMeta={{
          target_name: 'Project Titan M&A Dataroom',
          owner_name: 'Acme Corp',
        }}
      />
    );

    expect(screen.getByText('Project Titan M&A Dataroom')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Connecting to dataroom/i)).toBeInTheDocument();
  });

  it('renders brand logo when provided in publicMeta', () => {
    render(
      <DataroomLoadingProgress
        publicMeta={{
          target_name: 'Project Titan M&A Dataroom',
          resolved_brand_logo_url: 'https://example.com/logo.png',
        }}
      />
    );

    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('renders default title when targetName and publicMeta are not provided', () => {
    render(<DataroomLoadingProgress />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('advances progress and updates status message over time', () => {
    render(
      <DataroomLoadingProgress
        publicMeta={{
          target_name: 'Series B Due Diligence',
        }}
      />
    );

    const initialPercent = screen.getByText(/%/).textContent;
    expect(initialPercent).toBe('15%');
    expect(screen.getByRole('status')).toHaveTextContent(/Connecting to dataroom/i);

    // Advance timers by 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const updatedPercent = screen.getByText(/%/).textContent;
    expect(parseInt(updatedPercent, 10)).toBeGreaterThan(15);

    // Advance further to reach later stages
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const laterPercent = screen.getByText(/%/).textContent;
    expect(parseInt(laterPercent, 10)).toBeGreaterThanOrEqual(65);
  });
});
