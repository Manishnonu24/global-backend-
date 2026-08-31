'use client';

import { usePathname } from 'next/navigation';
import CookieBanner from "@/components/CookieBanner";
import CustomScripts from "@/components/utils/CustomScripts";
import PerformanceEffects from "@/components/utils/PerformanceEffects";
import ScrollProvider from "@/components/providers/ScrollProvider";
import GlobalPopup from "@/components/GlobalPopup";

import VisitorTracker from "@/components/utils/VisitorTracker";

function GlobalAnalytics() {
  return null;
}

function isDashboardPath(pathname) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/preview")
  );
}

export default function ClientLayoutHelpers({ children, layout, complianceSettings }) {
  const pathname = usePathname() || "";

  if (isDashboardPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <VisitorTracker siteId={layout?.siteId || layout?.rawSettings?.siteId} />
      <GlobalAnalytics settings={layout?.rawSettings} />
      <CustomScripts scripts={layout?.rawSettings?.scripts} deferScripts={layout?.rawSettings?.performanceConfig?.deferNonEssentialScripts ?? true} />
      <PerformanceEffects
        lazyLoadImages={layout?.rawSettings?.performanceConfig?.lazyLoadImages ?? true}
        lazyLoadVideos={layout?.rawSettings?.performanceConfig?.lazyLoadVideos ?? true}
      />
      <ScrollProvider>
        {children}
      </ScrollProvider>
      <CookieBanner complianceSettings={complianceSettings} />
      <GlobalPopup ctaConfig={layout?.rawSettings?.ctaConfig} />
    </>
  );
}
