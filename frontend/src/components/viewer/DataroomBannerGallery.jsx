import { useCallback, useRef, useState } from 'react';

/**
 * DataroomBannerGallery
 * Displays either a single static banner or an interactive banner gallery:
 * - Desktop: Accordion Gallery with smooth expansion on hover/focus
 * - Mobile: Native touch-scroll carousel with visual peeking cue and pagination dots
 * - Fallbacks: 0 images cleanly hides; 1 image displays full width
 */
export function DataroomBannerGallery({
  images = [],
  bannerMode = 'single',
  singleBannerUrl = null,
  dataroomName = '',
  isRootFolder = true,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const carouselRef = useRef(null);

  const validImages = Array.isArray(images) ? images.filter((img) => Boolean(img?.image)) : [];

  const handleMobileScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.firstElementChild?.offsetWidth || 1;
    const gap = 12; // gap-3 = 12px
    const index = Math.round(scrollLeft / (itemWidth + gap));
    setMobileActiveIndex(Math.max(0, Math.min(index, validImages.length - 1)));
  }, [validImages.length]);

  // If banner mode is 'none', render nothing
  if (bannerMode === 'none') {
    return null;
  }

  // If banner mode is 'single'
  if (bannerMode === 'single') {
    if (!singleBannerUrl) return null;
    return (
      <section className="flex-shrink-0 border-b bg-white dark:bg-zinc-950">
        <img
          src={singleBannerUrl}
          alt={`${dataroomName} banner`}
          className="h-40 w-full object-cover md:h-56"
        />
      </section>
    );
  }

  // Fallback 1: 0 images cleanly hides
  if (validImages.length === 0) {
    return null;
  }

  // Fallback 2: 1 image renders as full-width banner
  if (validImages.length === 1) {
    const single = validImages[0];
    return (
      <section className="relative flex-shrink-0 border-b bg-white dark:bg-zinc-950 overflow-hidden">
        <img
          src={single.image}
          alt={single.caption || `${dataroomName} banner`}
          className="h-44 w-full object-cover md:h-64"
        />
        {single.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
            <p className="max-w-4xl text-sm font-medium text-white drop-shadow-xs sm:text-base">
              {single.caption}
            </p>
          </div>
        )}
      </section>
    );
  }

  // 2+ images: Accordion Gallery on desktop, Swipe Carousel on mobile
  const desktopHeight = isRootFolder
    ? 'clamp(320px, 40vh, 460px)'
    : 'clamp(180px, 25vh, 260px)';

  const scrollToSlide = (index) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const itemWidth = el.firstElementChild?.offsetWidth || 0;
    const gap = 12;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({
        left: index * (itemWidth + gap),
        behavior: 'smooth',
      });
    } else {
      el.scrollLeft = index * (itemWidth + gap);
    }
    setMobileActiveIndex(index);
  };

  return (
    <section
      className="flex-shrink-0 border-b bg-neutral-900 overflow-hidden relative select-none"
      aria-label={`${dataroomName} banner gallery`}
    >
      {/* ================= DESKTOP ACCORDION GALLERY (md and above) ================= */}
      <div
        className="hidden md:flex w-full items-stretch transition-all duration-300 ease-out"
        style={{ height: desktopHeight }}
        role="region"
        aria-label="Interactive banner gallery"
      >
        {validImages.map((img, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={img.id || index}
              role="group"
              aria-label={img.caption || `Banner image ${index + 1}`}
              aria-expanded={isActive}
              tabIndex={0}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % validImages.length);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
                }
              }}
              className={`relative h-full overflow-hidden cursor-pointer transition-[flex] duration-300 ease-out ${
                isActive ? 'flex-[3]' : 'flex-1'
              } border-r border-black/20 last:border-r-0`}
            >
              <img
                src={img.image}
                alt={img.caption || `${dataroomName} banner ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-105"
              />

              {/* Inactive overlay dimming for visual hierarchy */}
              <div
                className={`absolute inset-0 transition-colors duration-300 pointer-events-none ${
                  isActive ? 'bg-black/0' : 'bg-black/35 hover:bg-black/20'
                }`}
              />

              {/* Caption Overlay */}
              {img.caption && (
                <div
                  className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 sm:p-5 transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-0 md:opacity-60'
                  }`}
                >
                  <p
                    className={`text-white drop-shadow-xs transition-all duration-200 ${
                      isActive
                        ? 'text-sm sm:text-base font-semibold line-clamp-2'
                        : 'text-xs font-medium truncate'
                    }`}
                  >
                    {img.caption}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= MOBILE SWIPE CAROUSEL (< md) ================= */}
      <div className="md:hidden py-3">
        <div
          ref={carouselRef}
          onScroll={handleMobileScroll}
          className="flex gap-3 overflow-x-auto px-4 snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {validImages.map((img, index) => (
            <div
              key={img.id || index}
              className="relative shrink-0 w-[85%] snap-center rounded-xl overflow-hidden shadow-md aspect-[16/9] max-h-[280px] bg-neutral-800"
            >
              <img
                src={img.image}
                alt={img.caption || `${dataroomName} banner ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                  <p className="text-xs sm:text-sm font-medium text-white line-clamp-2 drop-shadow-xs">
                    {img.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex justify-center items-center gap-1.5 mt-2.5">
          {validImages.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              onClick={() => scrollToSlide(dotIndex)}
              aria-label={`Go to slide ${dotIndex + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIndex === mobileActiveIndex
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
