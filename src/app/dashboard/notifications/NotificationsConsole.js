"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  Mail,
  Inbox,
  AlertTriangle,
  Newspaper,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Check,
  RefreshCw,
} from "lucide-react";

export default function NotificationsConsole({
  siteId,
  initialConfig,
  initialAlerts,
}) {
  // Configuration Settings State
  const [newLeadEmail, setNewLeadEmail] = useState(
    initialConfig.newLead?.email ?? true,
  );
  const [newLeadDash, setNewLeadDash] = useState(
    initialConfig.newLead?.dashboard ?? true,
  );

  const [failedFormEmail, setFailedFormEmail] = useState(
    initialConfig.failedForm?.email ?? true,
  );
  const [failedFormDash, setFailedFormDash] = useState(
    initialConfig.failedForm?.dashboard ?? true,
  );

  const [blogEmail, setBlogEmail] = useState(
    initialConfig.blogAlert?.email ?? true,
  );
  const [blogDash, setBlogDash] = useState(
    initialConfig.blogAlert?.dashboard ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);

  // Alerts History State
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "unread" | "read"
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Save Settings Handler
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setConfigSuccess(null);
    setConfigError(null);

    const payload = {
      newLead: { email: newLeadEmail, dashboard: newLeadDash },
      failedForm: { email: failedFormEmail, dashboard: failedFormDash },
      blogAlert: { email: blogEmail, dashboard: blogDash },
    };

    try {
      const res = await fetch("/api/dashboard/notifications/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update notification settings");

      setConfigSuccess("Notification configurations saved successfully!");
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Mark specific read
  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/notifications/read?id=${id}`, {
        method: "PUT",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/dashboard/notifications/read", {
        method: "PUT",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete specific alert
  const handleDeleteAlert = async (id) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;
    try {
      const res = await fetch(`/api/dashboard/notifications?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear all alerts
  const handleClearAllAlerts = async () => {
    if (
      !confirm(
        "Are you sure you want to clear your entire system alerts history? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch("/api/dashboard/notifications", {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setAlerts([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Refresh list
  const handleRefreshHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/dashboard/notifications", {
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setAlerts((json.data?.alerts ?? json.alerts) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter and Search Alerts (unread first)
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        const matchType = filterType === "all" || a.type === filterType;
        const matchStatus =
          filterStatus === "all" ||
          (filterStatus === "unread" && !a.isRead) ||
          (filterStatus === "read" && a.isRead);

        const q = searchQuery.toLowerCase();
        const matchQuery =
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q);

        return matchType && matchStatus && matchQuery;
      })
      .sort((a, b) => {
        // Unread first, then sort by newest
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [alerts, searchQuery, filterType, filterStatus]);

  const getAlertIcon = (type) => {
    switch (type) {
      case "NEW_LEAD":
        return <Inbox size={16} className="text-blue-500" />;
      case "FAILED_FORM":
        return <AlertTriangle size={16} className="text-red-500" />;
      case "BLOG_ALERT":
        return <Newspaper size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl flex items-center gap-2">
          <Bell className="text-blue-600 dark:text-indigo-400" size={28} />
          Notifications & Alerts Center
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Configure real-time system alerts channels and manage notifications
          history logs.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Columns: Config and Switchboards */}
        <div className="xl:col-span-1 space-y-6">
          <form
            onSubmit={handleSaveConfig}
            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6"
          >
            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider border-b border-gray-150 dark:border-slate-700 pb-2.5">
              Alert Trigger Settings
            </h3>

            {configError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs rounded-lg flex gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{configError}</span>
              </div>
            )}

            {configSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400 text-xs rounded-lg flex gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{configSuccess}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Lead captures */}
              <div className="p-3.5 border border-gray-150 dark:border-slate-700 rounded-lg bg-gray-50/30 dark:bg-slate-900/20 space-y-3">
                <div className="flex gap-2 items-center">
                  <Inbox size={16} className="text-blue-500 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                    New Lead Captures
                  </span>
                </div>
                <div className="flex gap-6 text-xs text-gray-600 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLeadEmail}
                      onChange={(e) => setNewLeadEmail(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Email alerts</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLeadDash}
                      onChange={(e) => setNewLeadDash(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Dashboard Alert</span>
                  </label>
                </div>
              </div>

              {/* Form Failures */}
              <div className="p-3.5 border border-gray-150 dark:border-slate-700 rounded-lg bg-gray-50/30 dark:bg-slate-900/20 space-y-3">
                <div className="flex gap-2 items-center">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                    Form Submission Failures
                  </span>
                </div>
                <div className="flex gap-6 text-xs text-gray-600 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={failedFormEmail}
                      onChange={(e) => setFailedFormEmail(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Email alerts</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={failedFormDash}
                      onChange={(e) => setFailedFormDash(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Dashboard Alert</span>
                  </label>
                </div>
              </div>

              {/* Blog publishing */}
              <div className="p-3.5 border border-gray-150 dark:border-slate-700 rounded-lg bg-gray-50/30 dark:bg-slate-900/20 space-y-3">
                <div className="flex gap-2 items-center">
                  <Newspaper size={16} className="text-green-500" />
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                    Blog Post Publishes
                  </span>
                </div>
                <div className="flex gap-6 text-xs text-gray-600 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blogEmail}
                      onChange={(e) => setBlogEmail(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Email alerts</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blogDash}
                      onChange={(e) => setBlogDash(e.target.checked)}
                      className="rounded text-blue-600 dark:text-indigo-500 focus:ring-blue-500 border-gray-300 dark:border-slate-650 bg-white dark:bg-slate-905 w-4 h-4"
                    />
                    <span>Dashboard Alert</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex justify-center items-center gap-2 rounded-lg bg-blue-600 dark:bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 dark:hover:bg-indigo-700 disabled:opacity-50 transition w-full"
            >
              <Save size={14} />
              {saving ? "Saving Config..." : "Save Preferences"}
            </button>
          </form>
        </div>

        {/* Right Columns: Notification logs */}
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            {/* Header / Actions toolbar */}
            <div className="border-b border-gray-150 dark:border-slate-700 px-6 py-4 bg-gray-50/50 dark:bg-slate-850/30 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                  In-App Alerts History
                </h3>
              </div>
              <div className="flex gap-2 items-center text-xs">
                {alerts.length > 0 && (
                  <>
                    <button
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-slate-200 font-semibold transition"
                      title="Mark all as read"
                    >
                      <Check size={13} />
                      Mark read
                    </button>
                    <button
                      onClick={handleClearAllAlerts}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-100 dark:border-red-950/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold transition"
                      title="Clear History Log"
                    >
                      <Trash2 size={13} />
                      Clear all
                    </button>
                  </>
                )}
                <button
                  onClick={handleRefreshHistory}
                  disabled={loadingHistory}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-slate-200 font-semibold transition disabled:opacity-50"
                  title="Refresh Log Feed"
                >
                  <RefreshCw
                    size={13}
                    className={loadingHistory ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="border-b border-gray-150 dark:border-slate-700 px-6 py-3 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-50">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alerts by title or description..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-800 dark:text-slate-200 outline-none w-full focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 items-center w-full sm:w-auto mt-2 sm:mt-0">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 sm:flex-none min-w-0 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">All alert types</option>
                  <option value="NEW_LEAD">New Leads</option>
                  <option value="FAILED_FORM">Failed Forms</option>
                  <option value="BLOG_ALERT">Blog Publishes</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 sm:flex-none min-w-0 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">All read statuses</option>
                  <option value="unread">Unread alerts</option>
                  <option value="read">Read alerts</option>
                </select>
              </div>
            </div>

            {/* Alerts list */}
            <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-125 overflow-y-auto">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 transition hover:bg-gray-50/50 dark:hover:bg-slate-700/50 flex gap-4 items-start ${
                    alert.isRead ? "bg-white dark:bg-slate-800" : "bg-blue-50/20 dark:bg-blue-950/10"
                  }`}
                >
                  <div className="mt-1 shrink-0 p-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 text-xs">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                        {alert.title}
                      </span>
                      {!alert.isRead && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-100 dark:border-blue-900/40">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-slate-350 leading-relaxed font-medium">
                      {alert.message}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block pt-1">
                      {new Date(alert.createdAt).toLocaleString("en-US")}
                    </span>
                  </div>

                  <div className="shrink-0 flex gap-1 items-center self-center">
                    {!alert.isRead && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        className="p-1.5 text-blue-500 dark:text-indigo-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        title="Mark Alert Read"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-55 dark:hover:bg-red-950/30 rounded-lg transition"
                      title="Delete Alert"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredAlerts.length === 0 && (
                <div className="py-20 text-center text-gray-400 dark:text-slate-500 italic text-xs">
                  {alerts.length === 0
                    ? "No system alerts history recorded."
                    : "No alerts match your filter criteria."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

