'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/**
 * GlobalPopup
 * An optional CTA popup modal controlled by ctaConfig from layout settings.
 * Appears after a delay and is dismissible. Respects sessionStorage to avoid
 * showing on every navigation.
 */
export default function GlobalPopup({ ctaConfig }) {
  const [visible, setVisible] = useState(false);

  const enabled  = ctaConfig?.popupEnabled === true;
  const delay    = Number(ctaConfig?.popupDelay  ?? 5000);
  const title    = ctaConfig?.popupTitle    || '';
  const body     = ctaConfig?.popupBody     || '';
  const ctaText  = ctaConfig?.popupCtaText  || 'Learn More';
  const ctaUrl   = ctaConfig?.popupCtaUrl   || '/';

  useEffect(() => {
    if (!enabled || !title) return;
    try {
      if (sessionStorage.getItem('popup-dismissed')) return;
    } catch {}

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [enabled, delay, title]);

  const dismiss = () => {
    try {
      sessionStorage.setItem('popup-dismissed', '1');
    } catch {}
    setVisible(false);
  };

  if (!enabled || !visible || !title) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close popup"
        >
          <X size={18} />
        </button>

        {title && (
          <h2 className="font-extrabold text-xl text-[#1e2a35] mb-2 pr-6">{title}</h2>
        )}
        {body && (
          <p className="text-sm text-slate-500 leading-relaxed mb-6">{body}</p>
        )}

        <div className="flex items-center gap-3">
          <Link
            href={ctaUrl}
            onClick={dismiss}
            className="flex-1 text-center px-5 py-2.5 text-sm font-bold text-white bg-[#0f7c85] hover:bg-[#0c6b73] rounded-full transition-colors shadow-sm"
          >
            {ctaText}
          </Link>
          <button
            onClick={dismiss}
            className="px-4 py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
