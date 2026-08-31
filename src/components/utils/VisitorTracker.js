"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function VisitorTracker({ siteId }) {
  const pathname = usePathname();
  const startTimeRef = useRef(0);
  const activeSiteId = siteId || process.env.NEXT_PUBLIC_SITE_ID || "AHP";

  useEffect(() => {
    if (!pathname) return;

    // Exclude internal admin / system pages
    const isExcluded =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/crm") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/preview");

    if (isExcluded) return;

    // Ensure visitor ID exists
    let visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor_id") : null;
    if (!visitorId) {
      visitorId = `visitor_${Math.random().toString(36).slice(2, 11)}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("visitor_id", visitorId);
      }
    }

    // Check cookie consent status if present (default allowed if consent banner isn't blocking)
    if (typeof window !== "undefined") {
      const consentStr = localStorage.getItem("cookie_consent");
      if (consentStr) {
        try {
          const consent = JSON.parse(consentStr);
          if (consent.analytics === false) return; // Respect user decline choice
        } catch (e) {
          // ignore error
        }
      }
    }

    startTimeRef.current = Date.now();

    const getDeviceType = () => {
      if (typeof window === "undefined") return "Desktop";
      const ua = navigator.userAgent || "";
      if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return "Mobile";
      return "Desktop";
    };

    const sendPing = (duration = 0) => {
      const payload = {
        siteId: activeSiteId,
        visitorId,
        pageViewed: pathname,
        deviceInfo: getDeviceType(),
        trafficSource: typeof document !== "undefined" && document.referrer ? new URL(document.referrer).hostname : "Direct",
        duration: Math.round(duration),
      };

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/visitors/ping", blob);
      } else {
        fetch("/api/visitors/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Initial page view ping
    sendPing(0);

    // Periodic heartbeat to record duration (every 15s)
    const interval = setInterval(() => {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      sendPing(duration);
    }, 15000);

    // Send final duration ping on unload or navigation away
    const handleUnload = () => {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      sendPing(duration);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      const duration = (Date.now() - startTimeRef.current) / 1000;
      sendPing(duration);
    };
  }, [pathname, activeSiteId]);

  return null;
}
