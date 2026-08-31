"use client";

import { useState, useEffect } from "react";
import { copyToClipboard as safeCopyToClipboard } from "@/lib/clipboard";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
  Terminal,
  Database,
  ExternalLink,
  Info,
  Server,
  Layers,
  Search,
} from "lucide-react";

export default function ObservabilityPanel({ siteId, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sentry Test State
  const [sentryTesting, setSentryTesting] = useState(false);
  const [sentryTestResult, setSentryTestResult] = useState(null);
  const [sentryTestError, setSentryTestError] = useState(null);

  // Loki Test State
  const [lokiTesting, setLokiTesting] = useState(false);
  const [lokiTestResult, setLokiTestResult] = useState(null);
  const [lokiTestError, setLokiTestError] = useState(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const isSuperAdmin = user?.globalRole === "SUPERADMIN";

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/observability/status", {
        headers: { "x-site-id": siteId || "AHP" },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch observability status");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard/observability/status", {
          headers: { "x-site-id": siteId || "AHP" },
        });
        const json = await res.json();
        if (active) {
          if (res.ok && json.success) {
            setData(json.data);
          } else {
            setError(json.error || "Failed to fetch observability status");
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [siteId]);

  const triggerSentryTest = async () => {
    if (!confirm("Send a safe test exception to Sentry?")) return;
    setSentryTesting(true);
    setSentryTestError(null);
    setSentryTestResult(null);
    try {
      const res = await fetch("/api/debug/sentry", {
        method: "POST",
        headers: { "x-site-id": siteId || "AHP" },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSentryTestResult(json.data || json);
      } else {
        throw new Error(json.error || "Failed to send Sentry test event");
      }
    } catch (err) {
      setSentryTestError(err.message);
    } finally {
      setSentryTesting(false);
    }
  };

  const triggerLokiTest = async () => {
    if (!confirm("Send a safe test log entry to Grafana Loki?")) return;
    setLokiTesting(true);
    setLokiTestError(null);
    setLokiTestResult(null);
    setCopiedQuery(false);
    try {
      const res = await fetch("/api/debug/log", {
        method: "POST",
        headers: { "x-site-id": siteId || "AHP" },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLokiTestResult(json.data || json);
      } else {
        throw new Error(json.error || "Failed to send Loki test log");
      }
    } catch (err) {
      setLokiTestError(err.message);
    } finally {
      setLokiTesting(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 3000);
    }
  };

  const renderBadge = (status, label) => {
    let style = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    if (status === "healthy" || status === "ok" || status === true || status === "Configured") {
      style = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    } else if (status === "degraded" || status === "unverified") {
      style = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    } else if (status === "error" || status === false || status === "Offline") {
      style = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
        {label}
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading observability metrics & configuration...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={18} />
          Failed to Load Observability Status
        </div>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchStatus}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Retry Check
        </button>
      </div>
    );
  }

  const app = data?.application || {};
  const sentry = data?.sentry || {};
  const loki = data?.loki || {};
  const synthetic = data?.syntheticMonitoring || {};

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
            Unified Observability & Telemetry Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time infrastructure health, Sentry exception tracking, Grafana Loki log aggregation, and synthetic monitors.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition"
          aria-label="Refresh Observability Status"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Status
        </button>
      </div>

      {/* Monitoring Sources Separation Explanatory Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
          Monitoring Platform Architecture & Boundaries
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">Sentry</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Captures unhandled runtime crashes, stack traces, releases & frontend errors.</p>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">Grafana Loki</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Streams structured Pino application logs & diagnostic telemetry.</p>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">Synthetic Monitoring</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Probes endpoint availability and HTTP ping status globally.</p>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">Internal Error Logs</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Database-backed records (`SystemErrorLog`) stored locally for site admins.</p>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: Application Health */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server size={16} className="text-emerald-600 dark:text-emerald-400" />
              Application & Database Health
            </h3>
            {renderBadge(app.status, app.status === "healthy" ? "Healthy" : "Degraded")}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Database (MySQL)</span>
              {renderBadge(app.database, app.database === "ok" ? "Operational" : "Error")}
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Redis Cache</span>
              {renderBadge(app.redis, app.redis === "ok" ? "Operational" : "Error")}
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Internal Error Audit Logs (`SystemErrorLog`)</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{app.siteErrorLogsCount ?? 0} entries</span>
            </div>

            <div className="flex justify-between items-center py-1 text-[11px] text-slate-400">
              <span>Last checked: {app.lastChecked ? new Date(app.lastChecked).toLocaleTimeString() : "Just now"}</span>
              <span className="font-mono text-[10px]">Endpoint: /api/health</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Sentry */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
              Sentry Exception Tracking
            </h3>
            {isSuperAdmin
              ? renderBadge(sentry.runtimeConfigured, sentry.runtimeConfigured ? "Configured" : "Not Configured")
              : renderBadge("info", "Global Config Hidden")}
          </div>

          {isSuperAdmin ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Browser SDK</span>
                {renderBadge(sentry.browserConfigured, sentry.browserConfigured ? "Configured" : "Not Configured")}
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Server & Edge SDK</span>
                {renderBadge(sentry.runtimeConfigured, sentry.runtimeConfigured ? "Configured" : "Not Configured")}
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Source-Map Uploads</span>
                {renderBadge(sentry.sourceMapsConfigured, sentry.sourceMapsConfigured ? "Configured" : "Not Configured")}
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Environment / Release</span>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {sentry.environment || "development"} {sentry.release ? `(${sentry.release.substring(0, 7)})` : ""}
                </span>
              </div>

              {/* Sentry Test Action */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={triggerSentryTest}
                  disabled={sentryTesting || !sentry.testEnabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--admin-accent, #0f7c85)" }}
                >
                  <Send size={12} className={sentryTesting ? "animate-spin" : ""} />
                  {sentryTesting ? "Sending..." : "Send Test Error"}
                </button>

                {sentry.projectUrl ? (
                  <a
                    href={sentry.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open Sentry <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Project link not set</span>
                )}
              </div>

              {/* Sentry Test Result Banner */}
              {sentryTestResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>Test Event Sent</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">{sentryTestResult.sentAt ? new Date(sentryTestResult.sentAt).toLocaleTimeString() : ""}</span>
                  </div>
                  <div className="text-[10px] font-mono break-all">
                    Event ID: <span className="font-bold">{sentryTestResult.eventId}</span>
                  </div>
                </div>
              )}

              {sentryTestError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[11px] rounded-lg">
                  {sentryTestError}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4">
              Global Sentry credentials and SDK configuration states are restricted to SUPERADMIN users.
            </p>
          )}
        </div>

        {/* CARD 3: Grafana Loki */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Terminal size={16} className="text-blue-600 dark:text-blue-400" />
              Grafana Loki Log Transport
            </h3>
            {isSuperAdmin
              ? renderBadge(loki.writeTransportConfigured, loki.writeTransportConfigured ? "Configured" : "Not Configured")
              : renderBadge("info", "Global Config Hidden")}
          </div>

          {isSuperAdmin ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Pino Loki Transport</span>
                {renderBadge(loki.writeTransportConfigured, loki.writeTransportConfigured ? "Configured" : "Not Configured")}
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Loki Host</span>
                {renderBadge(loki.hostConfigured, loki.hostConfigured ? "Configured" : "Not Configured")}
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">App & Environment Labels</span>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {loki.appLabel || "ahp-reimagined"} ({loki.environment || "development"})
                </span>
              </div>

              {/* Loki Test Action */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={triggerLokiTest}
                  disabled={lokiTesting || !loki.testEnabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Send size={12} className={lokiTesting ? "animate-spin" : ""} />
                  {lokiTesting ? "Sending..." : "Send Test Log"}
                </button>

                {loki.dashboardUrl ? (
                  <a
                    href={loki.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open Grafana Logs <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Dashboard link not set</span>
                )}
              </div>

              {/* Loki Test Result Banner */}
              {lokiTestResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>Test Log Emitted</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      {lokiTestResult.sentAt ? new Date(lokiTestResult.sentAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded border border-emerald-200 dark:border-emerald-800/80">
                    <code className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
                      {lokiTestResult.lokiQuery || `{app="ahp-reimagined"} |= "${lokiTestResult.probeId}"`}
                    </code>
                    <button
                      onClick={() => copyToClipboard(lokiTestResult.lokiQuery || `{app="ahp-reimagined"} |= "${lokiTestResult.probeId}"`)}
                      className="p-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded transition flex items-center gap-1 text-[10px]"
                    >
                      {copiedQuery ? <Check size={12} /> : <Copy size={12} />}
                      {copiedQuery ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {lokiTestError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[11px] rounded-lg">
                  {lokiTestError}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4">
              Global Loki credentials and transport configuration states are restricted to SUPERADMIN users.
            </p>
          )}
        </div>

        {/* CARD 4: Synthetic Monitoring */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-amber-600 dark:text-amber-400" />
              Grafana Synthetic Monitoring
            </h3>
            {renderBadge(synthetic.linkConfigured ? "unverified" : "info", synthetic.linkConfigured ? "Dashboard link configured" : "Not configured")}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Health Endpoint</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{synthetic.healthEndpoint || "/api/health"}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Expected Response</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Probe Target</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">External probe ping target</span>
            </div>

            <div className="pt-2 flex justify-between items-center">
              {synthetic.syntheticUrl ? (
                <a
                  href={synthetic.syntheticUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Open Synthetic Monitoring <ArrowUpRight size={13} />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Synthetic check link not set</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request ID Correlation Guide */}
      <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Search size={16} style={{ color: "var(--admin-accent, #0f7c85)" }} />
          Request-ID Cross-Platform Correlation Workflow
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Every unexpected application exception includes a unique <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">x-request-id</code> tag shared across Sentry error events, Pino structured logs in Loki, and HTTP 500 error responses.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--admin-accent, #0f7c85)" }}>1</span>
              Find in Sentry
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Open a Sentry issue and copy its <code className="font-mono text-[10px]">requestId</code> tag.</p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--admin-accent, #0f7c85)" }}>2</span>
              Open Grafana Explore
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Navigate to Grafana Cloud Explore and select the Loki datasource.</p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--admin-accent, #0f7c85)" }}>3</span>
              Run LogQL Query
            </div>
            <code className="text-[10px] font-mono text-slate-700 dark:text-slate-300 block bg-slate-200 dark:bg-slate-900 p-1 rounded">
              {"{app=\"ahp-reimagined\"} |= \"<REQUEST_ID>\""}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
