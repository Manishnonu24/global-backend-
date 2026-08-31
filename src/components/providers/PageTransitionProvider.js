'use client';

import { useState, useEffect, createContext, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Context kept for backward compatibility if any child reads setStatus
export const PageTransitionContext = createContext(null);

/**
 * Lightweight page transition: a thin progress bar at the very top of the viewport.
 *
 * Design decisions:
 * - Does NOT intercept clicks or delay router.push() — Next.js handles navigation.
 * - Reacts to pathname changes (which Next.js fires after navigation is committed).
 * - Bar flashes in then fades out: ~200ms total, no blocking.
 * - Respects prefers-reduced-motion by skipping entirely.
 */
export default function PageTransitionProvider({ children }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Skip animation entirely for reduced-motion users
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Only animate on actual pathname changes, not the initial render
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // Clear any in-flight animation
    clearTimeout(timerRef.current);

    // Immediately show bar at ~70% (simulates near-completion)
    setWidth(70);
    setVisible(true);

    // Complete bar and fade out after a short delay
    timerRef.current = setTimeout(() => {
      setWidth(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 150);
    }, 80);

    return () => clearTimeout(timerRef.current);
  }, [pathname]);

  return (
    <PageTransitionContext.Provider value={null}>
      {children}

      {/* Thin progress bar — no overlay, no blocking */}
      {visible && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '2px',
            width: `${width}%`,
            background: 'linear-gradient(90deg, #0f7c85, #1fb9fb)',
            zIndex: 100000,
            transition: 'width 80ms ease-out, opacity 150ms ease-out',
            opacity: width === 100 ? 0 : 1,
            pointerEvents: 'none',
          }}
        />
      )}
    </PageTransitionContext.Provider>
  );
}
