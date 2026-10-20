import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataroomFolderGrid } from '../../../components/viewer/DataroomFolderGrid';
import '../../../i18n';

describe('DataroomFolderGrid', () => {
  const mockFolders = [
    { id: 'f1', name: '01 Financials', allow_download: true },
    { id: 'f2', name: '02 Legal Documents', allow_download: false },
    { id: 'f3', name: '03 Technical Architecture', allow_download: true },
    { id: 'f4', name: '04 Customer Contracts', allow_download: true },
    { id: 'f5', name: '05 Board Presentations', allow_download: true },
    { id: 'f6', name: '06 Human Resources', allow_download: true },
    { id: 'f7', name: '07 Compliance & Security', allow_download: true },
  ];

  it('returns null when folders array is empty or undefined and showEmpty is false', () => {
    const { container: c1 } = render(<DataroomFolderGrid folders={[]} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<DataroomFolderGrid folders={null} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders empty state card when folders array is empty and showEmpty is true', () => {
    render(<DataroomFolderGrid folders={[]} showEmpty={true} emptyMessage="No folders available" />);
    expect(screen.getByText(/Folders \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText('No folders available')).toBeInTheDocument();
  });

  it('renders initial folder cards up to maxInitialCount with index badges', () => {
    render(
      <DataroomFolderGrid
        folders={mockFolders}
        maxInitialCount={6}
        showIndex={true}
      />
    );

    expect(screen.getByText('01 Financials')).toBeInTheDocument();
    expect(screen.getByText('06 Human Resources')).toBeInTheDocument();
    // 7th folder should not be visible initially
    expect(screen.queryByText('07 Compliance & Security')).not.toBeInTheDocument();
    // Folder header badge
    expect(screen.getByText(/Folders \(7\)/i)).toBeInTheDocument();
  });

  it('expands all folders when clicking Show all folders button', () => {
    render(
      <DataroomFolderGrid
        folders={mockFolders}
        maxInitialCount={6}
      />
    );

    const expandBtn = screen.getByRole('button', { name: /Show all 7 folders/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(screen.getByText('07 Compliance & Security')).toBeInTheDocument();
    expect(screen.getByText(/Show less/i)).toBeInTheDocument();

    // Collapse again
    fireEvent.click(screen.getByText(/Show less/i));
    expect(screen.queryByText('07 Compliance & Security')).not.toBeInTheDocument();
  });

  it('invokes onFolderClick when folder card is clicked', () => {
    const onFolderClick = vi.fn();
    render(
      <DataroomFolderGrid
        folders={mockFolders}
        onFolderClick={onFolderClick}
      />
    );

    fireEvent.click(screen.getByTitle('01 Financials'));
    expect(onFolderClick).toHaveBeenCalledTimes(1);
    expect(onFolderClick).toHaveBeenCalledWith(mockFolders[0]);
  });

  it('invokes onQnaClick via quick action button and onDownloadClick via dropdown menu', async () => {
    const onQnaClick = vi.fn();
    const onDownloadClick = vi.fn();

    render(
      <DataroomFolderGrid
        folders={mockFolders}
        onQnaClick={onQnaClick}
        onDownloadClick={onDownloadClick}
        qnaEnabled={true}
      />
    );

    const qnaBtns = screen.getAllByTitle('Folder Q&A');
    fireEvent.click(qnaBtns[0]);
    expect(onQnaClick).toHaveBeenCalledWith(mockFolders[0]);

    // Download is consolidated into the 3-dots dropdown menu
    const actionBtn = screen.getByLabelText('Actions for 01 Financials');
    fireEvent.keyDown(actionBtn, { key: 'Enter', code: 'Enter' });

    const downloadItem = await screen.findByRole('menuitem', { name: /download/i });
    expect(downloadItem).toBeInTheDocument();
    fireEvent.click(downloadItem);
    expect(onDownloadClick).toHaveBeenCalledWith(mockFolders[0]);
  });

  it('renders modified time and right navigation arrow when folder card is rendered', () => {
    const foldersWithDate = [
      { id: 'f1', name: '01 Financials', allow_download: true, updated_at: '2026-10-18T10:00:00Z' },
    ];

    const { container } = render(<DataroomFolderGrid folders={foldersWithDate} />);
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    expect(container.querySelector('.lucide-chevron-right')).toBeInTheDocument();
  });

  it('opens DropdownMenu and handles item actions', async () => {
    const onFolderClick = vi.fn();
    const onDownloadClick = vi.fn();
    const onQnaClick = vi.fn();

    render(
      <DataroomFolderGrid
        folders={mockFolders}
        onFolderClick={onFolderClick}
        onDownloadClick={onDownloadClick}
        onQnaClick={onQnaClick}
        qnaEnabled={true}
      />
    );

    const actionBtn = screen.getByLabelText('Actions for 01 Financials');
    fireEvent.keyDown(actionBtn, { key: 'Enter', code: 'Enter' });

    const viewItem = await screen.findByRole('menuitem', { name: /view/i });
    expect(viewItem).toBeInTheDocument();
    fireEvent.click(viewItem);
    expect(onFolderClick).toHaveBeenCalledWith(mockFolders[0]);
  });
});
