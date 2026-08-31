"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Cookie,
  ClipboardList,
  UserX,
  AlertTriangle,
  Save,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
  Globe,
  Settings,
} from "lucide-react";

export default function ComplianceConsole({
  siteId,
  initialConfig,
  initialDeletionLogs,
}) {
  // Navigation Tabs State: "banner" | "logs" | "deletion"
  const [activeTab, setActiveTab] = useState("banner");

  // Cookie Banner Settings State
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(
    initialConfig.cookieConsentEnabled ?? true,
  );
  const [cookieConsentMessage, setCookieConsentMessage] = useState(
    initialConfig.cookieConsentMessage ?? "",
  );
  const [essentialCookiesEnabled] = useState(true); // Always true
  const [analyticsCookiesEnabled, setAnalyticsCookiesEnabled] = useState(
    initialConfig.analyticsCookiesEnabled ?? true,
  );
  const [marketingCookiesEnabled, setMarketingCookiesEnabled] = useState(
    initialConfig.marketingCookiesEnabled ?? true,
  );
  const [bannerPosition, setBannerPosition] = useState(
    initialConfig.bannerPosition ?? "bottom",
  );
  const [acceptButtonText, setAcceptButtonText] = useState(
    initialConfig.acceptButtonText ?? "Accept All",
  );
  const [declineButtonText, setDeclineButtonText] = useState(
    initialConfig.declineButtonText ?? "Decline",
  );
  const [settingsButtonText, setSettingsButtonText] = useState(
    initialConfig.settingsButtonText ?? "Preferences",
  );

  // Loading & Alerts Feedback
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Consent Logs State (loaded from configuration JSON field)
  const [consentLogs, setConsentLogs] = useState(
    initialConfig.consentLogs || [],
  );
  const [logsSearch, setLogsSearch] = useState("");
  const [logsFilter, setLogsFilter] = useState("all"); // "all" | "analytics" | "marketing"

  // GDPR Data Deletion State
  const [deleteEmail, setDeleteEmail] = useState("");
  const [recordCounts, setRecordCounts] = useState(null); // { leads, submissions, total }
  const [checkingCounts, setCheckingCounts] = useState(false);
  const [purging, setPurging] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState(initialDeletionLogs || []);
  const [deletionLogsSearch, setDeletionLogsSearch] = useState("");

  // Save Settings Handler
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/dashboard/compliance/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          cookieConsentEnabled,
          cookieConsentMessage,
          essentialCookiesEnabled: true,
          analyticsCookiesEnabled,
          marketingCookiesEnabled,
          bannerPosition: "bottom",
          acceptButtonText,
          declineButtonText,
          settingsButtonText,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to save configuration settings");

      setSuccessMessage("Cookie consent and compliance preferences updated!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Check data deletion counts for a given email address
  const handleCheckCounts = async (e) => {
    e.preventDefault();
    if (!deleteEmail || !deleteEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setCheckingCounts(true);
    setErrorMessage("");
    setRecordCounts(null);

    try {
      const res = await fetch(
        `/api/dashboard/compliance/data-deletion?email=${encodeURIComponent(deleteEmail)}`,
        {
          headers: {
            "x-site-id": siteId,
          },
        },
      );

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to load matching records");

      setRecordCounts(json.data?.counts ?? json.counts);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setCheckingCounts(false);
    }
  };

  // Perform permanent data purging
  const handleExecuteDeletion = async () => {
    if (!deleteEmail || !recordCounts) return;

    const confirmation = confirm(
      `WARNING: Are you absolutely sure you want to permanently delete all data records for "${deleteEmail}"?\n\nThis will purge ${recordCounts.leads} lead record(s) and ${recordCounts.submissions} contact form submission(s) across this site. This action CANNOT be undone.`,
    );
    if (!confirmation) return;

    setPurging(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/dashboard/compliance/data-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ email: deleteEmail }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error || "Failed to process data deletion request",
        );

      setSuccessMessage(
        `Successfully deleted GDPR/CCPA data for ${deleteEmail}!`,
      );
      setTimeout(() => setSuccessMessage(""), 4000);

      // Reset states
      setDeleteEmail("");
      setRecordCounts(null);

      // Refresh Deletion Audit Logs
      await fetchDeletionLogs();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setPurging(false);
    }
  };

  // Refresh Deletion Audit Logs List
  const fetchDeletionLogs = async () => {
    try {
      const res = await fetch("/api/dashboard/compliance/data-deletion", {
        headers: {
          "x-site-id": siteId,
        },
      });
      const json = await res.json();
      if (res.ok) {
        setDeletionLogs((json.data?.logs ?? json.logs) || []);
      }
    } catch (e) {
      console.error("Failed to load deletion logs:", e);
    }
  };

  // Refresh Consent Acceptance logs
  const handleRefreshConsentLogs = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/compliance/config`, {
        headers: {
          "x-site-id": siteId,
        },
      });
      const json = await res.json();
      if (res.ok) {
        const cfg = json.data?.config ?? json.config;
        setConsentLogs(cfg?.consentLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Filter Consent logs
  const filteredConsentLogs = useMemo(() => {
    return consentLogs.filter((log) => {
      const searchLower = logsSearch.toLowerCase();
      const matchSearch =
        !logsSearch ||
        log.visitorId.toLowerCase().includes(searchLower) ||
        (log.consentType &&
          log.consentType.toLowerCase().includes(searchLower));

      const matchFilter =
        logsFilter === "all" ||
        (logsFilter === "analytics" && log.consentType === "analytics") ||
        (logsFilter === "marketing" && log.consentType === "marketing") ||
        (logsFilter === "essential" && log.consentType === "essential") ||
        (logsFilter === "privacy" && log.consentType === "privacy");

      return matchSearch && matchFilter;
    });
  }, [consentLogs, logsSearch, logsFilter]);

  // Filter Deletion Audit logs
  const filteredDeletionLogs = useMemo(() => {
    return deletionLogs.filter((log) => {
      const query = deletionLogsSearch.toLowerCase();
      const targetEmail = log.meta?.targetEmail || "";
      const userEmail = log.user?.email || "";
      return (
        !query ||
        targetEmail.toLowerCase().includes(query) ||
        userEmail.toLowerCase().includes(query) ||
        log.id.toLowerCase().includes(query)
      );
    });
  }, [deletionLogs, deletionLogsSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl flex items-center gap-2">
          <Shield className="text-indigo-600" size={28} />
          Compliance & GDPR Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage privacy policies, visitor cookie consents, and customer GDPR
          deletion requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-nowrap w-full overflow-x-auto whitespace-nowrap border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("banner");
            setErrorMessage("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "banner"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          } flex items-center gap-1.5`}
        >
          <Cookie size={16} />
          Cookie Banner Config
        </button>

        <button
          onClick={() => {
            setActiveTab("logs");
            setErrorMessage("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          } flex items-center gap-1.5`}
        >
          <ClipboardList size={16} />
          Privacy Consent Logs
        </button>

        <button
          onClick={() => {
            setActiveTab("deletion");
            setErrorMessage("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "deletion"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          } flex items-center gap-1.5`}
        >
          <UserX size={16} />
          GDPR Data Deletion
        </button>
      </div>

      {/* Notifications banner */}
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
      {activeTab === "banner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings form */}
          <form
            onSubmit={handleSaveConfig}
            className="lg:col-span-2 border bg-white rounded-xl shadow-sm p-6 space-y-6"
          >
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
              <Settings size={16} className="text-gray-500" />
              Cookie Banner Properties
            </h3>

            {/* Banner Toggle Switch */}
            <div className="flex items-center justify-between p-3.5 border rounded-lg bg-gray-50/50">
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase">
                  Enable Cookie Consent Banner
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Show a consent pop-up to new visitors to record their
                  preference.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cookieConsentEnabled}
                  onChange={(e) => setCookieConsentEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Custom Banner Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 uppercase block">
                Banner Consent Message
              </label>
              <textarea
                value={cookieConsentMessage}
                onChange={(e) => setCookieConsentMessage(e.target.value)}
                placeholder="We use cookies to analyze user traffic and personalize advertising..."
                rows={3}
                required
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
              />
            </div>

            {/* Cookie Categories */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-800 uppercase block border-b pb-1">
                Consent Categories Offered
              </label>

              {/* Essential */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-indigo-50/10">
                <div className="flex items-start gap-2">
                  <Lock size={15} className="text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">
                      Essential / Strict Cookies
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Required for user sessions and secure login. Cannot be
                      turned off.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                  Always Required
                </span>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/30">
                <div className="flex items-start gap-2">
                  <Globe size={15} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">
                      Analytics & Performance
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Enable visitor counts, duration tracking, and general page
                      diagnostics.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={analyticsCookiesEnabled}
                    onChange={(e) =>
                      setAnalyticsCookiesEnabled(e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/30">
                <div className="flex items-start gap-2">
                  <Cookie
                    size={15}
                    className="text-green-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">
                      Marketing & Advertising
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Enable third-party script integrations for marketing and
                      custom remarketing campaigns.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={marketingCookiesEnabled}
                    onChange={(e) =>
                      setMarketingCookiesEnabled(e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Layout Positioning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 uppercase block">
                  Accept Button Label
                </label>
                <input
                  type="text"
                  value={acceptButtonText}
                  onChange={(e) => setAcceptButtonText(e.target.value)}
                  placeholder="Accept All"
                  required
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 uppercase block">
                  Decline Button Label
                </label>
                <input
                  type="text"
                  value={declineButtonText}
                  onChange={(e) => setDeclineButtonText(e.target.value)}
                  placeholder="Decline"
                  required
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 uppercase block">
                  Settings Button Label
                </label>
                <input
                  type="text"
                  value={settingsButtonText}
                  onChange={(e) => setSettingsButtonText(e.target.value)}
                  placeholder="Preferences"
                  required
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 shadow-sm w-full transition disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "Saving Changes..." : "Save Banner Preferences"}
            </button>
          </form>

          {/* Visual Preview Box */}
          <div className="border bg-slate-900 rounded-xl shadow-sm p-6 text-white space-y-4 h-fit sticky top-20">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              Live Banner Preview
            </h3>

            {cookieConsentEnabled ? (
              <div className="border border-slate-700 bg-slate-950/70 backdrop-blur rounded-lg p-4 space-y-3 shadow-lg text-[11px] relative">
                <div className="flex gap-2 items-start">
                  <Cookie
                    size={16}
                    className="text-indigo-400 shrink-0 mt-0.5"
                  />
                  <p className="text-slate-300 leading-relaxed">
                    {cookieConsentMessage || "Provide your consent message..."}
                  </p>
                </div>

                {/* Simulated Toggles inside preference selection */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[9px] text-slate-400">
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded flex items-center gap-1 font-bold">
                    <Check size={8} className="text-indigo-400" /> Essential
                  </span>
                  {analyticsCookiesEnabled && (
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded flex items-center gap-1 font-bold">
                      <Check size={8} className="text-indigo-400" /> Analytics
                    </span>
                  )}
                  {marketingCookiesEnabled && (
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded flex items-center gap-1 font-bold">
                      <Check size={8} className="text-indigo-400" /> Marketing
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-1">
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-transparent hover:bg-slate-800 border border-slate-800 font-bold text-slate-400 hover:text-slate-200"
                  >
                    {settingsButtonText}
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-slate-300"
                  >
                    {declineButtonText}
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-sm"
                  >
                    {acceptButtonText}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 italic text-xs">
                Cookie banner is currently disabled.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="border bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="border-b px-6 py-4 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Consent Acceptances Log
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">
                Tracks when anonymous visitors confirm their privacy
                preferences.
              </p>
            </div>
            <button
              onClick={handleRefreshConsentLogs}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-white text-gray-600 text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={saving ? "animate-spin" : ""} />
              Refresh Feed
            </button>
          </div>

          {/* Filtering */}
          <div className="border-b px-6 py-3 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                placeholder="Search logs by Visitor ID or type..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none w-full focus:border-indigo-600"
              />
            </div>
            <select
              value={logsFilter}
              onChange={(e) => setLogsFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none"
            >
              <option value="all">All consent types</option>
              <option value="essential">Essential Cookies</option>
              <option value="analytics">Analytics Cookies</option>
              <option value="marketing">Marketing Cookies</option>
              <option value="privacy">Privacy Preferences</option>
            </select>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-bold tracking-wider text-[10px]">
                  <th className="px-6 py-3">Visitor ID</th>
                  <th className="px-6 py-3">Consent Category</th>
                  <th className="px-6 py-3">Action Status</th>
                  <th className="px-6 py-3">Logged Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConsentLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50/30">
                    <td className="px-6 py-3 font-mono font-bold text-gray-800">
                      {log.visitorId}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                          log.consentType === "essential"
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : log.consentType === "analytics"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {log.consentType}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {log.accepted ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <Check size={14} /> Accepted
                        </span>
                      ) : (
                        <span className="text-gray-400 font-bold">
                          Declined
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(log.timestamp).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}

                {filteredConsentLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-16 text-center text-gray-400 italic"
                    >
                      No matching privacy consent logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "deletion" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Deletion requester form */}
          <div className="xl:col-span-1 border bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2.5 flex items-center gap-1.5">
              <UserX size={16} className="text-red-500" />
              GDPR / CCPA Request Execution
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              Compliance standards require that users can request total removal
              of their personal data. This utility purges all matching leads and
              contact submission entries associated with the entered email.
            </p>

            <form onSubmit={handleCheckCounts} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 uppercase block">
                  Target User Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={deleteEmail}
                    onChange={(e) => {
                      setDeleteEmail(e.target.value);
                      setRecordCounts(null);
                    }}
                    placeholder="user@example.com"
                    required
                    className="flex-1 text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    disabled={checkingCounts || purging}
                    className="px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs transition disabled:opacity-50 select-none cursor-pointer"
                  >
                    {checkingCounts ? "Querying..." : "Scan Data"}
                  </button>
                </div>
              </div>
            </form>

            {/* Scan Results Confirmation box */}
            {recordCounts && (
              <div className="border border-amber-100 bg-amber-50/20 rounded-xl p-4 space-y-4">
                <div className="flex gap-2 items-start text-xs text-amber-800 font-medium">
                  <AlertTriangle
                    size={16}
                    className="shrink-0 mt-0.5 text-amber-500"
                  />
                  <div>
                    <h4 className="font-bold text-amber-900">
                      Database Scan Results
                    </h4>
                    <p className="mt-0.5 text-[11px] text-amber-700 leading-normal">
                      Found matching records that will be permanently deleted
                      for <strong>{recordCounts.email || deleteEmail}</strong>:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 border rounded bg-white font-semibold">
                    <span className="block text-lg font-bold text-gray-900">
                      {recordCounts.leads}
                    </span>
                    Leads CRM entries
                  </div>
                  <div className="p-2 border rounded bg-white font-semibold">
                    <span className="block text-lg font-bold text-gray-900">
                      {recordCounts.submissions}
                    </span>
                    Contact form submissions
                  </div>
                  <div className="p-2 border rounded bg-white font-semibold">
                    <span className="block text-lg font-bold text-gray-900">
                      {recordCounts.newsletter}
                    </span>
                    Newsletter subscriptions
                  </div>
                </div>

                {recordCounts.total > 0 ? (
                  <button
                    onClick={handleExecuteDeletion}
                    disabled={purging}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 shadow-sm w-full transition disabled:opacity-50 select-none cursor-pointer"
                  >
                    <Trash2 size={14} />
                    {purging
                      ? "Purging User Data..."
                      : `Confirm & Delete ${recordCounts.total} Records`}
                  </button>
                ) : (
                  <div className="text-center text-[11px] text-green-600 font-bold p-1 bg-green-50 border border-green-100 rounded">
                    No active database entries found for this email.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit logs of previous deletions */}
          <div className="xl:col-span-2 border bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                GDPR Data Deletion Audit Log
              </h3>
            </div>

            <div className="border-b px-6 py-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={deletionLogsSearch}
                  onChange={(e) => setDeletionLogsSearch(e.target.value)}
                  placeholder="Search previous deletions by targets, user, or ID..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none w-full focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto text-xs text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3">Target Email</th>
                    <th className="px-6 py-3">Records Purged</th>
                    <th className="px-6 py-3">Executed By</th>
                    <th className="px-6 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDeletionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/30">
                      <td className="px-6 py-3 font-semibold text-gray-900">
                        {log.meta?.targetEmail || "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-500">
                          {(log.meta?.deletedLeadsCount || 0) +
                            (log.meta?.deletedSubmissionsCount || 0) +
                            (log.meta?.deletedNewsletterCount || 0)}{" "}
                          records
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          (Leads: {log.meta?.deletedLeadsCount || 0}, Forms:{" "}
                          {log.meta?.deletedSubmissionsCount || 0}, Newsletter:{" "}
                          {log.meta?.deletedNewsletterCount || 0})
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 font-medium">
                        {log.user?.email || "System"}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}

                  {filteredDeletionLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-16 text-center text-gray-400 italic"
                      >
                        No GDPR data deletion audit logs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

