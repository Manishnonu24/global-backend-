'use client';

import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

/**
 * CookieBanner
 * Shows a GDPR/privacy cookie consent banner at the bottom of the screen.
 * Respects the complianceSettings prop and localStorage to avoid re-showing.
 */
export default function CookieBanner({ complianceSettings }) {
  const [visible, setVisible] = useState(false);

  const enabled = complianceSettings?.cookieBannerEnabled !== false;
  const message =
    complianceSettings?.cookieBannerText ||
    'We use cookies to improve your experience. By continuing, you agree to our use of cookies.';
  const privacyUrl = complianceSettings?.privacyPolicyUrl || '/legal/privacy';

  useEffect(() => {
    if (!enabled) return;
    try {
      const accepted = localStorage.getItem('cookie-consent');
      if (!accepted) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [enabled]);

  const accept = () => {
    try {
      localStorage.setItem('cookie-consent', 'accepted');
    } catch {}
    setVisible(false);
  };

  const decline = () => {
    try {
      localStorage.setItem('cookie-consent', 'declined');
    } catch {}
    setVisible(false);
  };

  if (!enabled || !visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie size={20} className="text-[#0f7c85] shrink-0 mt-0.5 sm:mt-0" />
        <p className="flex-1 text-sm text-slate-600 leading-relaxed">
          {message}{' '}
          <a href={privacyUrl} className="text-[#0f7c85] underline font-medium hover:text-[#0c6b73]">
            Privacy Policy
          </a>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0f7c85] hover:bg-[#0c6b73] rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
        <button
          onClick={decline}
          className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 sm:hidden"
          aria-label="Close cookie banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
