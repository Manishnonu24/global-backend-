'use client';

import Link from 'next/link';

/**
 * Minimal public-facing Footer used on auth pages (login, forgot-password,
 * reset-password). Keeps the design consistent with the rest of the auth
 * shell without pulling in the heavy CMS-driven footer used on public pages.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-100 bg-white/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0f7c85] flex items-center justify-center">
            <span className="text-white font-extrabold text-[10px] leading-none select-none">G</span>
          </div>
          <span
            className="text-[13px] font-heading font-bold text-slate-500"
            style={{ fontFamily: 'var(--font-body, sans-serif)' }}
          >
            Global Backend
          </span>
        </div>

        {/* Copyright */}
        <p className="text-[12px] text-slate-400 text-center">
          &copy; {year} Global Backend. All rights reserved.
        </p>

        {/* Links */}
        <nav className="flex items-center gap-4">
          <Link
            href="/legal/privacy"
            className="text-[12px] text-slate-400 hover:text-[#0f7c85] transition-colors font-medium"
          >
            Privacy Policy
          </Link>
          <Link
            href="/legal/terms"
            className="text-[12px] text-slate-400 hover:text-[#0f7c85] transition-colors font-medium"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
