"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function DashboardLayout({ children, siteId, sites = [] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mounted = useIsMounted();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoginPage = pathname.includes("/dashboard/login");
  const topbarWorkspace = pathname.startsWith("/crm")
    ? "marketing-crm"
    : "global-backend";
  const workspace = pathname.startsWith("/crm") ? "crm" : "cms";

  useEffect(() => {
    if (siteId && typeof window !== "undefined") {
      localStorage.setItem("x-site-id", siteId);
    }
  }, [siteId]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg,#f1f5f9)] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 rounded-full border-[3px] border-[var(--color-accent)] border-t-transparent"
            style={{ animation: "admin-spin 0.7s linear infinite" }}
          />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dashboard-layout"
      data-workspace={workspace}
    >
      <Sidebar
        siteId={siteId}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main column: topbar + scrollable content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          workspace={topbarWorkspace}
          siteId={siteId}
          sites={sites}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 xl:p-8 pb-12 bg-[var(--admin-bg,#f1f5f9)] dark:bg-slate-950 text-[var(--admin-text,#0f172a)] dark:text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
