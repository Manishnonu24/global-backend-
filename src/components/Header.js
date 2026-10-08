'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * Minimal public-facing Header used on auth pages (login, forgot-password,
 * reset-password). It shows the site logo/name and a simple nav link back to
 * the home page. It is intentionally lightweight – the full dashboard shell
 * has its own header component.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/60'
          : 'bg-white/70 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline group"
          aria-label="Go to homepage"
        >
          {/* Logo image – falls back gracefully if not present */}
          <div className="w-8 h-8 rounded-full bg-[#0f7c85] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-extrabold text-sm leading-none select-none">G</span>
          </div>
          <span
            className="font-heading font-extrabold text-[17px] text-[#1e2a35] tracking-tight group-hover:text-[#0f7c85] transition-colors"
            style={{ fontFamily: 'var(--font-body, sans-serif)' }}
          >
            Global Backend
          </span>
        </Link>

        {/* Right-side nav */}
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-heading font-semibold text-slate-500 hover:text-[#0f7c85] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#0f7c85]/5"
          >
            Sign In
          </Link>
          <Link
            href="/login?tab=register"
            className="text-[13px] font-heading font-bold text-white bg-[#0f7c85] hover:bg-[#0c6b73] px-4 py-2 rounded-full transition-colors shadow-sm hover:shadow-md"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
