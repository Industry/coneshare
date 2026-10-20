import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataroomDocumentCard } from '../../../components/viewer/DataroomDocumentCard';
import '../../../i18n';

describe('DataroomDocumentCard', () => {
  const mockDoc = {
    id: 'doc1',
    name: 'Series B Term Sheet.pdf',
    document_type: 'pdf',
    file_size: 1048576, // 1 MB
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    allow_download: true,
    enable_watermark: true,
  };

  it('renders document metadata correctly', () => {
    render(
      <DataroomDocumentCard
        item={mockDoc}
        index={1}
        showIndex={true}
        onItemClick={vi.fn()}
      />
    );

    expect(screen.getByText('Series B Term Sheet.pdf')).toBeInTheDocument();
    expect(screen.getByText('#01')).toBeInTheDocument();
    expect(screen.getByText('pdf')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText(/Watermarked/i)).toBeInTheDocument();
  });

  it('triggers onItemClick when heading or View Document button is clicked', () => {
    const onItemClick = vi.fn();
    render(
      <DataroomDocumentCard
        item={mockDoc}
        onItemClick={onItemClick}
      />
    );

    fireEvent.click(screen.getByText('Series B Term Sheet.pdf'));
    expect(onItemClick).toHaveBeenCalledTimes(1);

    const viewBtn = screen.getByRole('button', { name: /View Document/i });
    fireEvent.click(viewBtn);
    expect(onItemClick).toHaveBeenCalledTimes(2);
  });

  it('renders Watch Video CTA for video documents', () => {
    const videoDoc = {
      ...mockDoc,
      id: 'doc2',
      name: 'Product Demo.mp4',
      document_type: 'video',
    };
    render(
      <DataroomDocumentCard
        item={videoDoc}
        onItemClick={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Watch Video/i })).toBeInTheDocument();
  });

  it('triggers onDownloadClick and onQnaClick when action buttons are clicked', () => {
    const onDownloadClick = vi.fn();
    const onQnaClick = vi.fn();

    render(
      <DataroomDocumentCard
        item={mockDoc}
        onItemClick={vi.fn()}
        onDownloadClick={onDownloadClick}
        onQnaClick={onQnaClick}
        qnaEnabled={true}
      />
    );

    const qnaBtn = screen.getByTitle('Ask question');
    fireEvent.click(qnaBtn);
    expect(onQnaClick).toHaveBeenCalledWith(mockDoc);

    const downloadBtn = screen.getByTitle('Download');
    fireEvent.click(downloadBtn);
    expect(onDownloadClick).toHaveBeenCalledWith(mockDoc);
  });
});
