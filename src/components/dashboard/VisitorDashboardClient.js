"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  Eye,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Activity,
  MapPin,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDeviceIcon(deviceInfo) {
  if (!deviceInfo) return <Monitor size={14} />;
  const d = deviceInfo.toLowerCase();
  if (d.includes("mobile") || d.includes("android") || d.includes("iphone"))
    return <Smartphone size={14} />;
  if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={14} />;
  return <Monitor size={14} />;
}

function getSourceColor(source) {
  const s = (source || "").toLowerCase();
  if (s.includes("google")) return "bg-blue-100 text-blue-700";
  if (s.includes("facebook") || s.includes("meta"))
    return "bg-indigo-100 text-indigo-700";
  if (s.includes("twitter") || s.includes("x.com"))
    return "bg-sky-100 text-sky-700";
  if (s.includes("linkedin")) return "bg-blue-200 text-blue-800";
  if (s.includes("direct")) return "bg-gray-100 text-gray-700";
  if (s.includes("email")) return "bg-yellow-100 text-yellow-700";
  return "bg-purple-100 text-purple-700";
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data, valueKey, labelKey, color = "#6366f1" }) {
  if (!data || data.length === 0)
    return <p className="text-xs text-gray-400 italic py-4">No data yet.</p>;
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span
            className="truncate text-xs text-gray-600 font-medium shrink-0"
            style={{ width: "120px" }}
            title={item[labelKey]}
          >
            {item[labelKey]}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">
            {item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline (SVG time-series) ──────────────────────────────────────────────

function Sparkline({ data, width = 200, height = 50 }) {
  if (!data || data.length < 2)
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-xs text-gray-300"
      >
        No data
      </div>
    );

  const values = data.map((d) => d.pageViews);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const [x, y] = pts[i].split(",");
        return (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#6366f1" opacity="0.7" />
        );
      })}
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, pulse }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start gap-3 sm:gap-4 transition hover:shadow-md`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5 flex items-center gap-2">
          {value}
          {pulse && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          )}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── LOGS TABLE ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function LogsTable({ logs }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = logs.filter(
    (l) =>
      l.pageViewed?.toLowerCase().includes(search.toLowerCase()) ||
      l.visitorId?.toLowerCase().includes(search.toLowerCase()) ||
      (l.ipAddress || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.location || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.deviceInfo || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.trafficSource || "").toLowerCase().includes(search.toLowerCase()),
  );

  const total = Math.ceil(filtered.length / PAGE_SIZE);
  const slice = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-gray-50">
        <Search size={14} className="text-gray-400" />
        <input
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
          placeholder="Filter by page, visitor ID, IP, location, device…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          id="visitor-log-search"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500 font-semibold uppercase tracking-wider">
              <th className="px-4 py-3">Visitor ID</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-gray-400 italic"
                >
                  No visitor logs found.
                </td>
              </tr>
            ) : (
              slice.map((log) => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 hover:bg-indigo-50/40 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-gray-500 truncate max-w-[110px]">
                    {log.visitorId?.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-500">
                    {log.ipAddress || "Unknown"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                      <ExternalLink size={10} />
                      {log.pageViewed}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 flex items-center gap-1 text-gray-600">
                    <MapPin size={11} className="text-gray-400" />
                    {log.location || "Unknown"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      {getDeviceIcon(log.deviceInfo)}
                      {log.deviceInfo || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getSourceColor(
                        log.trafficSource,
                      )}`}
                    >
                      {log.trafficSource || "Direct"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {formatDuration(log.duration)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {timeAgo(log.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            {filtered.length} results · Page {page + 1} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= total - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIVE VISITORS FEED ───────────────────────────────────────────────────────

function LiveFeed({ liveVisitors }) {
  if (!liveVisitors || liveVisitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
        <WifiOff size={28} className="opacity-40" />
        <p className="text-xs italic">No active visitors right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {liveVisitors.map((v) => (
        <div
          key={v.id}
          className="flex items-center gap-3 rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50/60 dark:bg-green-950/20 px-3 py-2.5"
        >
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs text-gray-800 dark:text-green-200 truncate">
              {v.pageViewed}
            </p>
            <p className="text-xs text-gray-500 dark:text-green-400/70 flex items-center gap-1 mt-0.5">
              <MapPin size={9} />
              {v.location || "Unknown"}
              &nbsp;·&nbsp;
              {getDeviceIcon(v.deviceInfo)}
              {v.deviceInfo || "Unknown"}
              &nbsp;·&nbsp;
              {v.trafficSource || "Direct"}
            </p>
          </div>
          <span className="text-xs text-gray-400 dark:text-green-500/80 shrink-0">
            {formatDuration(v.duration)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function VisitorDashboardClient({
  siteId,
  siteName,
  initialStats,
  initialTimeSeries,
  initialLiveCount,
  initialLogs,
}) {
  const [stats, setStats] = useState(initialStats);
  const [timeSeries, setTimeSeries] = useState(initialTimeSeries);
  const [liveCount, setLiveCount] = useState(initialLiveCount);
  const [liveVisitors, setLiveVisitors] = useState([]);
  const [logs, setLogs] = useState(initialLogs || []);
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");

  const siteIdHeader = { "x-site-id": siteId };

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const refreshStats = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/visitors/stats?days=${dateRange}`, {
          headers: siteIdHeader,
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data.data?.stats ?? data.stats);
          setTimeSeries(data.data?.timeSeries ?? data.timeSeries);
          setLastRefresh(new Date());
          setConnected(true);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    },
    [dateRange, siteId],
  );

  // ── Fetch live visitors ────────────────────────────────────────────────────
  const refreshLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await fetch("/api/dashboard/visitors/live", {
        headers: siteIdHeader,
      });
      const data = await res.json();
      if (res.ok) {
        setLiveCount(data.data?.liveCount ?? data.liveCount);
        setLiveVisitors(data.data?.liveVisitors ?? (data.liveVisitors || []));
        setConnected(true);
      }
    } catch {
      setConnected(false);
    } finally {
      setLiveLoading(false);
    }
  }, [siteId]);

  // ── Fetch paginated logs ───────────────────────────────────────────────────
  const refreshLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/visitors/logs?limit=100", {
        headers: siteIdHeader,
      });
      const data = await res.json();
      if (res.ok) setLogs(data.data?.logs ?? (data.logs || []));
    } catch {
      // silent
    }
  }, [siteId]);

  // Initial fetch of live data + log polling
  useEffect(() => {
    setMounted(true);
    refreshLive();
    refreshLogs();
    // Poll live every 30 seconds
    const liveInterval = setInterval(refreshLive, 30_000);
    // Refresh stats every 5 minutes
    const statsInterval = setInterval(() => refreshStats(true), 5 * 60_000);
    return () => {
      clearInterval(liveInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Re-fetch stats when date range changes
  useEffect(() => {
    refreshStats();
  }, [dateRange]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "pages", label: "Top Pages" },
    { id: "geo", label: "Location" },
    { id: "device", label: "Device" },
    { id: "source", label: "Traffic Source" },
    { id: "logs", label: "Visitor Logs" },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold ">
            Live Visitor Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time analytics for{" "}
            <span className="font-semibold text-gray-800">{siteName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Connection status */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${connected
                ? "border-green-200 dark:border-green-900/30 bg-green-50 text-green-700"
                : "border-red-200 dark:border-red-900/30 bg-red-50 text-red-700"
              }`}
          >
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {connected ? "Connected" : "Disconnected"}
          </span>

          {/* Date range */}
          <select
            id="date-range-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white shadow-sm cursor-pointer"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <button
            id="refresh-btn"
            onClick={() => {
              refreshStats();
              refreshLive();
              refreshLogs();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white shadow-sm hover:bg-gray-50 disabled:opacity-60 transition"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Live Now"
          value={liveCount}
          sub="Active in last 2 min"
          icon={Activity}
          color="bg-green-500"
          pulse={liveCount > 0}
        />
        <StatCard
          label="Unique Visitors"
          value={stats?.uniqueVisitors ?? 0}
          sub={`Last ${dateRange} days`}
          icon={Users}
          color="bg-indigo-500"
        />
        <StatCard
          label="Page Views"
          value={stats?.totalPageViews ?? 0}
          sub={`Last ${dateRange} days`}
          icon={Eye}
          color="bg-violet-500"
        />
        <StatCard
          label="Avg. Session"
          value={formatDuration(stats?.avgSessionDuration ?? 0)}
          sub="Average time on page"
          icon={Clock}
          color="bg-amber-500"
        />
      </div>

      {/* ── Live Feed + Sparkline ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live visitor feed */}
        <div className="rounded-2xl border bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live Visitors
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({liveCount} online)
              </span>
            </h2>
            <button
              onClick={refreshLive}
              disabled={liveLoading}
              className="text-gray-400 hover:text-indigo-600 transition"
              title="Refresh live feed"
            >
              <RefreshCw
                size={13}
                className={liveLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
          <LiveFeed liveVisitors={liveVisitors} />
        </div>

        {/* Sparkline chart */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-500" />
              Page Views — Last {dateRange} Days
            </h2>
            <span className="text-xs text-gray-400">
              Last updated: {mounted ? lastRefresh.toLocaleTimeString() : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Sparkline data={timeSeries} width={560} height={80} />
          </div>
          {timeSeries && timeSeries.length > 0 && (
            <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
              <span>{timeSeries[0]?.date}</span>
              <span>{timeSeries[timeSeries.length - 1]?.date}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabbed breakdown ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-5 py-3 text-xs font-semibold transition border-b-2 ${activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/30"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Top Pages
                </h3>
                <MiniBarChart
                  data={stats?.topPages ?? []}
                  valueKey="views"
                  labelKey="page"
                  color="#6366f1"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  By Location
                </h3>
                <MiniBarChart
                  data={stats?.byLocation ?? []}
                  valueKey="count"
                  labelKey="location"
                  color="#10b981"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  By Device
                </h3>
                <MiniBarChart
                  data={stats?.byDevice ?? []}
                  valueKey="count"
                  labelKey="device"
                  color="#f59e0b"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Traffic Source
                </h3>
                <MiniBarChart
                  data={stats?.bySource ?? []}
                  valueKey="count"
                  labelKey="source"
                  color="#8b5cf6"
                />
              </div>
            </div>
          )}

          {/* Pages tab */}
          {activeTab === "pages" && (
            <div className="max-w-xl">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={15} className="text-indigo-500" />
                Most Visited Pages
              </h3>
              <MiniBarChart
                data={stats?.topPages ?? []}
                valueKey="views"
                labelKey="page"
                color="#6366f1"
              />
            </div>
          )}

          {/* Geo tab */}
          {activeTab === "geo" && (
            <div className="max-w-xl">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={15} className="text-green-500" />
                Top Locations
              </h3>
              <MiniBarChart
                data={stats?.byLocation ?? []}
                valueKey="count"
                labelKey="location"
                color="#10b981"
              />
            </div>
          )}

          {/* Device tab */}
          {activeTab === "device" && (
            <div className="max-w-xl">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Monitor size={15} className="text-amber-500" />
                Device Breakdown
              </h3>
              <MiniBarChart
                data={stats?.byDevice ?? []}
                valueKey="count"
                labelKey="device"
                color="#f59e0b"
              />
            </div>
          )}

          {/* Source tab */}
          {activeTab === "source" && (
            <div className="max-w-xl">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={15} className="text-purple-500" />
                Traffic Sources
              </h3>
              <MiniBarChart
                data={stats?.bySource ?? []}
                valueKey="count"
                labelKey="source"
                color="#8b5cf6"
              />
            </div>
          )}

          {/* Logs tab */}
          {activeTab === "logs" && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowRight size={15} className="text-indigo-500" />
                Visitor Logs
                <span className="text-xs font-normal text-gray-400">
                  ({logs.length} recent entries)
                </span>
              </h3>
              <LogsTable logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
