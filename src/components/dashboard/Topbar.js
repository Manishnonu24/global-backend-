"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Inbox,
  AlertTriangle,
  Newspaper,
  User,
  Settings,
  ShieldCheck,
  Users,
  Command,
  ExternalLink,
  Megaphone,
  Mail,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import CommandPalette from "@/components/dashboard/CommandPalette";
import Badge from "@/components/dashboard/ui/Badge";
import { TOPBAR_WORKSPACE_CONFIG } from "@/lib/dashboardNav";
import { hasRole } from "@/lib/rbac";

export default function Topbar({ workspace = "global-backend", siteId, sites = [], onMenuClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeConfig = TOPBAR_WORKSPACE_CONFIG[workspace] || TOPBAR_WORKSPACE_CONFIG["global-backend"];

  const userEmail = session?.user?.email ?? "Admin";
  const userRole = session?.user?.globalRole ?? "—";

  // Derive clean human name (e.g., "Super Admin" or "Admin" instead of raw email address)
  const rawName = session?.user?.name?.trim();
  const emailPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail;
  const capitalizedEmailName = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : "Admin";
  const displayName = rawName && rawName.length > 0 ? rawName : capitalizedEmailName;

  const initials = displayName
    .split(/[\s._-]/)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "A";

  const fetchAlerts = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch("/api/dashboard/notifications", {
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data?.alerts ?? (json.alerts || []));
        setUnreadCount(json.data?.unreadCount ?? (json.unreadCount || 0));
      }
    } catch (e) {
      console.error("Failed to load alerts in Topbar:", e);
    }
  }, [siteId]);

  useEffect(() => {
    let active = true;
    if (session && siteId) {
      fetch("/api/dashboard/notifications", {
        headers: { "x-site-id": siteId },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json && active) {
            setAlerts(json.data?.alerts ?? (json.alerts || []));
            setUnreadCount(json.data?.unreadCount ?? (json.unreadCount || 0));
          }
        })
        .catch(console.error);

      const timer = setInterval(() => {
        fetch("/api/dashboard/notifications", {
          headers: { "x-site-id": siteId },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json && active) {
              setAlerts(json.data?.alerts ?? (json.alerts || []));
              setUnreadCount(json.data?.unreadCount ?? (json.unreadCount || 0));
            }
          })
          .catch(console.error);
      }, 60000);

      return () => {
        active = false;
        clearInterval(timer);
      };
    }
  }, [session, siteId]);

  // Workspace relevant filtering for display without dropping unmatched alerts
  const workspaceAlerts = alerts.filter((alert) => {
    if (workspace === "marketing-crm") {
      return alert.type === "NEW_LEAD" || alert.type === "CRM_ALERT" || alert.type === "FORM_SUBMISSION";
    } else {
      return alert.type === "FAILED_FORM" || alert.type === "BLOG_ALERT" || alert.type === "SYSTEM_ALERT" || alert.type === "CMS_ALERT";
    }
  });

  const displayAlerts = workspaceAlerts.length > 0 ? workspaceAlerts : alerts;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target))
        setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌘K / Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await signOut({ callbackUrl: `${window.location.origin}/dashboard/login` });
  }

  const handleMarkAllRead = async () => {
    if (!siteId) return;
    try {
      const res = await fetch("/api/dashboard/notifications/read", {
        method: "PUT",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) { console.error(e); }
  };

  const handleClearAll = async () => {
    if (!siteId) return;
    try {
      const res = await fetch("/api/dashboard/notifications", {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) { setAlerts([]); setUnreadCount(0); }
    } catch (e) { console.error(e); }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "NEW_LEAD":    return <Inbox size={14} className="text-blue-500" />;
      case "FAILED_FORM": return <AlertTriangle size={14} className="text-red-500" />;
      case "BLOG_ALERT":  return <Newspaper size={14} style={{ color: "var(--admin-success, #16a34a)" }} />;
      default:            return <Bell size={14} style={{ color: "var(--admin-text-muted, #64748b)" }} />;
    }
  };

  return (
    <>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} workspace={workspace} userRole={userRole} />

      {/* ── Topbar shell ────────────────────────────────────────────── */}
      <header className="admin-topbar flex-shrink-0" data-topbar-workspace={workspace}>

        {/* Left cluster */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={onMenuClick}
            className="admin-btn-icon md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {/* Workspace identity pill */}
          <div className="flex items-center gap-2">
            <span
              id="topbar-workspace-name"
              className="px-2.5 py-1 rounded-md text-xs font-bold tracking-tight select-none"
              style={{
                background: "var(--admin-accent-soft, rgba(15,124,133,0.12))",
                color: "var(--admin-accent, #0f7c85)",
                border: "1px solid var(--admin-border, #e2e8f0)",
              }}
            >
              {activeConfig.name}
            </span>
          </div>

          {/* Site switcher — only when multiple sites */}
          {sites.length > 1 && (
            <div className="relative ml-1 sm:ml-2">
              <select
                value={siteId || ""}
                onChange={async (e) => {
                  const newSiteId = e.target.value;
                  if (!newSiteId || newSiteId === siteId) return;
                  try {
                    const res = await fetch("/api/dashboard/switch-site", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ siteId: newSiteId }),
                    });
                    if (res.ok) {
                      window.location.reload();
                    } else {
                      const err = await res.json();
                      toast.error(err.error || "Failed to switch site");
                    }
                  } catch (err) { console.error(err); }
                }}
                className="admin-input !min-h-0 !py-1 !px-2.5 !text-xs max-w-[160px] sm:max-w-xs cursor-pointer font-semibold"
                style={{ height: "32px" }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>🌐 {s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

          {/* ⌘K Search pill — desktop */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium mr-1"
            style={{
              background: "var(--admin-bg-elevated, #e8edf4)",
              color: "var(--admin-text-muted, #64748b)",
              border: "1px solid var(--admin-border, #e2e8f0)",
              transition: "all 120ms",
            }}
            aria-label="Open command palette"
          >
            <Search size={12} />
            <span>{activeConfig.searchPlaceholder}</span>
            <kbd
              className="inline-flex items-center gap-px px-1.5 py-0.5 text-[9px] font-bold rounded"
              style={{
                background: "var(--admin-surface, #fff)",
                border: "1px solid var(--admin-border-strong, #cbd5e1)",
                color: "var(--admin-text-xmuted, #94a3b8)",
              }}
            >
              <Command size={8} />K
            </kbd>
          </button>

          {/* Search icon — mobile */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="admin-btn-icon md:hidden"
            aria-label="Open command palette"
          >
            <Search size={16} />
          </button>

          {/* Notifications */}
          <div className="relative flex items-center" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) fetchAlerts();
              }}
              className="admin-btn-icon relative"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[15px] h-[15px] px-0.5 text-[9px] font-bold leading-none text-white rounded-full"
                  style={{ background: "var(--admin-accent, #0f7c85)" }}
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notificationsOpen && (
              <div
                className="absolute -right-16 sm:right-0 w-[280px] sm:w-80 overflow-hidden z-50 text-xs"
                style={{
                  top: "calc(100% + 8px)",
                  background: "var(--admin-surface, #fff)",
                  border: "1px solid var(--admin-border, #e2e8f0)",
                  borderRadius: "var(--admin-radius-card, 10px)",
                  boxShadow: "var(--admin-shadow-dropdown)",
                  animation: "admin-dropdown-enter 120ms var(--admin-ease, cubic-bezier(0.16,1,0.3,1)) forwards",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: "var(--admin-surface-muted, #f8fafc)",
                    borderBottom: "1px solid var(--admin-border, #e2e8f0)",
                  }}
                >
                  <span className="font-semibold text-xs" style={{ color: "var(--admin-text, #0f172a)" }}>
                    Notifications{" "}
                    {unreadCount > 0 && (
                      <span style={{ color: "var(--admin-accent, #0f7c85)" }}>
                        ({unreadCount} new)
                      </span>
                    )}
                  </span>
                  {alerts.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold cursor-pointer bg-transparent border-0 hover:underline"
                        style={{ color: "var(--admin-accent, #0f7c85)" }}
                      >
                        Mark all read
                      </button>
                      <span style={{ color: "var(--admin-border-strong, #cbd5e1)" }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[10px] font-bold text-red-500 cursor-pointer bg-transparent border-0 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                {/* List */}
                <div
                  className="max-h-60 overflow-y-auto divide-y"
                  style={{ borderColor: "var(--admin-border, #e2e8f0)" }}
                >
                  {displayAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 transition-colors"
                      style={{
                        background: alert.isRead
                          ? "var(--admin-surface, #fff)"
                          : "var(--admin-accent-soft, rgba(15,124,133,0.05))",
                      }}
                    >
                      <div className="flex gap-2.5 items-start">
                        <div className="mt-0.5 shrink-0">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-semibold text-xs leading-tight" style={{ color: "var(--admin-text, #0f172a)" }}>
                              {alert.title}
                            </span>
                            {!alert.isRead && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                                style={{ background: "var(--admin-accent, #0f7c85)" }}
                              />
                            )}
                          </div>
                          <p className="text-[11px] leading-normal" style={{ color: "var(--admin-text-muted, #64748b)" }}>
                            {alert.message}
                          </p>
                          <span className="text-[10px] block mt-0.5" style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}>
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {displayAlerts.length === 0 && (
                    <div className="p-8 text-center" style={{ color: "var(--admin-text-muted, #64748b)" }}>
                      <Bell size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium">No recent system alerts</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <Link
                  href={workspace === "marketing-crm" ? "/crm/notifications" : "/dashboard/notifications"}
                  onClick={() => setNotificationsOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    borderTop: "1px solid var(--admin-border, #e2e8f0)",
                    background: "var(--admin-surface-muted, #f8fafc)",
                    color: "var(--admin-text-muted, #64748b)",
                  }}
                >
                  Manage alerts & settings <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Vertical divider */}
          <div
            className="hidden sm:block h-5 w-px mx-1"
            style={{ background: "var(--admin-border-strong, #cbd5e1)" }}
            aria-hidden="true"
          />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              id="user-menu-btn"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 h-9 px-2 rounded-lg transition-colors"
              style={{
                border: "1px solid var(--admin-border, #e2e8f0)",
                color: "var(--admin-text-secondary, #334155)",
              }}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {/* Avatar circle */}
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold select-none flex-shrink-0"
                style={{
                  background: "var(--admin-accent-soft, rgba(15,124,133,0.12))",
                  color: "var(--admin-accent, #0f7c85)",
                }}
              >
                {initials || "U"}
              </span>

              {/* Email + role — large screens */}
              <div className="hidden lg:flex flex-col justify-center text-left py-0.5 min-w-0">
                <span className="text-xs font-semibold leading-snug truncate max-w-[140px] block" style={{ color: "var(--admin-text, #0f172a)" }}>
                  {displayName}
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase block leading-snug" style={{ color: "var(--admin-text-muted, #64748b)" }}>
                  {userRole}
                </span>
              </div>

              <ChevronDown
                size={12}
                className={`hidden lg:block transition-transform duration-[120ms] ${menuOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}
              />
            </button>

            {/* User dropdown */}
            {menuOpen && (
              <div
                className="absolute right-0 w-56 overflow-hidden z-[100]"
                style={{
                  top: "calc(100% + 8px)",
                  background: "var(--admin-surface, #fff)",
                  border: "1px solid var(--admin-border, #e2e8f0)",
                  borderRadius: "var(--admin-radius-card, 10px)",
                  boxShadow: "var(--admin-shadow-dropdown)",
                  animation: "admin-dropdown-enter 120ms var(--admin-ease, cubic-bezier(0.16,1,0.3,1)) forwards",
                }}
              >
                {/* Identity header */}
                <div
                  className="px-4 py-3"
                  style={{
                    background: "var(--admin-surface-muted, #f8fafc)",
                    borderBottom: "1px solid var(--admin-border, #e2e8f0)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}
                  >
                    Signed in as
                  </p>
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--admin-text, #0f172a)" }}
                  >
                    {displayName}
                  </p>
                  {userEmail && (
                    <p
                      className="text-[10px] text-slate-500 truncate mt-0.5 font-mono"
                    >
                      {userEmail}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <Badge status={userRole} />
                  </div>
                </div>

                {/* Destinations */}
                <div
                  className="py-1"
                  style={{ borderBottom: "1px solid var(--admin-border, #e2e8f0)" }}
                >
                  <div
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}
                  >
                    <User size={11} /> {activeConfig.destinationsLabel}
                  </div>

                  {activeConfig.destinations.filter((dest) => hasRole(userRole, dest.minRole)).map((dest) => {
                    const DestIcon = dest.icon;
                    return (
                      <Link
                        key={dest.href}
                        href={dest.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors rounded-md mx-1 hover:bg-[var(--admin-bg-elevated,rgba(0,0,0,0.04))]"
                        style={{ color: "var(--admin-text-secondary, #334155)" }}
                      >
                        <DestIcon size={14} className="shrink-0 opacity-70" />
                        <span>{dest.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Sign out */}
                <div className="p-1">
                  <button
                    id="logout-btn"
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer transition-colors bg-transparent border-0"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
