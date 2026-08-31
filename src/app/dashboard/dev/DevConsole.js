"use client";

import { useState, useMemo } from "react";
import { copyToClipboard as safeCopyToClipboard } from "@/lib/clipboard";
import WebhookManager from "./WebhookManager";

import {
  Terminal,
  Key,
  Database,
  GitBranch,
  AlertOctagon,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Save,
  Trash2,
  Lock,
  Globe,
  Settings,
  Eye,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function DevConsole({
  siteId,
  initialIntegrationKey,
  initialApiKeys,
  initialErrorLogs,
  initialEnv,
  initialVersionInfo,
  initialWebhooks = [],
}) {
  // Navigation Tabs State: "api-keys" | "integration-key" | "env" | "version" | "error-logs" | "webhooks"
  const [activeTab, setActiveTab] = useState("api-keys");

  // API Keys States
  const [apiKeys, setApiKeys] = useState(initialApiKeys || []);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [justGeneratedKey, setJustGeneratedKey] = useState(null);

  // Content Sync Key States
  const [integrationKey, setIntegrationKey] = useState(initialIntegrationKey);
  const [rotatingIntegrationKey, setRotatingIntegrationKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Exception Logs States
  const [errorLogs, setErrorLogs] = useState(initialErrorLogs || []);
  const [logsSearch, setLogsSearch] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // Modal view for stack traces

  // Deployment Notes State
  const [deploymentNotes, setDeploymentNotes] = useState(
    initialVersionInfo.deploymentNotes || [],
  );
  const [newDeploymentNote, setNewDeploymentNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // UI Alerts Feedback
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Create API Key
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setGeneratingKey(true);
    setErrorMessage("");
    setJustGeneratedKey(null);

    try {
      const res = await fetch("/api/dashboard/dev/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate API key");

      const key = json.data?.apiKey ?? json.apiKey;
      setApiKeys((prev) => [key, ...prev]);
      setJustGeneratedKey(key.key); // Cache raw key to show user once
      setNewKeyName("");
      setSuccessMessage("Developer API Key created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setGeneratingKey(false);
    }
  };

  // Revoke API Key
  const handleDeleteApiKey = async (id) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? Applications using this key will immediately lose access.",
      )
    )
      return;

    setErrorMessage("");
    try {
      const res = await fetch(`/api/dashboard/dev/keys?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to revoke API key");

      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      setSuccessMessage("API Key revoked successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Rotate site integrationKey
  const handleRotateIntegrationKey = async () => {
    const confirmation = confirm(
      "WARNING: Rotating the Integration Key will break content synchronization for any connected Client SDKs until they are updated with the new key.\n\nAre you sure you want to proceed?",
    );
    if (!confirmation) return;

    setRotatingIntegrationKey(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/dashboard/dev/integration-key", {
        method: "POST",
        headers: {
          "x-site-id": siteId,
        },
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to rotate integration key");

      setIntegrationKey(json.data?.integrationKey ?? json.integrationKey);
      setSuccessMessage("Content Sync Integration Key rotated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setRotatingIntegrationKey(false);
    }
  };

  // Copy Key Helper
  const copyToClipboard = async (text) => {
    setErrorMessage("");
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setErrorMessage(
        "Copy failed in this browser context. Select the key text and copy it manually.",
      );
    }
  };

  // Refresh System Exception Logs
  const handleRefreshErrorLogs = async () => {
    setLoadingLogs(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/dashboard/performance/error-logs", {
        headers: {
          "x-site-id": siteId,
        },
      });
      const json = await res.json();
      if (res.ok) {
        setErrorLogs(json.data?.errorLogs || json.logs || []);
      } else {
        setErrorMessage(json.error || "Failed to fetch error logs");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to refresh exception logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  // Dismiss a single error log
  const handleDismissLog = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/performance/error-logs?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setErrorLogs((prev) => prev.filter((log) => log.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear all exception logs
  const handleClearAllLogs = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all error exception logs? This cannot be undone.",
      )
    )
      return;

    try {
      const res = await fetch("/api/dashboard/performance/error-logs", {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });
      if (res.ok) {
        setErrorLogs([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter error logs
  const filteredErrorLogs = useMemo(() => {
    return errorLogs.filter((log) => {
      const q = logsSearch.toLowerCase();
      return (
        !q ||
        log.message.toLowerCase().includes(q) ||
        (log.stack && log.stack.toLowerCase().includes(q))
      );
    });
  }, [errorLogs, logsSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl flex items-center gap-2">
          <Terminal className="text-indigo-600" size={28} />
          Developer & Admin Tools
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage API keys, synchronization settings, masked env properties,
          release history, and diagnostics error logs.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-nowrap w-full overflow-x-auto whitespace-nowrap border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("api-keys");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "api-keys"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          <Key size={16} />
          API Keys Manager
        </button>

        <button
          onClick={() => {
            setActiveTab("integration-key");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "integration-key"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          <Globe size={16} />
          Content Sync Key
        </button>

        <button
          onClick={() => {
            setActiveTab("env");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "env"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          <Database size={16} />
          Env Settings
        </button>

        <button
          onClick={() => {
            setActiveTab("version");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "version"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          <GitBranch size={16} />
          Version History
        </button>

        <button
          onClick={() => {
            setActiveTab("error-logs");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "error-logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          <AlertOctagon size={16} />
          Error Logs ({errorLogs.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("webhooks");
            setErrorMessage("");
          }}
          className={`px-4 py-2 border-b-2 transition text-xs font-bold uppercase tracking-wider ${activeTab === "webhooks"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            } flex items-center gap-1.5`}
        >
          Webhooks
        </button>
      </div>

      {/* Feedbacks */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-xs rounded-xl flex gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === "api-keys" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Key creator */}
          <div className="lg:col-span-1 border bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
              <Plus size={16} className="text-gray-500" />
              Generate API Key
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              API Keys allow external clients and scripts to query content APIs
              securely. Assign a name to easily identify the key later.
            </p>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 uppercase block">
                  Key Name / Description
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. NextJS Frontend Script"
                  required
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={generatingKey}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 shadow-sm w-full transition disabled:opacity-50"
              >
                <Plus size={15} />
                {generatingKey ? "Generating Token..." : "Generate New Key"}
              </button>
            </form>

            {/* Display newly created key */}
            {justGeneratedKey && (
              <div className="p-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-900 dark:text-white flex items-center gap-1">
                  <AlertCircle size={15} /> Copy your API Key
                </h4>
                <p className="text-[10px] text-amber-700 dark:text-white leading-normal">
                  Make sure to copy your API key now. You will not be able to
                  see it again for security reasons.
                </p>
                <div className="flex gap-1.5 items-center bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 font-mono text-[11px] text-gray-800 dark:text-white break-all select-all">
                  <span className="flex-1">{justGeneratedKey}</span>
                  <button
                    onClick={() => copyToClipboard(justGeneratedKey)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400 shrink-0"
                    title="Copy API Key"
                  >
                    {copiedKey ? (
                      <Check size={14} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Keys List */}
          <div className="lg:col-span-2 border bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Active Developer API Keys
              </h3>
            </div>

            <div className="overflow-x-auto text-xs text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3">Key Name</th>
                    <th className="px-6 py-3">Token Mask</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50/30">
                      <td className="px-6 py-3 font-semibold text-gray-900">
                        {key.name}
                      </td>
                      <td className="px-6 py-3 font-mono text-gray-500">
                        {key.key
                          ? `${key.key.substring(0, 10)}****************`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(key.createdAt).toLocaleDateString("en-US")}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Revoke Key"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {apiKeys.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-16 text-center text-gray-400 italic"
                      >
                        No developer API keys created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "integration-key" && (
        <div className="border bg-white rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
            <Globe size={16} className="text-gray-500" />
            Content Sync Integration Key
          </h3>

          <p className="text-xs text-gray-500 leading-relaxed">
            The Content Sync Integration Key is used to validate route mapping
            manifest operations. Keep this key secret and copy it into your
            Next.js application parameters to sync pages and paths dynamically.
          </p>

          <div className="p-4 border rounded-xl bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Active Integration Key
              </span>
              <div className="font-mono text-xs font-bold text-gray-800 break-all select-all flex items-center gap-1">
                {integrationKey ? (
                  integrationKey
                ) : (
                  <span className="text-red-500 font-normal italic">
                    Not configured
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {integrationKey && (
                <button
                  onClick={() => copyToClipboard(integrationKey)}
                  className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-white hover:bg-gray-100 text-gray-600 font-bold text-xs transition select-none cursor-pointer"
                >
                  {copiedKey ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                  Copy Key
                </button>
              )}
              <button
                onClick={handleRotateIntegrationKey}
                disabled={rotatingIntegrationKey}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-xs transition disabled:opacity-50 select-none cursor-pointer"
              >
                <RefreshCw
                  size={14}
                  className={rotatingIntegrationKey ? "animate-spin" : ""}
                />
                {integrationKey ? "Regenerate" : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "env" && (
        <div className="border bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
            <Database size={16} className="text-gray-500" />
            Environment Variables Settings
          </h3>

          <p className="text-xs text-gray-500 leading-relaxed">
            Diagnose environment setups. Sensitive password variables and client
            secrets are automatically masked server-side.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(initialEnv).map(([key, val]) => (
              <div
                key={key}
                className="p-4 border rounded-xl bg-gray-50/50 space-y-1"
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                  {key}
                </span>
                <span className="text-xs font-semibold text-gray-800">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "version" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Release history */}
          <div className="lg:col-span-2 border bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  System Version & Release History
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">
                  Build timestamp:{" "}
                  {new Date(initialVersionInfo.buildTime).toLocaleString("en-US")}
                </p>
              </div>
              <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-full">
                Current: {initialVersionInfo.currentVersion}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {initialVersionInfo.history.map((release, index) => (
                <div
                  key={index}
                  className="p-6 space-y-2 hover:bg-gray-50/20 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      v{release.version}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1 select-none">
                      <Calendar size={10} />
                      {release.releaseDate}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    {release.changes}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment notes panel */}
          <div className="border bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
              <Layers size={16} className="text-gray-500" />
              Deployment Notes
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newDeploymentNote.trim()) return;
                setSavingNote(true);
                setErrorMessage("");
                try {
                  const res = await fetch("/api/dashboard/dev/version", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-site-id": siteId,
                    },
                    body: JSON.stringify({ note: newDeploymentNote }),
                  });
                  const json = await res.json();
                  if (!res.ok)
                    throw new Error(json.error || "Failed to save note");

                  setDeploymentNotes(json.data.deploymentNotes || []);
                  setNewDeploymentNote("");
                  setSuccessMessage("Deployment note saved!");
                  setTimeout(() => setSuccessMessage(""), 3000);
                } catch (err) {
                  setErrorMessage(err.message);
                } finally {
                  setSavingNote(false);
                }
              }}
              className="space-y-3"
            >
              <textarea
                value={newDeploymentNote}
                onChange={(e) => setNewDeploymentNote(e.target.value)}
                placeholder="Describe what changed in this deployment..."
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={savingNote || !newDeploymentNote.trim()}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 shadow-sm transition disabled:opacity-50"
              >
                <Save size={14} />
                {savingNote ? "Saving..." : "Save Deployment Note"}
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deploymentNotes.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">
                  No deployment notes recorded yet.
                </p>
              ) : (
                deploymentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 border rounded-lg bg-gray-50/50 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-bold text-gray-600">
                        {note.author}
                      </span>
                      <span>v{note.version}</span>
                      <span>{new Date(note.createdAt).toLocaleString("en-US")}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "error-logs" && (
        <div className="border bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="border-b px-6 py-4 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Exception Logs Terminal
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">
                Captures uncaught server exceptions and diagnostics error dumps.
              </p>
            </div>
            <div className="flex gap-2">
              {errorLogs.length > 0 && (
                <button
                  onClick={handleClearAllLogs}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg hover:bg-red-50 text-red-600 border-red-100 text-xs font-semibold transition cursor-pointer select-none"
                >
                  <Trash2 size={13} />
                  Purge Logs
                </button>
              )}
              <button
                onClick={handleRefreshErrorLogs}
                disabled={loadingLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-white text-gray-600 text-xs font-semibold transition disabled:opacity-50 cursor-pointer select-none"
              >
                <RefreshCw
                  size={13}
                  className={loadingLogs ? "animate-spin" : ""}
                />
                Refresh logs
              </button>
            </div>
          </div>

          {/* Filtering */}
          <div className="border-b px-6 py-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                placeholder="Search exception messages or stack traces..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none w-full focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Log terminal feed */}
          <div className="bg-slate-950 text-slate-200 p-4 font-mono text-[11px] h-96 overflow-y-auto space-y-2 select-text">
            {filteredErrorLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 border border-slate-900 bg-slate-900/40 rounded-lg space-y-2 hover:bg-slate-900/60 transition relative group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-bold bg-slate-950 px-1.5 py-0.5 rounded select-none">
                      {new Date(log.createdAt).toLocaleString("en-US")}
                    </span>
                    <p className="text-red-400 font-semibold text-xs leading-normal mt-1">
                      {log.message}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {log.stack && (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 hover:bg-slate-800 text-slate-400 rounded transition cursor-pointer"
                        title="View Stack Trace"
                      >
                        <Eye size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissLog(log.id)}
                      className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded transition cursor-pointer"
                      title="Clear Log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredErrorLogs.length === 0 && (
              <div className="py-24 text-center text-slate-600 italic select-none">
                No error exception logs captured. System is healthy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Log Modal (For viewing stack traces) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Error Stack Trace
                </h4>
                <p className="text-xs text-red-400 font-bold mt-1 max-w-xl truncate">
                  {selectedLog.message}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer select-none"
              >
                Close Trace
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap select-text bg-slate-950/20">
              {selectedLog.stack || "No call stack trace captured."}
            </div>
          </div>
        </div>
      )}
      {activeTab === "webhooks" && (
        <div className="p-6">
          <WebhookManager siteId={siteId} initialWebhooks={initialWebhooks} />
        </div>
      )}
    </div>
  );
}

