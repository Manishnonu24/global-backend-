"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SessionTimeoutHandler({ timeoutMinutes = 30 }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    let lastActivity = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // User interaction events
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > timeoutMs) {
        console.warn("Session inactivity timeout reached. Logging out...");
        const isBackend = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/crm');
        const basePath = isBackend ? '/api/auth' : '/api/auth/frontend';
        signOut({ redirect: false, basePath }).then(() => {
          router.push(isBackend ? "/dashboard/login?reason=timeout" : "/login?reason=timeout");
        });
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      clearInterval(interval);
    };
  }, [session, status, timeoutMinutes, router]);

  // Handle server-side invalidation (next-auth jwt error)
  useEffect(() => {
    if (session?.error === "SessionExpired") {
      const isBackend = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/crm');
      const basePath = isBackend ? '/api/auth' : '/api/auth/frontend';
      signOut({ redirect: false, basePath }).then(() => {
        router.push(isBackend ? "/dashboard/login?reason=timeout" : "/login?reason=timeout");
      });
    }
  }, [session, router]);

  return null;
}
