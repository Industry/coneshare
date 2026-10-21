import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataroomReorderItemsDialog } from '../../../components/dialogs/DataroomReorderItemsDialog';
import '../../../i18n';

describe('DataroomReorderItemsDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockItems = [
    { id: 'f1', name: 'Folder 1', type: 'folder' },
    { id: 'doc1', name: 'Doc 1.pdf', type: 'document' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reorder dialog with item list and action buttons', () => {
    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mockItems}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Reorder Items')).toBeInTheDocument();
    expect(screen.getByText('Set custom display positions for folders and documents in Dataroom Home.')).toBeInTheDocument();
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
    expect(screen.getByText('Doc 1.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Order' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /reset order/i })).toBeEnabled();
  });

  it('disables buttons and prevents duplicate submissions while saving order', async () => {
    let resolvePromise;
    const slowOnConfirm = vi.fn(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mockItems}
        onConfirm={slowOnConfirm}
      />
    );

    const saveBtn = screen.getByRole('button', { name: 'Save Order' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const resetBtn = screen.getByRole('button', { name: /reset order/i });

    // First click
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    const savingBtn = screen.getByRole('button', { name: /saving/i });
    expect(savingBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    // Reorder arrow buttons should all be disabled while saving
    const listItems = screen.getAllByRole('listitem');
    listItems.forEach((li) => {
      expect(li).toHaveAttribute('draggable', 'false');
    });

    // Second click while in flight
    fireEvent.click(savingBtn);
    expect(slowOnConfirm).toHaveBeenCalledTimes(1);

    // Complete saving
    resolvePromise();

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });

  it('renders separate Folders and Documents sections with independent numbering starting at 01', () => {
    const mixedItems = [
      { id: 'f1', name: '01 · Executive Overview', type: 'folder' },
      { id: 'f2', name: '02 · Product & Tech Architecture', type: 'folder' },
      { id: 'doc1', name: 'Architecture-v4.pdf', type: 'document', document_type: 'pdf', file_size: 4800000 },
      { id: 'doc2', name: 'SOC2-Report.pdf', type: 'document', document_type: 'pdf', file_size: 12100000 },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mixedItems}
        onConfirm={mockOnConfirm}
      />
    );

    // Section headers
    expect(screen.getByText('Folders Order')).toBeInTheDocument();
    expect(screen.getByText('Documents Order')).toBeInTheDocument();
    expect(screen.getByText('Dictates Left-to-Right grid card order')).toBeInTheDocument();
    expect(screen.queryByText('Dictates Top-to-Bottom list order')).not.toBeInTheDocument();

    // Check independent 01 index badges
    const indexBadges = screen.getAllByText('01');
    expect(indexBadges.length).toBe(2); // One for first folder, one for first document
  });

  it('reorders folders and documents in isolation and submits combined list', async () => {
    const mixedItems = [
      { id: 'f1', name: 'Folder A', type: 'folder' },
      { id: 'f2', name: 'Folder B', type: 'folder' },
      { id: 'doc1', name: 'Doc A.pdf', type: 'document' },
      { id: 'doc2', name: 'Doc B.pdf', type: 'document' },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mixedItems}
        onConfirm={mockOnConfirm}
      />
    );

    // Move Folder A down
    const moveFolderADown = screen.getByRole('button', { name: 'Move Folder A down' });
    fireEvent.click(moveFolderADown);

    // Move Doc B up
    const moveDocBUp = screen.getByRole('button', { name: 'Move Doc B.pdf up' });
    fireEvent.click(moveDocBUp);

    // Save order
    const saveBtn = screen.getByRole('button', { name: 'Save Order' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'f2', name: 'Folder B' }),
        expect.objectContaining({ id: 'f1', name: 'Folder A' }),
        expect.objectContaining({ id: 'doc2', name: 'Doc B.pdf' }),
        expect.objectContaining({ id: 'doc1', name: 'Doc A.pdf' }),
      ]);
    });
  });

  it('auto-hides Folders section when no folders exist', () => {
    const onlyDocs = [
      { id: 'doc1', name: 'Doc 1.pdf', type: 'document' },
      { id: 'doc2', name: 'Doc 2.pdf', type: 'document' },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={onlyDocs}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('Folders Order')).not.toBeInTheDocument();
    expect(screen.getByText('Documents Order')).toBeInTheDocument();
    expect(screen.getByText('Doc 1.pdf')).toBeInTheDocument();
  });

  it('auto-hides Documents section when no documents exist', () => {
    const onlyFolders = [
      { id: 'f1', name: 'Folder 1', type: 'folder' },
      { id: 'f2', name: 'Folder 2', type: 'folder' },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={onlyFolders}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Folders Order')).toBeInTheDocument();
    expect(screen.queryByText('Documents Order')).not.toBeInTheDocument();
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
  });

  it('renders overall empty state when no items exist', () => {
    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={[]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('No items to reorder.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Order' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reset order/i })).toBeDisabled();
  });

  it('resets both sections to chronological/alphabetical default order on reset click', async () => {
    const mixedItems = [
      { id: 'f2', name: 'Beta Folder', type: 'folder', created_at: '2026-01-02T00:00:00Z' },
      { id: 'f1', name: 'Alpha Folder', type: 'folder', created_at: '2026-01-01T00:00:00Z' },
      { id: 'doc2', name: 'Zeta.pdf', type: 'document', created_at: '2026-01-02T00:00:00Z' },
      { id: 'doc1', name: 'Alpha.pdf', type: 'document', created_at: '2026-01-01T00:00:00Z' },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mixedItems}
        onConfirm={mockOnConfirm}
      />
    );

    // Click Reset Order
    const resetBtn = screen.getByRole('button', { name: /reset order/i });
    fireEvent.click(resetBtn);

    // Save and check reset sequence
    const saveBtn = screen.getByRole('button', { name: 'Save Order' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'f1', name: 'Alpha Folder' }),
        expect.objectContaining({ id: 'f2', name: 'Beta Folder' }),
        expect.objectContaining({ id: 'doc1', name: 'Alpha.pdf' }),
        expect.objectContaining({ id: 'doc2', name: 'Zeta.pdf' }),
      ]);
    });
  });

  it('includes proper accessible labels for lists, drag handles, and move actions', () => {
    const mixedItems = [
      { id: 'f1', name: 'Folder 1', type: 'folder' },
      { id: 'doc1', name: 'Doc 1.pdf', type: 'document' },
    ];

    render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={mixedItems}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole('list', { name: 'Folders list' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Documents list' })).toBeInTheDocument();

    const dragButtons = screen.getAllByTitle('Drag to reorder');
    expect(dragButtons.length).toBe(2);

    expect(screen.getByRole('button', { name: 'Move Folder 1 down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Doc 1.pdf up' })).toBeInTheDocument();
  });

  it('preserves in-flight reordering changes when items prop updates while dialog remains open', async () => {
    const initialItems = [
      { id: 'f1', name: 'Folder 1', type: 'folder' },
      { id: 'f2', name: 'Folder 2', type: 'folder' },
    ];

    const { rerender } = render(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={initialItems}
        onConfirm={mockOnConfirm}
      />
    );

    // Reorder Folder 1 down
    const moveDownBtn = screen.getByRole('button', { name: 'Move Folder 1 down' });
    fireEvent.click(moveDownBtn);

    // Parent re-renders and passes a new array reference (e.g., polling or other state update)
    const updatedPropItems = [
      { id: 'f1', name: 'Folder 1', type: 'folder' },
      { id: 'f2', name: 'Folder 2', type: 'folder' },
    ];
    rerender(
      <DataroomReorderItemsDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        items={updatedPropItems}
        onConfirm={mockOnConfirm}
      />
    );

    // Confirm that the user's in-flight order is preserved (Folder 2 then Folder 1)
    const saveBtn = screen.getByRole('button', { name: 'Save Order' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'f2', name: 'Folder 2' }),
        expect.objectContaining({ id: 'f1', name: 'Folder 1' }),
      ]);
    });
  });
});

