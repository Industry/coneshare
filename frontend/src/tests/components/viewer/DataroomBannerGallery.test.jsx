import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataroomBannerGallery } from '../../../components/viewer/DataroomBannerGallery';
import '../../../i18n';

describe('DataroomBannerGallery', () => {
  const sampleImages = [
    { id: 'img-1', image: 'https://example.com/banner1.jpg', caption: 'First Slide Caption' },
    { id: 'img-2', image: 'https://example.com/banner2.jpg', caption: 'Second Slide Caption' },
    { id: 'img-3', image: 'https://example.com/banner3.jpg', caption: '' },
  ];

  it('renders nothing when bannerMode is "none"', () => {
    const { container } = render(
      <DataroomBannerGallery
        bannerMode="none"
        images={sampleImages}
        singleBannerUrl="https://example.com/single.jpg"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  describe('single banner mode', () => {
    it('renders single banner image when singleBannerUrl is provided', () => {
      render(
        <DataroomBannerGallery
          bannerMode="single"
          singleBannerUrl="https://example.com/single.jpg"
          dataroomName="Series A"
        />
      );

      const img = screen.getByRole('img', { name: 'Series A banner' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/single.jpg');
    });

    it('renders nothing when singleBannerUrl is null or empty', () => {
      const { container } = render(
        <DataroomBannerGallery
          bannerMode="single"
          singleBannerUrl={null}
          dataroomName="Series A"
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('gallery banner mode fallbacks', () => {
    it('renders nothing when images array is empty or has no valid image URLs', () => {
      const { container, rerender } = render(
        <DataroomBannerGallery bannerMode="gallery" images={[]} />
      );
      expect(container.firstChild).toBeNull();

      rerender(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={[{ id: '1', image: '' }, { id: '2', image: null }]}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders full-width banner when exactly 1 valid image is provided', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={[{ id: 'img-1', image: 'https://example.com/single.jpg', caption: 'Solo Banner Caption' }]}
          dataroomName="Project Solar"
        />
      );

      const img = screen.getByRole('img', { name: 'Solo Banner Caption' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/single.jpg');
      expect(screen.getByText('Solo Banner Caption')).toBeInTheDocument();
    });

    it('renders 1 image without caption overlay when caption is absent', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={[{ id: 'img-1', image: 'https://example.com/single.jpg', caption: '' }]}
          dataroomName="Project Solar"
        />
      );

      const img = screen.getByRole('img', { name: 'Project Solar banner' });
      expect(img).toBeInTheDocument();
      expect(screen.queryByText('Solo Banner Caption')).not.toBeInTheDocument();
    });
  });

  describe('gallery banner mode with multiple images (2+)', () => {
    it('renders interactive accordion gallery for desktop with root folder height', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
          isRootFolder={true}
        />
      );

      const region = screen.getByRole('region', { name: 'Interactive banner gallery' });
      expect(region).toHaveStyle({ height: 'clamp(320px, 40vh, 460px)' });

      const items = screen.getAllByRole('group');
      expect(items.length).toBe(3);

      // Default active index is 0 -> flex-[3], others flex-1
      expect(items[0]).toHaveClass('flex-[3]');
      expect(items[1]).toHaveClass('flex-1');
      expect(items[2]).toHaveClass('flex-1');
      expect(items[0]).toHaveAttribute('aria-expanded', 'true');
      expect(items[1]).toHaveAttribute('aria-expanded', 'false');
    });

    it('applies subfolder height when isRootFolder is false', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
          isRootFolder={false}
        />
      );

      const region = screen.getByRole('region', { name: 'Interactive banner gallery' });
      expect(region).toHaveStyle({ height: 'clamp(180px, 25vh, 260px)' });
    });

    it('expands item on hover and focus', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
        />
      );

      const items = screen.getAllByRole('group');

      // Hover on second image
      fireEvent.mouseEnter(items[1]);
      expect(items[1]).toHaveClass('flex-[3]');
      expect(items[0]).toHaveClass('flex-1');
      expect(items[1]).toHaveAttribute('aria-expanded', 'true');

      // Focus on third image
      fireEvent.focus(items[2]);
      expect(items[2]).toHaveClass('flex-[3]');
      expect(items[1]).toHaveClass('flex-1');
      expect(items[2]).toHaveAttribute('aria-expanded', 'true');
    });

    it('handles keyboard navigation with ArrowRight and ArrowLeft', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
        />
      );

      const items = screen.getAllByRole('group');

      // Initial active is 0. Press ArrowRight -> active becomes 1
      fireEvent.keyDown(items[0], { key: 'ArrowRight' });
      expect(items[1]).toHaveClass('flex-[3]');

      // Press ArrowRight again -> active becomes 2
      fireEvent.keyDown(items[1], { key: 'ArrowRight' });
      expect(items[2]).toHaveClass('flex-[3]');

      // Press ArrowRight on last -> wraps around to 0
      fireEvent.keyDown(items[2], { key: 'ArrowRight' });
      expect(items[0]).toHaveClass('flex-[3]');

      // Press ArrowLeft on first -> wraps around to 2
      fireEvent.keyDown(items[0], { key: 'ArrowLeft' });
      expect(items[2]).toHaveClass('flex-[3]');
    });

    it('renders mobile carousel dots and handles clicking a dot to navigate', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
        />
      );

      const dotButtons = screen.getAllByRole('button', { name: /go to slide/i });
      expect(dotButtons.length).toBe(3);

      // Click second dot
      fireEvent.click(dotButtons[1]);
      expect(dotButtons[1]).toHaveClass('w-5', 'bg-white');
    });

    it('does not violate Rules of Hooks when re-rendered across changing modes and image counts', () => {
      const { rerender, container } = render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={[]}
          dataroomName="Acme Deal"
        />
      );
      expect(container.firstChild).toBeNull();

      // Re-render with 1 image
      rerender(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={[sampleImages[0]]}
          dataroomName="Acme Deal"
        />
      );
      expect(screen.getByAltText('First Slide Caption')).toBeInTheDocument();

      // Re-render with multiple images
      rerender(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Acme Deal"
        />
      );
      expect(screen.getByRole('region', { name: 'Interactive banner gallery' })).toBeInTheDocument();

      // Re-render switching to single mode
      rerender(
        <DataroomBannerGallery
          bannerMode="single"
          singleBannerUrl="https://example.com/single.jpg"
          dataroomName="Acme Deal"
        />
      );
      expect(screen.getByAltText('Acme Deal banner')).toBeInTheDocument();
    });
  });

  describe('banner metadata and security overlay', () => {
    it('renders metadata overlay with title, updated time, and NDA pill in single mode', () => {
      render(
        <DataroomBannerGallery
          bannerMode="single"
          singleBannerUrl="https://example.com/single.jpg"
          dataroomName="Project Alpha"
          updatedAt="2026-10-19T10:00:00Z"
          isWatermarked={true}
          isNdaProtected={true}
        />
      );

      expect(screen.getByTestId('banner-metadata-overlay')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getByTestId('banner-updated-time')).toBeInTheDocument();
      expect(screen.getByTestId('banner-nda-pill')).toBeInTheDocument();
      expect(screen.queryByTestId('banner-watermark-pill')).not.toBeInTheDocument();
    });

    it('renders security pills and updated time in multi-image gallery mode', () => {
      render(
        <DataroomBannerGallery
          bannerMode="gallery"
          images={sampleImages}
          dataroomName="Project Multi"
          updatedAt="2026-10-19T10:00:00Z"
          isWatermarked={true}
          isNdaProtected={true}
        />
      );

      expect(screen.getByTestId('banner-updated-time')).toBeInTheDocument();
      expect(screen.getByTestId('banner-security-pills')).toBeInTheDocument();
      expect(screen.getByTestId('banner-nda-pill')).toBeInTheDocument();
      expect(screen.queryByTestId('banner-watermark-pill')).not.toBeInTheDocument();
    });
  });
});

