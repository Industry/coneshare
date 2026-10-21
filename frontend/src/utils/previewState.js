export function isPreviewPending(documentData) {
  return ['not_generated', 'processing'].includes(documentData?.preview_status);
}

export function isPreviewFailed(documentData) {
  return documentData?.preview_status === 'failed' || documentData?.render_status === 'failed';
}

export function hasRenderablePages(documentData) {
  return Array.isArray(documentData?.pages) && documentData.pages.length > 0;
}
