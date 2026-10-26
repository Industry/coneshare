import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AutomationsPage } from '../../pages/AutomationsPage';
import * as api from '../../services/api';
import '../../i18n';

vi.mock('../../services/api');

let mockCurrentUser = { id: 'u1', email: 'admin@example.com', role: 'admin' };

vi.mock('../../contexts/UserProvider', () => ({
  useUser: () => ({
    user: mockCurrentUser,
    refreshUser: vi.fn(),
  }),
}));

describe('AutomationsPage destination permissions', () => {
  const mockDestinations = [
    {
      id: 'dest-1',
      name: 'Global Slack Webhook',
      destination_type: 'slack',
      endpoint_url: 'https://hooks.slack.com/services/xxx',
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    api.getAutomations.mockResolvedValue({ data: [] });
    api.getAutomationDestinations.mockResolvedValue({ data: mockDestinations });
    api.getAutomationDeliveries.mockResolvedValue({ data: { results: [], count: 0 } });
  });

  it('renders New Destination, Edit and Delete buttons for admin users', async () => {
    mockCurrentUser = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };

    render(
      <MemoryRouter>
        <AutomationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Global Slack Webhook')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /New Destination/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('hides New Destination, Edit and Delete buttons for non-admin users', async () => {
    mockCurrentUser = { id: 'member-1', email: 'member@example.com', role: 'member' };

    render(
      <MemoryRouter>
        <AutomationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Global Slack Webhook')).toBeInTheDocument();
    });

    // Destination card and view logs are visible
    expect(screen.getByRole('button', { name: /View Logs/i })).toBeInTheDocument();

    // Mutating actions are hidden from regular members
    expect(screen.queryByRole('button', { name: /New Destination/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });
});
