import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AllViewSessionsPage } from '../../pages/AllViewSessionsPage';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  getAllViewSessions: vi.fn(),
}));

import '../../i18n';

describe('AllViewSessionsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders view sessions list and paginates using API page_size without throwing ReferenceError', async () => {
    const mockSessions = [
      {
        id: 'vs-1',
        viewer_email: 'visitor1@example.com',
        share_link_name: 'Investor Deck Link',
        document_id: 'doc-1',
        document_name: 'Pitch.pdf',
        document_type: 'pdf',
        viewed_at: '2026-10-24T06:00:00Z',
        downloaded_at: null,
        duration_seconds: 45,
        completion_rate: 0.8,
        user_agent: 'Mozilla/5.0',
        page_views: [],
        dataroom_visits: [],
        link_clicks: [],
      },
    ];

    api.getAllViewSessions.mockResolvedValue({
      data: {
        results: mockSessions,
        count: 25,
        total_pages: 3,
        current_page: 1,
        page_size: 10,
      },
    });

    render(
      <MemoryRouter>
        <AllViewSessionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('visitor1@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Investor Deck Link')).toBeInTheDocument();
    expect(screen.getByText('Pitch.pdf')).toBeInTheDocument();

    // Pagination should render pages 1, 2, 3 (count=25, page_size=10 -> 3 pages)
    const page2Btn = screen.getByRole('button', { name: '2' });
    expect(page2Btn).toBeInTheDocument();

    fireEvent.click(page2Btn);
    await waitFor(() => {
      expect(api.getAllViewSessions).toHaveBeenCalledWith(2);
    });
  });
});
