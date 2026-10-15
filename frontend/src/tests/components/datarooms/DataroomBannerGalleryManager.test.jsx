import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { DataroomBannerGalleryManager } from '../../../components/datarooms/DataroomBannerGalleryManager';
import * as api from '../../../services/api';
import '../../../i18n';

vi.mock('../../../services/api', () => ({
  createDataroomBannerImage: vi.fn(),
  updateDataroomBannerImage: vi.fn(),
  deleteDataroomBannerImage: vi.fn(),
  reorderDataroomBannerImages: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DataroomBannerGalleryManager', () => {
  const mockOnImagesChange = vi.fn();
  const dataroomId = 'dr-test-123';

  const sampleImages = [
    { id: 'img-1', image_url: 'https://example.com/b1.jpg', caption: 'First Banner Caption', position: 0 },
    { id: 'img-2', image_url: 'https://example.com/b2.jpg', caption: 'Second Banner Caption', position: 1 },
    { id: 'img-3', image_url: 'https://example.com/b3.jpg', caption: '', position: 2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when images array is empty', () => {
    render(
      <DataroomBannerGalleryManager
        dataroomId={dataroomId}
        images={[]}
        onImagesChange={mockOnImagesChange}
        canManage={true}
      />
    );

    expect(screen.getByText('No banner images uploaded yet.')).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 10/i)).toBeInTheDocument();
  });

  it('renders images list with badges, previews, captions, and reorder controls', () => {
    render(
      <DataroomBannerGalleryManager
        dataroomId={dataroomId}
        images={sampleImages}
        onImagesChange={mockOnImagesChange}
        canManage={true}
      />
    );

    expect(screen.getByText('First Banner Caption')).toBeInTheDocument();
    expect(screen.getByText('Second Banner Caption')).toBeInTheDocument();
    expect(screen.getByText('No caption...')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 10/i)).toBeInTheDocument();
  });

  describe('file uploads and validation', () => {
    it('rejects unsupported file type with error toast', async () => {
      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      const badFile = new File(['dummy'], 'file.gif', { type: 'image/gif' });

      fireEvent.change(fileInput, { target: { files: [badFile] } });

      expect(toast.error).toHaveBeenCalledWith('Only JPG, PNG, and WebP images are allowed.');
      expect(api.createDataroomBannerImage).not.toHaveBeenCalled();
    });

    it('rejects file larger than 5MB with error toast', async () => {
      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      const hugeFile = new File(['a'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(hugeFile, 'size', { value: 6 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [hugeFile] } });

      expect(toast.error).toHaveBeenCalledWith('Image size cannot exceed 5 MB.');
      expect(api.createDataroomBannerImage).not.toHaveBeenCalled();
    });

    it('uploads valid file and invokes onImagesChange', async () => {
      api.createDataroomBannerImage.mockResolvedValueOnce({ data: { id: 'img-new' } });

      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      const goodFile = new File(['fake-bytes'], 'banner.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [goodFile] } });

      await waitFor(() => {
        expect(api.createDataroomBannerImage).toHaveBeenCalledWith(dataroomId, {
          image: goodFile,
          caption: '',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Banner image uploaded successfully.');
      expect(mockOnImagesChange).toHaveBeenCalledTimes(1);
    });

    it('disables add button when 10 images are reached', () => {
      const tenImages = Array.from({ length: 10 }, (_, i) => ({
        id: `img-${i}`,
        image: `https://example.com/b${i}.jpg`,
        caption: `Caption ${i}`,
        position: i,
      }));

      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={tenImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const addButton = screen.getByRole('button', { name: /add image/i });
      expect(addButton).toBeDisabled();
      expect(screen.getByText(/10 \/ 10/i)).toBeInTheDocument();
    });
  });

  describe('caption editing', () => {
    it('allows editing caption and saves on button click', async () => {
      api.updateDataroomBannerImage.mockResolvedValueOnce({ data: { id: 'img-1', caption: 'Updated Title' } });

      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit caption for banner image 1' });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('First Banner Caption');
      await userEvent.clear(input);
      await userEvent.type(input, 'Updated Title');

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.updateDataroomBannerImage).toHaveBeenCalledWith(dataroomId, 'img-1', {
          caption: 'Updated Title',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Caption updated.');
      expect(mockOnImagesChange).toHaveBeenCalledTimes(1);
    });

    it('cancels caption editing without making API calls', async () => {
      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit caption for banner image 1' });
      fireEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(screen.getByText('First Banner Caption')).toBeInTheDocument();
      expect(api.updateDataroomBannerImage).not.toHaveBeenCalled();
    });
  });

  describe('reordering', () => {
    it('disables Move Left on first item and Move Right on last item', () => {
      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const firstMoveLeft = screen.getByRole('button', { name: 'Move banner image 1 left' });
      expect(firstMoveLeft).toBeDisabled();

      const lastMoveRight = screen.getByRole('button', { name: 'Move banner image 3 right' });
      expect(lastMoveRight).toBeDisabled();
    });

    it('reorders images when clicking Move Right and calls API', async () => {
      api.reorderDataroomBannerImages.mockResolvedValueOnce({ data: { message: 'ok' } });

      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const firstMoveRight = screen.getByRole('button', { name: 'Move banner image 1 right' });
      fireEvent.click(firstMoveRight);

      await waitFor(() => {
        expect(api.reorderDataroomBannerImages).toHaveBeenCalledWith(dataroomId, [
          { id: 'img-2', position: 0 },
          { id: 'img-1', position: 1 },
          { id: 'img-3', position: 2 },
        ]);
      });

      expect(toast.success).toHaveBeenCalledWith('Banner images reordered.');
      expect(mockOnImagesChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('deletion with confirmation dialog', () => {
    it('opens confirmation modal and deletes image upon confirmation', async () => {
      api.deleteDataroomBannerImage.mockResolvedValueOnce({});

      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={true}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Delete banner image 1' });
      fireEvent.click(deleteButton);

      expect(screen.getByRole('heading', { name: 'Delete Banner Image?' })).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to remove this image from the banner gallery?')).toBeInTheDocument();

      const confirmDeleteButton = screen.getAllByRole('button', { name: 'Delete' }).find(
        (b) => b.getAttribute('type') === 'button'
      );
      fireEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(api.deleteDataroomBannerImage).toHaveBeenCalledWith(dataroomId, 'img-1');
      });

      expect(toast.success).toHaveBeenCalledWith('Banner image deleted.');
      expect(mockOnImagesChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('read-only mode (canManage=false)', () => {
    it('hides upload button, edit buttons, reorder buttons, and delete buttons', () => {
      render(
        <DataroomBannerGalleryManager
          dataroomId={dataroomId}
          images={sampleImages}
          onImagesChange={mockOnImagesChange}
          canManage={false}
        />
      );

      expect(screen.queryByRole('button', { name: /add image/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit caption/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /move banner/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete banner image/i })).not.toBeInTheDocument();
    });
  });
});
