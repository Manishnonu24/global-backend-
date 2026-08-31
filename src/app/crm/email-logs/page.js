"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  Send,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Server,
  Zap,
} from "lucide-react";

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    delivered: 0,
    failed: 0,
    transactional: 0,
    campaign: 0,
    system: 0,
    deliveryRate: 100,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 25,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  const fetchEmailLogs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        page: String(pageNum),
        perPage: "25",
      });
      if (searchQuery.trim()) searchParams.set("q", searchQuery.trim());
      if (statusFilter && statusFilter !== "all") searchParams.set("status", statusFilter);
      if (categoryFilter && categoryFilter !== "all") searchParams.set("category", categoryFilter);

      const res = await fetch(`/api/crm/email-logs?${searchParams.toString()}`, {
        headers: { "x-site-id": siteId },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data.logs || []);
          setStats(json.data.stats || {});
          setPagination(json.data.pagination || { page: 1, perPage: 25, totalCount: 0, totalPages: 1 });
        }
      }
    } catch (err) {
      console.error("Failed to fetch email logs:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId, searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    if (siteId) {
      const delayDebounce = setTimeout(() => {
        fetchEmailLogs(1);
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [siteId, fetchEmailLogs]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchEmailLogs(newPage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "sent":
      case "opened":
      case "clicked":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Sent
          </span>
        );
      case "sending":
      case "queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse">
            <Clock size={12} /> {status === "queued" ? "Queued" : "Sending"}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            <AlertCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case "transactional":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Zap size={11} /> Transactional
          </span>
        );
      case "campaign":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Layers size={11} /> Campaign
          </span>
        );
      case "system":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Shield size={11} /> System
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {category || "Email"}
          </span>
        );
    }
  };

  const getProviderBadge = (provider) => {
    if (!provider) return null;
    const formatted = provider.toUpperCase();
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Server size={10} /> {formatted}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl flex items-center gap-2">
            <Mail className="text-indigo-600 dark:text-emerald-400" size={28} />
            Email Logs & Audit History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track real-time transactional, campaign, and system email dispatches with diagnostic tracebacks.
          </p>
        </div>

        <button
          onClick={() => fetchEmailLogs(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          Refresh Logs
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.totalSent || 0}</h3>
            <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 size={11} /> {stats.deliveryRate || 100}% Delivered
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Send size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transactional</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.transactional || 0}</h3>
            <p className="text-[10.5px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
              OTP, resets & leads
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Zap size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Campaigns</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.campaign || 0}</h3>
            <p className="text-[10.5px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
              Newsletters & blasts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed Emails</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.failed || 0}</h3>
            <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">
              {stats.failed > 0 ? "Requires review" : "Clean pipeline"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient email, subject, or trigger..."
              className="w-full text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={13} /> Category:
            </span>
            {[
              { id: "all", label: "All" },
              { id: "transactional", label: "Transactional" },
              { id: "campaign", label: "Campaign" },
              { id: "system", label: "System" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === tab.id
                    ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 mr-1">Status:</span>
            {[
              { id: "all", label: "All" },
              { id: "sent", label: "Sent" },
              { id: "failed", label: "Failed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Email Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Recipient (To)</th>
                <th className="py-3.5 px-5">Event / Subject</th>
                <th className="py-3.5 px-5">Provider</th>
                <th className="py-3.5 px-5">Sent Date</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading email audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center text-center w-full">
                      <Mail className="text-slate-300 dark:text-slate-700 mb-2" size={32} />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-center">No email logs found</p>
                      <p className="text-xs text-slate-400 mt-1 text-center">
                        {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                          ? "Try resetting your search or category filters"
                          : "Every outgoing email from auth, leads, campaigns, and system events will appear here automatically."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                      <div>{log.recipientEmail}</div>
                      {log.recipientName && (
                        <span className="text-[10.5px] font-normal text-slate-400">{log.recipientName}</span>
                      )}
                    </td>
                    <td className="py-4 px-5 max-w-xs truncate">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{log.subject}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-emerald-400 font-medium truncate">
                        {log.campaignName}
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getProviderBadge(log.provider)}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDate(log.sentAt || log.createdAt)}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-semibold transition-colors cursor-pointer text-[11px]"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800 dark:text-slate-200">{pagination.page}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.totalCount} total logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Details Modal / Slideover */}
      {selectedLog && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-emerald-400">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    Email Dispatch Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Log ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Recipient (To)</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">{selectedLog.recipientEmail}</span>
                  {selectedLog.recipientName && (
                    <span className="text-slate-500 block">{selectedLog.recipientName}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Delivery Status</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    {getStatusBadge(selectedLog.status)}
                    {getCategoryBadge(selectedLog.category)}
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Subject Line</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{selectedLog.subject}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Trigger / Event</span>
                  <span className="font-semibold text-indigo-600 dark:text-emerald-400">{selectedLog.campaignName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Provider & Sender</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getProviderBadge(selectedLog.provider)}
                    <span className="text-slate-500 font-mono text-[11px]">{selectedLog.fromEmail || "Default sender"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Dispatched At</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{formatDate(selectedLog.sentAt || selectedLog.createdAt)}</span>
                </div>
              </div>

              {/* Error Message Traceback (if failed) */}
              {selectedLog.errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1">
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                    <AlertCircle size={14} /> Diagnostic Error Traceback:
                  </span>
                  <pre className="font-mono text-[11px] text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}

              {/* Rendered Email Body HTML Preview */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Dispatched Email Content Preview
                </h4>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white p-4 max-h-[240px] overflow-y-auto">
                  {selectedLog.fullBodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 text-xs font-sans"
                      dangerouslySetInnerHTML={{ __html: selectedLog.fullBodyHtml }}
                    />
                  ) : selectedLog.bodyPreview ? (
                    <p className="text-slate-700 text-xs">{selectedLog.bodyPreview}</p>
                  ) : (
                    <p className="text-slate-400 italic">No content preview available for this log.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
