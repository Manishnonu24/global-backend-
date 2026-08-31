"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ObservabilityPanel from "./ObservabilityPanel";
import {
  Activity,
  Sliders,
  ShieldAlert,
  RefreshCw,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ListCollapse,
  Layers,
  Radio,
} from "lucide-react";

export default function PerformanceConsole({ siteId, user, initialTab = "health" }) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams?.get("tab");

  const [userTab, setUserTab] = useState(initialTab || "health");
  const activeTab = tabFromQuery || userTab;
  const setActiveTab = (tab) => setUserTab(tab);

  // Health state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  // Config state
  const [lazyLoading, setLazyLoading] = useState(true);
  const [lazyLoadImages, setLazyLoadImages] = useState(true);
  const [lazyLoadVideos, setLazyLoadVideos] = useState(true);
  const [compressImages, setCompressImages] = useState(true);
  const [cachingDays, setCachingDays] = useState(7);
  const [minifyHtml, setMinifyHtml] = useState(false);
  const [deferScripts, setDeferScripts] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);

  // Logs state
  const [errorLogs, setErrorLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load test state
  const [loadTesting, setLoadTesting] = useState(false);
  const [loadTestResults, setLoadTestResults] = useState(null);
  const [loadTestError, setLoadTestError] = useState(null);

  const runLoadTest = async () => {
    setLoadTesting(true);
    setLoadTestError(null);
    try {
      const res = await fetch("/api/dashboard/performance/load-test", {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok) {
        setLoadTestResults(data.data || data);
      } else {
        throw new Error(data.error || "Failed to execute load test benchmark");
      }
    } catch (err) {
      setLoadTestError(err.message);
    } finally {
      setLoadTesting(false);
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/dashboard/performance/site-health", {
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setHealthData(data.data || data);
      } else {
        throw new Error(data.error || "Failed to fetch health check details");
      }
    } catch (err) {
      setHealthError(err.message);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchConfig = async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const res = await fetch("/api/dashboard/performance/config", {
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        const payload = data.data || data;
        const cfg = payload.performanceConfig;
        setLazyLoading(cfg.lazyLoading ?? true);
        setLazyLoadImages(cfg.lazyLoadImages ?? true);
        setLazyLoadVideos(cfg.lazyLoadVideos ?? true);
        setCompressImages(cfg.compressImagesOnUpload ?? true);
        setCachingDays(cfg.browserCachingDays ?? 7);
        setMinifyHtml(cfg.minifyHtml ?? false);
        setDeferScripts(cfg.deferNonEssentialScripts ?? true);
      }
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const res = await fetch("/api/dashboard/performance/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          lazyLoading,
          lazyLoadImages,
          lazyLoadVideos,
          compressImagesOnUpload: compressImages,
          browserCachingDays: cachingDays,
          minifyHtml,
          deferNonEssentialScripts: deferScripts,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigSuccess("Performance settings saved successfully!");
        setTimeout(() => setConfigSuccess(null), 3000);
      } else {
        throw new Error(data.error || "Failed to update configurations");
      }
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetch("/api/dashboard/performance/error-logs", {
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok) {
        setErrorLogs(data.data?.errorLogs || data.errorLogs || []);
      } else {
        throw new Error(data.error || "Failed to retrieve system logs");
      }
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const deleteSpecificLog = async (logId) => {
    if (!confirm("Are you sure you want to dismiss this error log entry?"))
      return;
    try {
      const res = await fetch(`/api/dashboard/performance/error-logs?id=${logId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        setErrorLogs(errorLogs.filter((log) => log.id !== logId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllLogs = async () => {
    if (
      !confirm(
        "CRITICAL: Are you sure you want to wipe all system error logs? This action is permanent.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/dashboard/performance/error-logs", {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        setErrorLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    const loadTab = async () => {
      if (activeTab === "health") {
        setHealthLoading(true);
        setHealthError(null);
        try {
          const res = await fetch("/api/dashboard/performance/site-health", {
            headers: { "x-site-id": siteId },
          });
          const data = await res.json();
          if (active) {
            if (res.ok && !data.error) {
              setHealthData(data.data || data);
            } else {
              setHealthError(data.error || "Failed to fetch health check details");
            }
          }
        } catch (err) {
          if (active) setHealthError(err.message);
        } finally {
          if (active) setHealthLoading(false);
        }
      } else if (activeTab === "config") {
        setConfigLoading(true);
        setConfigError(null);
        try {
          const res = await fetch("/api/dashboard/performance/config", {
            headers: { "x-site-id": siteId },
          });
          const data = await res.json();
          if (active && res.ok && !data.error) {
            const payload = data.data || data;
            const cfg = payload.performanceConfig;
            setLazyLoading(cfg.lazyLoading ?? true);
            setLazyLoadImages(cfg.lazyLoadImages ?? true);
            setLazyLoadVideos(cfg.lazyLoadVideos ?? true);
            setCompressImages(cfg.compressImagesOnUpload ?? true);
            setCachingDays(cfg.browserCachingDays ?? 7);
            setMinifyHtml(cfg.minifyHtml ?? false);
            setDeferScripts(cfg.deferNonEssentialScripts ?? true);
          }
        } catch (err) {
          if (active) setConfigError(err.message);
        } finally {
          if (active) setConfigLoading(false);
        }
      } else if (activeTab === "logs") {
        setLogsLoading(true);
        setLogsError(null);
        try {
          const res = await fetch("/api/dashboard/performance/error-logs", {
            headers: { "x-site-id": siteId },
          });
          const data = await res.json();
          if (active) {
            if (res.ok) {
              setErrorLogs(data.data?.errorLogs || data.errorLogs || []);
            } else {
              setLogsError(data.error || "Failed to retrieve system logs");
            }
          }
        } catch (err) {
          if (active) setLogsError(err.message);
        } finally {
          if (active) setLogsLoading(false);
        }
      }
    };

    loadTab();
    return () => {
      active = false;
    };
  }, [activeTab, siteId]);

  const filteredLogs = errorLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.message.toLowerCase().includes(q) ||
      (log.stack && log.stack.toLowerCase().includes(q))
    );
  });

  const formatUptime = (seconds) => {
    if (!seconds) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Navigation list */}
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-fit space-y-1">
        <button
          onClick={() => setActiveTab("health")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "health"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Activity size={16} />
          Site Health & Status
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "config"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Sliders size={16} />
          Optimizations (Lazy Load)
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "logs"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <ShieldAlert size={16} />
          Exception Error Logs
        </button>

        <button
          onClick={() => setActiveTab("loadtest")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "loadtest"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Cpu size={16} />
          Simultaneous Load Test
        </button>
        <button
          onClick={() => setActiveTab("observability")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "observability"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Radio size={16} />
          Observability & Telemetry
        </button>
      </div>

      {/* Contents */}
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-100">
        {/* Tab: Observability & Telemetry */}
        {activeTab === "observability" && (
          <ObservabilityPanel siteId={siteId} user={user} />
        )}

        {/* Tab 1: Diagnostics Health */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Activity size={20} className="text-blue-600" />
                  Site Diagnostics Diagnostics
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Active diagnostic parameters, server resource metrics, and
                  database latencies.
                </p>
              </div>

              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold text-gray-600 transition"
              >
                <RefreshCw
                  size={12}
                  className={healthLoading ? "animate-spin" : ""}
                />
                Refresh Check
              </button>
            </div>

            {healthError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <p>{healthError}</p>
              </div>
            )}

            {healthLoading && !healthData ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Performing diagnostic testing...
              </div>
            ) : healthData ? (
              <div className="space-y-6">
                {/* Diagnostics Status Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-xl bg-gray-50/30 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <Database size={11} className="text-blue-500" />
                      Database Status
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        {healthData.checks.database.status}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold">
                        Latency: {healthData.checks.database.latency || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-gray-50/30 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <Cpu size={11} className="text-blue-500" />
                      Server RAM Memory
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-gray-900">
                          {healthData.checks.system.memoryUsedPercent}%
                        </span>
                        <span className="text-gray-400">
                          Free:{" "}
                          {formatBytes(
                            healthData.checks.system.freeMemoryBytes,
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{
                            width: `${healthData.checks.system.memoryUsedPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-gray-50/30 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <RefreshCw size={11} className="text-blue-500" />
                      Server Uptime / Response
                    </span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-gray-900">
                        {formatUptime(healthData.checks.system.uptimeSeconds)}
                      </span>
                      <span className="text-xs text-indigo-600 font-semibold">
                        Ping: {healthData.checks.database.latency || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DB Table statistics */}
                <div className="border rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers size={16} className="text-blue-500" />
                    Database Entity Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="border-r pr-2 last:border-r-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        Pages
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {healthData.checks.database.counts.pages ?? 0}
                      </div>
                    </div>
                    <div className="border-r pr-2 last:border-r-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        Blogs
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {healthData.checks.database.counts.posts ?? 0}
                      </div>
                    </div>
                    <div className="border-r pr-2 last:border-r-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        Media Assets
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {healthData.checks.database.counts.mediaAssets ?? 0}
                      </div>
                    </div>
                    <div className="border-r pr-2 last:border-r-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        Analytics Logs
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {healthData.checks.database.counts.visitorHistory ?? 0}
                      </div>
                    </div>
                    <div className="pr-2 last:border-r-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        Error Exceptions
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {healthData.checks.database.counts.systemErrors ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration items */}
                <div className="border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex justify-between items-center py-2 border-b sm:border-b-0 sm:border-r sm:pr-4">
                    <span className="text-xs text-gray-500 font-semibold">
                      Cloudinary Status
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        healthData.checks.cloudinary?.status === "Configured"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {healthData.checks.cloudinary?.status || "Not Configured"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b sm:border-b-0 sm:border-r sm:px-4">
                    <span className="text-xs text-gray-500 font-semibold">
                      S3/MinIO Status
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        healthData.checks.s3?.status === "Configured"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {healthData.checks.s3?.status || "Not Configured"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 sm:pl-4">
                    <span className="text-xs text-gray-500 font-semibold">
                      Environment Node Mode
                    </span>
                    <span className="font-mono text-xs uppercase font-bold text-slate-600">
                      {healthData.checks.environment.nodeEnv}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab 2: Optimization settings */}
        {activeTab === "config" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sliders size={20} className="text-blue-600" />
                Asset Optimization Settings
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enable lazy loading for images and videos, auto-compress
                uploads, defer scripts, and set TTL caching values.
              </p>
            </div>

            {configError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <p>{configError}</p>
              </div>
            )}

            {configSuccess && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
                <CheckCircle2 className="shrink-0" size={18} />
                <p>{configSuccess}</p>
              </div>
            )}

            {configLoading && !lazyLoading && !lazyLoadImages ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading optimizer settings...
              </div>
            ) : (
              <form onSubmit={saveConfig} className="space-y-6 max-w-2xl pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lazy Loading switches */}
                  <div className="border p-5 rounded-xl space-y-4 bg-gray-50/20">
                    <h3 className="font-bold text-xs uppercase text-gray-700 border-b pb-1.5">
                      Lazy Loading Configurations
                    </h3>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer border-b border-gray-100 pb-2">
                        <input
                          type="checkbox"
                          checked={lazyLoading}
                          onChange={(e) => setLazyLoading(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">
                            Enable Lazy Loading
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Master toggle to enable or disable all lazy loading
                            features globally.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lazyLoadImages}
                          onChange={(e) => setLazyLoadImages(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">
                            Lazy Load Images
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Appends loading=&quot;lazy&quot; to all front-facing images.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lazyLoadVideos}
                          onChange={(e) => setLazyLoadVideos(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">
                            Lazy Load Videos
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Defers video preloading until play is interacted.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Cache & Compressions */}
                  <div className="border p-5 rounded-xl space-y-4 bg-gray-50/20">
                    <h3 className="font-bold text-xs uppercase text-gray-700 border-b pb-1.5">
                      Script & Compression settings
                    </h3>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressImages}
                          onChange={(e) => setCompressImages(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">
                            Compress Uploaded Images
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Automatically compress images to WebP on upload.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deferScripts}
                          onChange={(e) => setDeferScripts(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">
                            Defer Non-Essential Scripts
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Append defer tag to external analytics scripts.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Cache Slider */}
                <div className="border p-5 rounded-xl space-y-4 bg-white shadow-sm">
                  <div className="flex justify-between items-baseline border-b pb-1.5">
                    <h3 className="font-bold text-xs uppercase text-gray-700">
                      Browser Cache Max Age (Days)
                    </h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {cachingDays} Days
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="365"
                      value={cachingDays}
                      onChange={(e) =>
                        setCachingDays(parseInt(e.target.value, 10))
                      }
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[9px] text-gray-400 leading-normal">
                      Specifies Cache-Control max-age header values in static
                      media asset retrieval API routes.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={configLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Save size={13} />
                  {configLoading
                    ? "Saving Configurations..."
                    : "Save Optimization Settings"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: System Error Logs */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-blue-600" />
                  Captured System Exceptions ({filteredLogs.length})
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Trace runtime exceptions, API server crashes, and database
                  validation errors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold text-gray-600 transition"
                >
                  <RefreshCw
                    size={12}
                    className={logsLoading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>

                <button
                  onClick={clearAllLogs}
                  disabled={logsLoading || errorLogs.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg bg-red-50 border-red-200 text-red-700 hover:bg-red-100 font-bold transition disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Clear Logs
                </button>
              </div>
            </div>

            {logsError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <p>{logsError}</p>
              </div>
            )}

            {logsLoading && errorLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Fetching crash trace list...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search bar */}
                <div className="max-w-md">
                  <input
                    type="text"
                    placeholder="Search errors by message or stack trace..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-xs"
                  />
                </div>

                {/* Audit data logs list */}
                <div className="space-y-3">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div
                        key={log.id}
                        className="border rounded-xl overflow-hidden bg-white shadow-xs"
                      >
                        <div
                          onClick={() =>
                            setExpandedLogId(isExpanded ? null : log.id)
                          }
                          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50/50 select-none transition"
                        >
                          <div className="space-y-1 pr-4 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-mono text-xs font-semibold text-red-600 truncate max-w-sm sm:max-w-md">
                                {log.message}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(log.createdAt).toLocaleString("en-US")}
                              </span>
                            </div>
                            {log.context && (
                              <div className="text-[10px] text-gray-500 font-mono truncate max-w-lg">
                                Context: {JSON.stringify(log.context)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSpecificLog(log.id);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                              title="Delete entry"
                            >
                              <Trash2 size={13} />
                            </button>
                            <ListCollapse
                              size={14}
                              className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-gray-50/50 p-4 space-y-3">
                            {log.stack && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                  Stack trace:
                                </span>
                                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-60 leading-normal select-all">
                                  {log.stack}
                                </pre>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                              <span>Log ID: {log.id}</span>
                              {log.siteId && (
                                <span>Site context: {log.siteId}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredLogs.length === 0 && (
                    <div className="py-12 text-center text-xs text-gray-400 italic">
                      No system exceptions recorded.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Load Testing */}
        {activeTab === "loadtest" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Cpu size={20} className="text-blue-600" />
                  Simultaneous Site & API Load Benchmarking
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Simulate high-concurrency requests to all active client sites and backend APIs to measure latencies and error rates.
                </p>
              </div>

              <button
                onClick={runLoadTest}
                disabled={loadTesting}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                <RefreshCw
                  size={14}
                  className={loadTesting ? "animate-spin" : ""}
                />
                {loadTesting ? "Testing..." : "Execute Sim Test"}
              </button>
            </div>

            {loadTestError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <p>{loadTestError}</p>
              </div>
            )}

            {loadTesting && !loadTestResults && (
              <div className="py-16 text-center space-y-3">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" />
                <p className="text-sm text-gray-500 font-medium">Spawning concurrent request workers to hit 6 targets...</p>
              </div>
            )}

            {loadTestResults ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Concurrency Level</span>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">{loadTestResults.concurrency} Workers</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Overall Latency</span>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">{Math.round(loadTestResults.durationMs || 0)} ms</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Scan Status</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">Completed</div>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Benchmark Target</th>
                        <th className="px-5 py-3 text-center">Requests</th>
                        <th className="px-5 py-3 text-center">Success Rate</th>
                        <th className="px-5 py-3 text-center">Throughput</th>
                        <th className="px-5 py-3 text-center">Avg Latency</th>
                        <th className="px-5 py-3 text-right">Latency Range (Min - Max)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {loadTestResults.results?.map((res, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">{res.targetName}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-xs">{res.url}</div>
                          </td>
                          <td className="px-5 py-4 text-center font-semibold text-gray-700">{res.requestsSent}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.failureCount === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {Math.round((res.successCount / res.requestsSent) * 100)}%
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-gray-800">{res.throughputRps} req/s</td>
                          <td className="px-5 py-4 text-center font-semibold text-blue-600">{res.avgLatencyMs} ms</td>
                          <td className="px-5 py-4 text-right font-mono text-gray-500">{res.minLatencyMs}ms - {res.maxLatencyMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !loadTesting && (
                <div className="py-12 text-center text-xs text-gray-400 italic">
                  Press &quot;Execute Sim Test&quot; to start the load testing benchmark.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

