import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataroomFeaturedGrid } from '../../../components/viewer/DataroomFeaturedGrid';
import '../../../i18n';

describe('DataroomFeaturedGrid', () => {
  const mockFeaturedItems = [
    {
      id: 'f_starred_1',
      name: '01 Executive Briefing',
      isFolder: true,
      is_starred: true,
      allow_download: true,
      updated_at: '2026-10-18T10:00:00Z',
    },
    {
      id: 'doc_starred_2',
      name: 'SOC2-Audit-Report.pdf',
      document_type: 'pdf',
      file_size: 2097152, // 2MB
      is_starred: true,
      allow_download: true,
      updated_at: '2026-10-19T10:00:00Z',
      enable_watermark: true,
    },
  ];

  it('returns null when items array is empty or undefined', () => {
    const { container: c1 } = render(<DataroomFeaturedGrid items={[]} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<DataroomFeaturedGrid items={null} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders section title with count and cards with top icon and type badge', () => {
    const { container } = render(<DataroomFeaturedGrid items={mockFeaturedItems} />);

    expect(screen.getByText(/Featured Resources \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('01 Executive Briefing')).toBeInTheDocument();
    expect(screen.getByText('SOC2-Audit-Report.pdf')).toBeInTheDocument();

    // Type badge on the right
    expect(screen.getByText(/^Folders?$/i)).toBeInTheDocument();
    expect(screen.getByText('pdf')).toBeInTheDocument();

    // Icons rendered
    expect(container.querySelector('.lucide-folder')).toBeInTheDocument();

    // Q&A and 3-dots actions replaced/removed from card
    expect(screen.queryByTitle('Ask question')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Actions for/i)).not.toBeInTheDocument();
  });

  it('triggers onFolderClick when folder title or Open Folder button is clicked', () => {
    const onFolderClick = vi.fn();
    render(<DataroomFeaturedGrid items={mockFeaturedItems} onFolderClick={onFolderClick} />);

    const openFolderBtn = screen.getByRole('button', { name: /Open Folder/i });
    fireEvent.click(openFolderBtn);
    expect(onFolderClick).toHaveBeenCalledTimes(1);
    expect(onFolderClick).toHaveBeenCalledWith(mockFeaturedItems[0]);

    fireEvent.click(screen.getByText('01 Executive Briefing'));
    expect(onFolderClick).toHaveBeenCalledTimes(2);
  });

  it('triggers onItemClick when document title or View Document button is clicked', () => {
    const onItemClick = vi.fn();
    render(<DataroomFeaturedGrid items={mockFeaturedItems} onItemClick={onItemClick} />);

    const viewDocBtn = screen.getByRole('button', { name: /View Document/i });
    fireEvent.click(viewDocBtn);
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(mockFeaturedItems[1]);

    fireEvent.click(screen.getByText('SOC2-Audit-Report.pdf'));
    expect(onItemClick).toHaveBeenCalledTimes(2);
  });
});
