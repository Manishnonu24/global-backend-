"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect, useSyncExternalStore } from "react";

import {
  LayoutDashboard,
  ImageIcon,
  FileText,
  FileCode2,
  Newspaper,
  Briefcase,
  Settings,
  Users,
  Inbox,
  Quote,
  HelpCircle,
  UsersRound,
  Database,
  ArrowLeftRight,
  PanelBottom,
  Layers,
  PanelTop,
  ShieldCheck,
  Phone,
  Megaphone,
  BarChart2,
  Scale,
  Menu,
  Mail,
  Activity,
  Bell,
  Fingerprint,
  Terminal,
  ChevronDown,
  ChevronRight,
  Package,
  Utensils,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;

import { hasRole } from "@/lib/rbac";
import { CMS_SECTIONS, CRM_SECTIONS, CMS_ADVANCED_LINKS } from "@/lib/dashboardNav";

function SidebarLink({ href, label, icon: Icon, pathname, compact }) {
  const isActive =
    pathname === href ||
    (href !== "/dashboard/dashboard" && href !== "/crm" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={compact ? label : undefined}
      className={`admin-nav-link ${isActive ? "is-active" : ""} ${compact ? "justify-center !px-2" : ""}`}
    >
      <Icon size={14} className="shrink-0" />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const mounted = useIsMounted();

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [compact, setCompact] = useState(() => {
    if (typeof window !== "undefined") {
      try { return localStorage.getItem("ahp_sidebar_compact") === "true"; }
      catch (_) {}
    }
    return false;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ahp_sidebar_width");
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return 240;
  });

  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);

    const onMouseMove = (moveEvent) => {
      const mouseX = moveEvent.clientX;

      // Snap to collapsed compact mode if dragging left below threshold (140px)
      if (mouseX < 140) {
        setCompact(true);
        try { localStorage.setItem("ahp_sidebar_compact", "true"); } catch (_) {}
        return;
      }

      // Expand out of compact mode if dragging right above 150px
      setCompact((prevCompact) => {
        if (prevCompact) {
          try { localStorage.setItem("ahp_sidebar_compact", "false"); } catch (_) {}
        }
        return false;
      });

      const newWidth = Math.min(
        Math.max(mouseX, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      );
      setSidebarWidth(newWidth);
      if (typeof window !== "undefined") {
        document.documentElement.style.setProperty("--admin-sidebar-width", `${newWidth}px`);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setSidebarWidth((finalWidth) => {
        try { localStorage.setItem("ahp_sidebar_width", String(finalWidth)); } catch (_) {}
        return finalWidth;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--admin-sidebar-width", `${sidebarWidth}px`);
    }
  }, [sidebarWidth]);
  const [collapsedSections, setCollapsedSections] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ahp_sidebar_collapsed");
        return saved ? JSON.parse(saved) : {};
      } catch (_) {}
    }
    return {};
  });

  const toggleCompact = useCallback(() => {
    setCompact((prev) => {
      const next = !prev;
      try { localStorage.setItem("ahp_sidebar_compact", String(next)); } catch (_) {}
      return next;
    });
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("ahp_sidebar_collapsed", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  if (!mounted) {
    return (
      <aside
        className="admin-sidebar hidden md:flex"
        style={{ width: "var(--admin-sidebar-width, 240px)" }}
      />
    );
  }

  const userRole = session?.user?.globalRole || "VIEWER";
  const isCrmMode = pathname.startsWith("/crm");
  const activeSections = isCrmMode ? CRM_SECTIONS : CMS_SECTIONS;

  // Color map for different admin roles
  const roleColors = {
    SUPERADMIN: { bg: "rgba(239,68,68,0.12)", color: "#dc2626", border: "rgba(239,68,68,0.25)" },
    ADMIN:      { bg: "rgba(249,115,22,0.12)", color: "#ea580c", border: "rgba(249,115,22,0.25)" },
    EDITOR:     { bg: "rgba(15,124,133,0.12)", color: "#0f7c85", border: "rgba(15,124,133,0.25)" },
    AUTHOR:     { bg: "rgba(139,92,246,0.12)", color: "#7c3aed", border: "rgba(139,92,246,0.25)" },
    MARKETING:  { bg: "rgba(236,72,153,0.12)", color: "#db2777", border: "rgba(236,72,153,0.25)" },
    VIEWER:     { bg: "rgba(100,116,139,0.12)", color: "#64748b", border: "rgba(100,116,139,0.25)" },
    VISITOR:    { bg: "rgba(100,116,139,0.12)", color: "#64748b", border: "rgba(100,116,139,0.25)" },
  };
  const roleColor = roleColors[userRole] || roleColors["VIEWER"];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`admin-sidebar relative transition-all duration-300 ease-in-out ${compact ? "is-compact" : ""} ${isOpen ? "is-open" : ""}`}
        style={compact ? { width: "var(--admin-sidebar-rail, 64px)", minWidth: "var(--admin-sidebar-rail, 64px)" } : { width: `${Math.max(200, sidebarWidth)}px`, minWidth: `${Math.max(200, sidebarWidth)}px` }}
        aria-label="Sidebar navigation"
      >
        {/* ── Brand Header ───────────────────────────────────── */}
        <div
          className={`flex items-center border-b px-4 py-3.5 flex-shrink-0 ${
            compact ? "justify-center" : "justify-between gap-2"
          }`}
          style={{ borderColor: "var(--admin-sidebar-border, #e2e8f0)" }}
        >
          {!compact ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Icon badge */}
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                  style={{
                    background: "var(--admin-sidebar-accent, #0f7c85)",
                    color: "#fff",
                  }}
                >
                  {isCrmMode ? <Megaphone size={13} /> : <FileCode2 size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-bold truncate leading-tight"
                    style={{ color: "var(--admin-sidebar-title, var(--admin-text, #0f172a))" }}
                  >
                    {isCrmMode ? "Marketing CRM" : "Global Backend"}
                  </p>
                  <p
                    className="text-[11px] font-medium truncate leading-tight mt-0.5"
                    style={{ color: "var(--admin-sidebar-muted, #64748b)" }}
                  >
                    {isCrmMode ? "Customer relations" : "CMS Workspace"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: "var(--admin-sidebar-accent, #0f7c85)",
                color: "#fff",
              }}
            >
              {isCrmMode ? <Megaphone size={14} /> : <FileCode2 size={14} />}
            </span>
          )}
        </div>

        {/* ── Nav ─────────────────────────────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto px-2 py-3"
          style={{ scrollbarWidth: "none" }}
          aria-label="Primary navigation"
        >
          <div className="space-y-3">
            {activeSections.map((section) => {
              const visibleLinks = section.links.filter((link) => hasRole(userRole, link.minRole));
              if (!visibleLinks.length) return null;
              const isCollapsed = collapsedSections[section.key];

              return (
                <div key={section.key}>
                  {!compact && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="admin-nav-section-label w-full"
                    >
                      <span>{section.title}</span>
                      {isCollapsed
                        ? <ChevronRight size={10} className="shrink-0 opacity-60" />
                        : <ChevronDown size={10} className="shrink-0 opacity-60" />
                      }
                    </button>
                  )}

                  {(!isCollapsed || compact) && (
                    <div className="space-y-0.5 mt-0.5">
                      {visibleLinks.map((link) => (
                        <SidebarLink
                          key={link.label}
                          {...link}
                          pathname={pathname}
                          compact={compact}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Advanced section — CMS mode, ADMIN+ only */}
            {!isCrmMode && hasRole(userRole, "ADMIN") && (
              <div>
                {!compact && (
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="admin-nav-section-label w-full"
                  >
                    <span>Advanced</span>
                    {advancedOpen
                      ? <ChevronDown size={10} className="shrink-0 opacity-60" />
                      : <ChevronRight size={10} className="shrink-0 opacity-60" />
                    }
                  </button>
                )}
                {(advancedOpen || compact) && (
                  <div className="space-y-0.5 mt-0.5">
                    {CMS_ADVANCED_LINKS.map((link) => (
                      <SidebarLink
                        key={link.label}
                        {...link}
                        pathname={pathname}
                        compact={compact}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div
          className={`flex items-center gap-2 px-2.5 py-2.5 border-t flex-shrink-0 ${
            compact ? "justify-center" : "justify-between"
          }`}
          style={{
            borderColor: "var(--admin-sidebar-border, #e2e8f0)",
            background: "var(--admin-sidebar-footer-bg, var(--admin-surface-muted, #f8fafc))",
          }}
        >
          {!compact && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap
                size={12}
                style={{ color: roleColor.color, flexShrink: 0 }}
              />
              <span
                className="text-[10px] font-bold truncate uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                style={{
                  background: roleColor.bg,
                  color: roleColor.color,
                  borderColor: roleColor.border,
                }}
              >
                {userRole}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCompact}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="admin-nav-link shrink-0 !p-1.5"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact
              ? <PanelLeftOpen size={14} />
              : <PanelLeftClose size={14} />
            }
          </button>
        </div>

        {/* ── Integrated Mouse Resizer Handle & Collapse/Expand Button ── */}
        <div
          onMouseDown={startResizing}
          title={compact ? "Drag right to expand or click button" : "Drag to resize sidebar width"}
          className={`hidden md:block absolute top-0 right-0 bottom-0 w-3 cursor-col-resize hover:bg-[var(--admin-sidebar-accent,#0f7c85)]/30 transition-colors z-30 group ${
            isResizing ? "bg-[var(--admin-sidebar-accent,#0f7c85)]/50" : ""
          }`}
          style={{ transform: "translateX(50%)" }}
        >
          {/* Vertical drag indicator */}
          <div className="w-1 h-12 bg-slate-300 dark:bg-slate-600 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:bg-[var(--admin-sidebar-accent,#0f7c85)] transition-colors opacity-70" />

          {/* Embedded Collapse / Expand Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompact();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 hover:text-[var(--admin-sidebar-accent,#0f7c85)] hover:border-[var(--admin-sidebar-accent,#0f7c85)] transition-all flex items-center justify-center cursor-pointer z-40"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          </button>
        </div>
      </aside>
    </>
  );
}
