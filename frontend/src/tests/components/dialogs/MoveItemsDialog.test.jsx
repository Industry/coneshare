import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveItemsDialog } from '../../../components/dialogs/MoveItemsDialog';
import * as api from '../../../services/api';
import '../../../i18n';

vi.mock('../../../services/api', () => ({
  createFolder: vi.fn(),
  getRootFolderContents: vi.fn(),
  getFolderContents: vi.fn(),
}));

const mockRootContent = {
  current_folder: null,
  sub_folders: [
    { id: 'folder_root_1', name: 'Financials', items_count: 5 },
    { id: 'folder_root_2', name: 'Legal', items_count: 2 },
  ],
};

const mockSubFolderContent = {
  current_folder: {
    id: 'folder_root_1',
    name: 'Financials',
    ancestors: [],
  },
  sub_folders: [
    { id: 'folder_sub_1', name: 'Q1 Reports', items_count: 3 },
    { id: 'folder_sub_2', name: 'Q2 Reports', items_count: 1 },
  ],
};

describe('MoveItemsDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getRootFolderContents.mockResolvedValue({ data: mockRootContent });
    api.getFolderContents.mockResolvedValue({ data: mockSubFolderContent });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onOpenChange: mockOnOpenChange,
      onConfirm: mockOnConfirm,
      selectedCount: 2,
    };
    return render(<MoveItemsDialog {...defaultProps} {...props} />);
  };

  it('renders move dialog with destination selection and actions', async () => {
    renderComponent();

    expect(screen.getByText('Move Items')).toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(await screen.findByText('Financials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument();
  });

  it('selects folder as destination on single click without navigating into it', async () => {
    const user = userEvent.setup();
    renderComponent();

    const folder1 = await screen.findByText('Financials');
    await user.click(folder1);

    // Selected badge should now appear on Financials
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Confirm button should be enabled and submit Financials id
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    expect(moveBtn).not.toBeDisabled();
    await user.click(moveBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith('folder_root_1');
  });

  it('navigates into a subfolder via open button and updates breadcrumbs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await screen.findByText('Financials');

    // Click the open chevron button for Financials
    const openButton = screen.getByRole('button', { name: 'Open Financials' });
    await user.click(openButton);

    await waitFor(() => {
      expect(api.getFolderContents).toHaveBeenCalledWith('folder_root_1');
    });

    // Subfolders should now be listed
    expect(await screen.findByText('Q1 Reports')).toBeInTheDocument();
    expect(screen.getByText('Q2 Reports')).toBeInTheDocument();

    // Breadcrumbs should show Home and current folder
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Financials', { selector: 'span' })).toBeInTheDocument();
  });

  it('allows navigating back to Home from breadcrumbs', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Navigate to Financials
    const openButton = await screen.findByRole('button', { name: 'Open Financials' });
    await user.click(openButton);
    expect(await screen.findByText('Q1 Reports')).toBeInTheDocument();

    // Click Home in breadcrumbs
    const rootBreadcrumb = screen.getByRole('button', { name: 'Home' });
    await user.click(rootBreadcrumb);

    await waitFor(() => {
      expect(api.getRootFolderContents).toHaveBeenCalledTimes(2);
    });

    // Should be back at Root
    expect(await screen.findByText('Financials')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('disables selectedFolderIds from being selected as destination', async () => {
    renderComponent({ selectedFolderIds: ['folder_root_1'] });

    const folder1 = await screen.findByText('Financials');
    const folder1Button = folder1.closest('button');
    expect(folder1Button).toBeDisabled();

    const folder2 = screen.getByText('Legal');
    const folder2Button = folder2.closest('button');
    expect(folder2Button).not.toBeDisabled();
  });

  it('disables Move button when destination is the current directory', async () => {
    const user = userEvent.setup();
    renderComponent({ sourceFolderId: null });

    await screen.findByText('Financials');

    // At root, destination defaults to Home Directory (Current Location)
    expect(screen.getByText('Current Location')).toBeInTheDocument();
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    expect(moveBtn).toBeDisabled();

    // Selecting a different folder enables Move
    const legalFolder = screen.getByText('Legal');
    await user.click(legalFolder);
    expect(moveBtn).not.toBeDisabled();

    // Selecting Home Directory again disables Move
    const homeBtn = screen.getByText('Home Directory').closest('button');
    await user.click(homeBtn);
    expect(moveBtn).toBeDisabled();
  });

  it('confirms move to Root when items are inside a subfolder', async () => {
    const user = userEvent.setup();
    renderComponent({ sourceFolderId: 'folder_root_1' });

    await screen.findByText('Financials');
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    expect(moveBtn).not.toBeDisabled();
    await user.click(moveBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(null);
  });

  it('disables buttons and prevents duplicate submissions during move', async () => {
    let resolvePromise;
    const slowOnConfirm = vi.fn(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    renderComponent({ onConfirm: slowOnConfirm });

    await screen.findByText('Financials');

    const moveBtn = screen.getByRole('button', { name: 'Move' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const createFolderBtn = screen.getByRole('button', { name: 'New Folder' });

    // First click
    fireEvent.click(moveBtn);

    // Should enter moving state immediately
    await waitFor(() => {
      expect(screen.getByText('Moving...')).toBeInTheDocument();
    });

    const movingBtn = screen.getByRole('button', { name: /moving/i });
    expect(movingBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(createFolderBtn).toBeDisabled();

    // Second click while in flight should not trigger another call
    fireEvent.click(movingBtn);
    expect(slowOnConfirm).toHaveBeenCalledTimes(1);

    // Complete the move
    resolvePromise();

    await waitFor(() => {
      expect(screen.queryByText('Moving...')).not.toBeInTheDocument();
    });
  });

  it('creates a new folder inline via AddFolderDialog and selects it', async () => {
    api.createFolder.mockResolvedValue({
      data: { id: 'new_folder_1', name: 'Tax Documents' },
    });
    const user = userEvent.setup();
    renderComponent();

    await screen.findByText('Financials');

    // Click "+ New Folder"
    const newFolderBtn = screen.getByRole('button', { name: /new folder/i });
    await user.click(newFolderBtn);

    // AddFolderDialog should open
    const addFolderDialog = await screen.findByRole('dialog', { name: /create new folder/i });
    const input = within(addFolderDialog).getByLabelText(/folder name/i);
    await user.type(input, 'Tax Documents');

    const createBtn = within(addFolderDialog).getByRole('button', { name: 'New Folder' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(api.createFolder).toHaveBeenCalledWith('Tax Documents', null);
    });
  });

  it('ignores stale responses when navigating rapidly between folders', async () => {
    let resolveFirstRequest;
    const firstRequestPromise = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });
    api.getFolderContents.mockReturnValue(firstRequestPromise);

    const user = userEvent.setup();
    renderComponent({ sourceFolderId: 'folder_root_1' });

    // 1. Initial load shows root folders
    expect(await screen.findByText('Financials')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();

    // 2. User clicks open Financials (triggers slow request 1)
    const openFinancialsButton = screen.getByRole('button', { name: 'Open Financials' });
    await user.click(openFinancialsButton);

    // 3. User clicks Home in breadcrumb before request 1 completes (triggers faster request 2)
    api.getRootFolderContents.mockResolvedValue({ data: mockRootContent });

    const rootBreadcrumb = await screen.findByRole('button', { name: 'Home' });
    await user.click(rootBreadcrumb);

    // Faster request 2 completes and displays root folders
    expect(await screen.findByText('Legal')).toBeInTheDocument();

    // 4. Stale request 1 (Financials subfolder contents) resolves afterwards
    resolveFirstRequest({ data: mockSubFolderContent });

    // Verify stale response did not overwrite Root view
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.queryByText('Q1 Reports')).not.toBeInTheDocument();

    // Confirm move submits Root (null), not stale Financials folder
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    await user.click(moveBtn);
    expect(mockOnConfirm).toHaveBeenCalledWith(null);
  });

  it('displays error state and retries fetching folder contents when Retry is clicked', async () => {
    api.getRootFolderContents.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    renderComponent();

    // Error message and retry button should be visible
    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();

    // Clicking Retry re-calls getRootFolderContents and renders folders
    await user.click(retryBtn);
    expect(await screen.findByText('Financials')).toBeInTheDocument();
    expect(screen.queryByText('An unexpected error occurred.')).not.toBeInTheDocument();
  });

  it('toggles aria-pressed attribute correctly when selecting destinations', async () => {
    const user = userEvent.setup();
    renderComponent({ sourceFolderId: 'folder_root_1' });

    await screen.findByText('Financials');

    const homeBtn = screen.getByText('Home Directory').closest('button');
    const financialsText = screen.getByText('Financials');
    const financialsBtn = financialsText.closest('button');

    // Initially Home Directory is selected
    expect(homeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(financialsBtn).toHaveAttribute('aria-pressed', 'false');

    // Selecting Financials updates aria-pressed
    await user.click(financialsText);
    expect(homeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(financialsBtn).toHaveAttribute('aria-pressed', 'true');

    // Selecting Home Directory restores aria-pressed
    await user.click(homeBtn);
    expect(homeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(financialsBtn).toHaveAttribute('aria-pressed', 'false');
  });
});

