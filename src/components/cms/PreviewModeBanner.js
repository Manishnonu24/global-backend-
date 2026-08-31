"use client";

import { useSearchParams, usePathname } from 'next/navigation';
import React from 'react';

export default function PreviewModeBanner({ draftEnabled }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (!draftEnabled) return null;
  if (searchParams.get('cmsPreview') !== '1') return null;

  // Preserve any existing query parameters except cmsPreview for the returnTo? 
  // No, just return to the clean path is usually safer.
  const exitUrl = `/api/dashboard/pages/0/preview-exit?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold flex items-center justify-center gap-4 z-[9999] relative">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="underline hover:no-underline cursor-pointer bg-transparent border-none text-white font-semibold text-sm"
      >
        Refresh
      </button>
      <a href={exitUrl} className="bg-white text-amber-900 px-2 py-0.5 rounded text-xs hover:bg-amber-100">Exit Preview</a>
    </div>
  );
}
