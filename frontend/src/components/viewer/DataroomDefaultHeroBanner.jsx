import { Clock, Lock, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../../utils/formatters';

export function DataroomDefaultHeroBanner({
  dataroomName = '',
  dataroomId = '',
  description = '',
  updatedAt = null,
  isWatermarked = false,
  isNdaProtected = false,
  hasViewSession = false,
}) {
  const { t } = useTranslation();
  const rawId = String(dataroomId || '').trim();
  const shareIdSuffix = rawId ? (rawId.length <= 8 ? rawId : rawId.slice(-6)).toUpperCase() : '';

  return (
    <section
      data-testid="dataroom-default-hero"
      className="relative w-full rounded-2xl overflow-hidden bg-[#141b2b] text-white shadow-sm border border-slate-800/60"
    >
      {/* Glow mesh graphic background with subtle radiant violet & sapphire contour gradients */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 45%),
            radial-gradient(circle at 15% 85%, rgba(139, 92, 246, 0.22) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 60%)
          `,
        }}
      />
      {/* Subtle architectural dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />
      {/* Horizontal light dampening overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141b2b]/95 via-[#141b2b]/80 to-transparent pointer-events-none" />

      {/* Banner Content */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col justify-between min-h-[200px] gap-4">
        {/* Top bar: Visitor Status & Last Updated */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#f8f9fa] text-xs font-medium border border-white/10 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c0ff] animate-pulse" />
            <span>
              {hasViewSession
                ? t('viewer.visitorMode', { defaultValue: 'Visitor Mode' })
                : t('viewer.previewMode', { defaultValue: 'Customer View · Read-Only' })}
            </span>
          </div>

          {updatedAt ? (
            <div className="flex items-center gap-1.5 text-[#c6c6cd] text-xs font-medium">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>{t('common.updated', { defaultValue: 'Updated' })} {formatRelativeTime(updatedAt)}</span>
            </div>
          ) : null}
        </div>

        {/* Center Title & Description */}
        <div className="max-w-3xl mt-1 sm:mt-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#c3c0ff] font-semibold block mb-1.5">
            {t('viewer.virtualDataroom', { defaultValue: 'Virtual Dataroom' })}
            {shareIdSuffix ? ` · Share ID #${shareIdSuffix}` : ''}
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#f8f9fa] tracking-tight leading-tight">
            {dataroomName}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-[#7d8497] mt-2 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Bottom tags: Compliance & Protections */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-white/10">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[#f8f9fa] text-[10px] font-mono font-bold tracking-wider uppercase">
              {t('viewer.restrictedConfidential', { defaultValue: 'RESTRICTED CONFIDENTIAL' })}
            </span>
            {isWatermarked && (
              <span
                data-testid="hero-watermark-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 text-[10px] font-medium"
              >
                <Lock className="h-3 w-3 text-[#c3c0ff]" />
                <span>{t('viewer.watermarked', { defaultValue: 'Watermarked' })}</span>
              </span>
            )}
            {isNdaProtected && (
              <span
                data-testid="hero-nda-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 text-[10px] font-medium"
              >
                <ShieldCheck className="h-3 w-3 text-emerald-300" />
                <span>{t('viewer.ndaActive', { defaultValue: 'NDA Active' })}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
