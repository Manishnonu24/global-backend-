"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Renders a single next-auth/react SessionProvider with the correct basePath.
 *
 * IMPORTANT: next-auth v4's client stores basePath in a MODULE-LEVEL global
 * (not per-instance state). Nesting two <SessionProvider> components in the
 * same React tree means both write to the same global on mount; because React
 * fires useEffect bottom-up (child first, parent last), the OUTER provider
 * always overwrites the inner one. We therefore render exactly ONE provider.
 *
 * The correct basePath is computed in src/app/layout.js from the x-pathname
 * header injected by src/proxy.js:
 *   - dashboard/admin routes → "/api/auth"
 *   - all public/frontend routes → "/api/auth/frontend"
 */
export default function AuthProvider({ children, basePath }) {
  const effectiveBasePath = basePath || "/api/auth";
  return (
    <NextAuthSessionProvider basePath={effectiveBasePath}>
      {children}
    </NextAuthSessionProvider>
  );
}
