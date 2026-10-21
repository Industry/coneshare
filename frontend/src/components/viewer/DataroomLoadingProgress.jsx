import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Progress } from '../ui/Progress';
import { useBranding } from '../../contexts/BrandingProvider';

export function DataroomLoadingProgress({ publicMeta = null, targetName = null }) {
  const { t } = useTranslation();
  const { brandName, brandLogoUrl } = useBranding();
  const [progress, setProgress] = useState(15);

  const stages = [
    { threshold: 35, message: t('viewer.connectingDataroom', { defaultValue: 'Connecting to dataroom...' }) },
    { threshold: 65, message: t('viewer.loadingWorkspace', { defaultValue: 'Loading dataroom workspace...' }) },
    { threshold: 85, message: t('viewer.loadingResourceIndex', { defaultValue: 'Loading folder structure & resource index...' }) },
    { threshold: 95, message: t('viewer.preparingDataroomView', { defaultValue: 'Almost ready, preparing content...' }) },
  ];

  const currentStage = stages.find((s) => progress < s.threshold) || stages[stages.length - 1];

  useEffect(() => {
    // Eased progress increment
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return 95;
        }
        // As it approaches 95, slow down the increment
        const increment = Math.max(0.4, (95 - prev) * 0.12);
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, []);

  const effectiveLogoUrl = publicMeta?.resolved_brand_logo_url || brandLogoUrl;
  const effectiveTitle = targetName || publicMeta?.target_name || t('viewer.loadingDataroom', { defaultValue: 'Entering Dataroom...' });

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 text-center animate-fadeIn">
        {/* Brand / Secure Shield Icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50 dark:bg-indigo-950 dark:text-indigo-400 dark:ring-indigo-950/50">
          {effectiveLogoUrl ? (
            <img src={effectiveLogoUrl} alt={brandName} className="h-8 w-8 object-contain" />
          ) : (
            <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate" title={effectiveTitle}>
          {effectiveTitle}
        </h2>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-medium">
          {publicMeta?.owner_name ? `${publicMeta.owner_name} • ${brandName}` : brandName}
        </p>

        {/* Progress Bar & Dynamic Stage Info */}
        <div className="mt-8 mb-2 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span
              role="status"
              aria-live="polite"
              className="text-gray-600 dark:text-gray-300 font-medium truncate pr-2 transition-all duration-300"
            >
              {currentStage?.message}
            </span>
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
              {Math.min(99, Math.round(progress))}%
            </span>
          </div>

          <Progress
            value={progress}
            className="h-2 w-full bg-gray-100 dark:bg-gray-700"
            indicatorClassName="bg-indigo-600 dark:bg-indigo-500 transition-all duration-150 ease-out"
          />
        </div>
      </div>
    </div>
  );
}
