"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  LayoutDashboard,
  FileText,
  Newspaper,
  Briefcase,
  ImageIcon,
  HelpCircle,
  Users,
  ShieldCheck,
  Settings,
  Megaphone,
  BarChart2,
  Mail,
  Phone,
  Scale,
  ArrowLeftRight,
  Bell,
  Database,
  Activity,
  Terminal,
  Layers,
  Inbox,
  Utensils,
  Quote,
  Package,
  Calendar,
  Fingerprint,
  UsersRound,
  X,
} from "lucide-react";

import { buildCommandPaletteItems } from "@/lib/dashboardNav";

export default function CommandPalette({ isOpen, onClose, workspace = "global-backend", userRole = "VIEWER" }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const router = useRouter();

  const isCrmWorkspace = workspace === "marketing-crm" || workspace === "crm";

  // Build items array prioritizing active workspace and adding workspace switch command
  const switchItem = isCrmWorkspace
    ? { name: "Switch to Global Backend", href: "/dashboard/dashboard", group: "Workspace Navigation", icon: ArrowRight }
    : { name: "Switch to Marketing CRM", href: "/crm", group: "Workspace Navigation", icon: ArrowRight };

  const allSearchItems = buildCommandPaletteItems(userRole);

  const workspaceItems = allSearchItems.filter((item) => {
    const isCrmRoute = item.href.startsWith("/crm");
    return isCrmWorkspace ? isCrmRoute : !isCrmRoute;
  });

  const otherItems = allSearchItems.filter((item) => {
    const isCrmRoute = item.href.startsWith("/crm");
    return isCrmWorkspace ? !isCrmRoute : isCrmRoute;
  });

  const activeItems = [...workspaceItems, switchItem, ...otherItems];

  const filtered = query.trim()
    ? activeItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : activeItems.slice(0, 14);

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Focus input when opened & restore previous focus when closed
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      const timer = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(timer);
    } else if (previousActiveElementRef.current) {
      if (typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Keep selected item in view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const navigate = useCallback(
    (href) => {
      router.push(href);
      handleClose();
    },
    [router, handleClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        navigate(filtered[selectedIndex].href);
      }
    },
    [filtered, selectedIndex, navigate, handleClose]
  );

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="admin-command-palette-panel relative w-full max-w-[560px] mx-4 rounded-[var(--admin-radius-card,10px)] overflow-hidden bg-white dark:bg-slate-900 border border-[var(--admin-border,#e2e8f0)] dark:border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Row */}
        <div className="admin-command-palette-search flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-[var(--admin-border,#e2e8f0)] dark:border-slate-700">
          <Search size={16} className="text-[var(--admin-text-muted,#64748b)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={isCrmWorkspace ? "Search Marketing CRM…" : "Search Global Backend…"}
            className="admin-command-palette-input flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-[var(--admin-text-muted,#64748b)]"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close command palette"
            title="Close command palette (Esc)"
            className="admin-command-palette-close flex items-center justify-center shrink-0 w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto bg-white dark:bg-slate-900"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--admin-text-muted,#64748b)]">
              No results for <span className="font-medium text-slate-700 dark:text-slate-300">&ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.href + item.name}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-[var(--admin-accent-soft,rgba(15,124,133,0.1))] text-[var(--admin-accent,#0f7c85)] dark:bg-[var(--admin-accent-soft,rgba(15,124,133,0.15)]"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon size={14} className="shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="text-[11px] text-[var(--admin-text-muted,#64748b)] shrink-0">
                    {item.group}
                  </span>
                  {isSelected && <ArrowRight size={13} className="shrink-0 opacity-60" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-[var(--admin-border,#e2e8f0)] dark:border-slate-700 flex items-center gap-4 text-[10px] text-[var(--admin-text-muted,#64748b)]">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
