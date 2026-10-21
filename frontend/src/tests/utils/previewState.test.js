import { describe, it, expect } from 'vitest';
import {
  isPreviewPending,
  isPreviewFailed,
  hasRenderablePages,
} from '../../utils/previewState';

describe('previewState utilities', () => {
  describe('isPreviewPending', () => {
    it('returns true for pending preview statuses', () => {
      expect(isPreviewPending({ preview_status: 'not_generated' })).toBe(true);
      expect(isPreviewPending({ preview_status: 'processing' })).toBe(true);
    });

    it('returns false for non-pending preview statuses', () => {
      expect(isPreviewPending({ preview_status: 'ready' })).toBe(false);
      expect(isPreviewPending({ preview_status: 'completed' })).toBe(false);
      expect(isPreviewPending({ preview_status: 'failed' })).toBe(false);
      expect(isPreviewPending(null)).toBe(false);
      expect(isPreviewPending(undefined)).toBe(false);
    });
  });

  describe('isPreviewFailed', () => {
    it('returns true when preview_status or render_status is failed', () => {
      expect(isPreviewFailed({ preview_status: 'failed' })).toBe(true);
      expect(isPreviewFailed({ render_status: 'failed' })).toBe(true);
      expect(isPreviewFailed({ preview_status: 'failed', render_status: 'failed' })).toBe(true);
    });

    it('returns false when neither status is failed', () => {
      expect(isPreviewFailed({ preview_status: 'processing', render_status: 'processing' })).toBe(false);
      expect(isPreviewFailed({ preview_status: 'ready', render_status: 'ready' })).toBe(false);
      expect(isPreviewFailed(null)).toBe(false);
    });
  });

  describe('hasRenderablePages', () => {
    it('returns true when pages array has elements', () => {
      expect(hasRenderablePages({ pages: [{ page_number: 1, url: '/p1.png' }] })).toBe(true);
    });

    it('returns false when pages array is empty or not an array', () => {
      expect(hasRenderablePages({ pages: [] })).toBe(false);
      expect(hasRenderablePages({ pages: null })).toBe(false);
      expect(hasRenderablePages({})).toBe(false);
      expect(hasRenderablePages(null)).toBe(false);
    });
  });
});
