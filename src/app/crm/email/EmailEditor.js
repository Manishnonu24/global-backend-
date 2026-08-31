"use client";

import { useState } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Send,
  Clock,
  Inbox,
  Trash2,
  HelpCircle,
} from "lucide-react";

// Custom inline SVGs for layout styling to ensure compatibility across lucide-react versions
function ServerIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
      <line x1="6" y1="6" x2="6.01" y2="6"></line>
      <line x1="6" y1="18" x2="6.01" y2="18"></line>
    </svg>
  );
}

function BellRingIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

export default function EmailEditor({ siteId, initialEmailSettings }) {
  const [activeTab, setActiveTab] = useState("smtp");

  const [host, setHost] = useState(initialEmailSettings?.host || "");
  const [port, setPort] = useState(initialEmailSettings?.port || "587");
  const [username, setUsername] = useState(
    initialEmailSettings?.username || "",
  );
  const [password, setPassword] = useState(
    initialEmailSettings?.password || "",
  );
  const [formEmail, setFormEmail] = useState(
    initialEmailSettings?.formEmail || "",
  );
  const [provider, setProvider] = useState(
    initialEmailSettings?.provider || "resend",
  );
  const [resendApiKey, setResendApiKey] = useState(
    initialEmailSettings?.resendApiKey || "",
  );
  const [sendgridApiKey, setSendgridApiKey] = useState(
    initialEmailSettings?.sendgridApiKey || "",
  );

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(
    initialEmailSettings?.autoReplyTemplate?.enabled !== false,
  );
  const [autoReplySubject, setAutoReplySubject] = useState(
    initialEmailSettings?.autoReplyTemplate?.subject ||
      "Thanks for reaching out, {name}!",
  );
  const [autoReplyBody, setAutoReplyBody] = useState(
    initialEmailSettings?.autoReplyTemplate?.body ||
      "Hi {name},\n\nThank you for contacting us. We'll get back to you within 24 hours.\n\nBest regards,\n{siteName}",
  );

  const [adminAlertsEnabled, setAdminAlertsEnabled] = useState(
    initialEmailSettings?.adminAlerts?.enabled !== false,
  );
  const [adminAlertsEmail, setAdminAlertsEmail] = useState(
    initialEmailSettings?.adminAlerts?.email || "",
  );

  const [prAlertsEnabled, setPrAlertsEnabled] = useState(
    initialEmailSettings?.prAlerts?.enabled !== false,
  );
  const [prEmail, setPrEmail] = useState(
    initialEmailSettings?.prAlerts?.email || "",
  );

  const [failedLogs, setFailedLogs] = useState(
    initialEmailSettings?.failedLogs || [],
  );

  // Novu / Push Notifications
  const [novuWorkflowId, setNovuWorkflowId] = useState(
    initialEmailSettings?.novuWorkflowId || "",
  );
  const [novuApiKey, setNovuApiKey] = useState(
    initialEmailSettings?.novuApiKey || "",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const emailSettingsPayload = {
      provider,
      host,
      port,
      username,
      password,
      formEmail,
      resendApiKey,
      sendgridApiKey,
      autoReplyTemplate: {
        enabled: autoReplyEnabled,
        subject: autoReplySubject,
        body: autoReplyBody,
      },
      adminAlerts: {
        enabled: adminAlertsEnabled,
        email: adminAlertsEmail,
      },
      prAlerts: {
        enabled: prAlertsEnabled,
        email: prEmail,
      },
      novuWorkflowId,
      novuApiKey,
    };

    try {
      const res = await fetch("/api/dashboard/email/smtp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(emailSettingsPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save SMTP configuration");
      }

      setMessage({
        type: "success",
        text: "Email configurations and templates updated successfully!",
      });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTesting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/email/smtp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "SMTP verification failed",
        );
      }

      // Re-fetch failed logs in case a log occurred before succeeding or during trial
      const logRes = await fetch(`/api/dashboard/email/failed-logs`, {
        headers: { "x-site-id": siteId },
      });
      if (logRes.ok) {
        const logData = await logRes.json();
        setFailedLogs((logData.data?.failedLogs ?? logData.failedLogs) || []);
      }

      const successMsg = data.data?.message || data.message || "Email connection verified & test email sent successfully!";
      setMessage({ type: "success", text: `Success: ${successMsg}` });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({
        type: "error",
        text: `Email Test Failed: ${err.message}. Please save your correct settings first.`,
      });

      // Sync failed logs
      const logRes = await fetch(`/api/dashboard/email/failed-logs`, {
        headers: { "x-site-id": siteId },
      });
      if (logRes.ok) {
        const logData = await logRes.json();
        setFailedLogs((logData.data?.failedLogs ?? logData.failedLogs) || []);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to purge all failed email logs?"))
      return;

    setIsClearing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/email/failed-logs", {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clear logs");
      }

      setFailedLogs([]);
      setMessage({
        type: "success",
        text: "Failed email logs cleared successfully",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Action Messages */}
      {message && (
        <div
          className={`p-4 border-l-4 rounded-lg flex items-start gap-3 shadow-xs animate-in fade-in duration-200 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
              : "bg-red-50 border-red-500 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider">
              {message.type === "success" ? "Success" : "Configuration Alert"}
            </p>
            <p className="text-xs">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Configurations Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-115 flex flex-col justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-gray-200 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("smtp")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === "smtp"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            <ServerIcon className="w-4 h-4" />
            Email Provider & Server Setup
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === "templates"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            <BellRingIcon className="w-4 h-4" />
            Auto-Reply & Alerts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Failed Email Logs
            {failedLogs.length > 0 && (
              <span className="bg-red-100 text-red-600 font-bold px-1.8 py-0.2 rounded-full text-[9px] border border-red-200">
                {failedLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("push")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === "push"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            <BellRingIcon className="w-4 h-4" />
            Push Notifications
            {novuWorkflowId && (
              <span className="bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full text-[9px] border border-emerald-200">
                ON
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1">
          {/* TAB 1: Email Provider Configuration */}
          {activeTab === "smtp" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Email Provider Settings
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose your email provider and configure credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={isTesting || isSubmitting}
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-200 text-xs shadow-xs transition disabled:opacity-50"
                >
                  <Send size={12} />
                  {isTesting ? "Testing Connection..." : "Test Connection"}
                </button>
              </div>

              {/* Provider Toggle */}
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Email Provider
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setProvider("smtp")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                      provider === "smtp"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    SMTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("resend")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                      provider === "resend"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("sendgrid")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                      provider === "sendgrid"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    SendGrid
                  </button>
                </div>
              </div>

              {/* SMTP Fields - shown only when provider is smtp */}
              {provider === "smtp" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SMTP Host */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="smtp_host"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      SMTP Hostname / Address
                    </label>
                    <input
                      type="text"
                      id="smtp_host"
                      required={provider === "smtp"}
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com or mail.yourdomain.com"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  {/* SMTP Port */}
                  <div>
                    <label
                      htmlFor="smtp_port"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      SMTP Port
                    </label>
                    <input
                      type="text"
                      id="smtp_port"
                      required={provider === "smtp"}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="e.g. 587, 465, or 25"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label
                      htmlFor="smtp_user"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      SMTP Username / Login
                    </label>
                    <input
                      type="text"
                      id="smtp_user"
                      required={provider === "smtp"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. user@yourdomain.com"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="smtp_pass"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      id="smtp_pass"
                      required={provider === "smtp"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Provide SMTP Password"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Resend Field - shown only when provider is resend */}
              {provider === "resend" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="resend_api_key"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      Resend API Key
                    </label>
                    <input
                      type="password"
                      id="resend_api_key"
                      required={provider === "resend"}
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Enter your Resend API key from the Resend dashboard.
                    </p>
                  </div>
                </div>
              )}

              {/* SendGrid Field - shown only when provider is sendgrid */}
              {provider === "sendgrid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="sendgrid_api_key"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      SendGrid API Key
                    </label>
                    <input
                      type="password"
                      id="sendgrid_api_key"
                      required={provider === "sendgrid"}
                      value={sendgridApiKey}
                      onChange={(e) => setSendgridApiKey(e.target.value)}
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Enter your SendGrid API key from the SendGrid Settings dashboard.
                    </p>
                  </div>
                </div>
              )}

              {/* Sender Email - shown for both providers */}
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="form_email"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                    >
                      Sender / "From" Email
                    </label>
                    <input
                      type="email"
                      id="form_email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. no-reply@yourcompany.com"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      This email address will appear as the sender for all
                      outgoing emails.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Auto-Reply Templates & Admin Notification Alerts */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              {/* Form Email Auto Reply Card */}
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Form Email Auto-Reply
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Auto-respond to visitors when they submit contact form
                        inquiries.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReplyEnabled}
                      onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {autoReplyEnabled && (
                  <div className="space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div>
                      <label
                        htmlFor="reply_subject"
                        className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between"
                      >
                        <span>Email Subject Line</span>
                        <span className="normal-case text-[9px] font-normal text-gray-400">
                          Use {"{name}"} for customer name
                        </span>
                      </label>
                      <input
                        type="text"
                        id="reply_subject"
                        value={autoReplySubject}
                        onChange={(e) => setAutoReplySubject(e.target.value)}
                        placeholder="e.g. Thank you for reaching out, {name}!"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="reply_body"
                        className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between"
                      >
                        <span>Email Body Message</span>
                        <span className="normal-case text-[9px] font-normal text-gray-400">
                          Placeholders: {"{name}"}, {"{siteName}"}
                        </span>
                      </label>
                      <textarea
                        id="reply_body"
                        value={autoReplyBody}
                        onChange={(e) => setAutoReplyBody(e.target.value)}
                        rows={4}
                        placeholder={`Hi {name},\n\nThank you for getting in touch. We have received your submission and will get back to you soon.\n\nBest regards,\nThe {siteName} Team`}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Alerts Configuration Card */}
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <BellRingIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Admin Notification Alerts
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Alert administrators instantly when leads register or
                        submit contact forms.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminAlertsEnabled}
                      onChange={(e) => setAdminAlertsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {adminAlertsEnabled && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                    <label
                      htmlFor="admin_email"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5"
                    >
                      Target Administrator Email
                    </label>
                    <input
                      type="email"
                      id="admin_email"
                      required={adminAlertsEnabled}
                      value={adminAlertsEmail}
                      onChange={(e) => setAdminAlertsEmail(e.target.value)}
                      placeholder="e.g. admin@company.com"
                      className="w-full max-w-md px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* PR & Media alerts Configuration Card */}
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <BellRingIcon className="w-5 h-5 text-teal-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        PR &amp; Media Booking Alerts
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Trigger automated notifications to your PR team when media packages are booked.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prAlertsEnabled}
                      onChange={(e) => setPrAlertsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {prAlertsEnabled && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                    <label
                      htmlFor="pr_email"
                      className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5"
                    >
                      Target PR Team Email Address
                    </label>
                    <input
                      type="email"
                      id="pr_email"
                      required={prAlertsEnabled}
                      value={prEmail}
                      onChange={(e) => setPrEmail(e.target.value)}
                      placeholder="e.g. pr-team@company.com"
                      className="w-full max-w-md px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Failed Email Logs */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Failed Email Delivery Logs
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Review SMTP connection issues and alert failures (last 50
                    logs).
                  </p>
                </div>

                {failedLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    disabled={isClearing}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-755 font-bold px-3 py-1.5 rounded-lg border border-red-205 text-xs shadow-xs transition disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {isClearing ? "Purging..." : "Clear Logs"}
                  </button>
                )}
              </div>

              {/* Logs Content list */}
              <div className="border border-gray-200 rounded-xl bg-gray-50/20 max-h-90 overflow-auto">
                <table className="w-full min-w-125 text-left border-collapse text-xs">
                  <thead className="bg-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[9px] border-b">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Target / To</th>
                      <th className="p-3">Context</th>
                      <th className="p-3">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {failedLogs.map((log, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-white transition-colors"
                      >
                        <td className="p-3 text-gray-400 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="p-3 font-semibold text-gray-700 font-mono">
                          {log.to || "N/A"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${
                              log.context === "admin-alert"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}
                          >
                            {log.context || "smtp-test"}
                          </span>
                        </td>
                        <td className="p-3 text-red-650 font-mono leading-relaxed select-all break-all">
                          {log.error}
                        </td>
                      </tr>
                    ))}
                    {failedLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-12 text-gray-400 italic"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            <span>
                              No SMTP transmission failures found. Outbox
                              deliveries are running cleanly!
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Push Notifications (Novu) */}
          {activeTab === "push" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Novu Notification Settings
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Configure your Novu credentials to enable push and device campaigns from the CRM.
                </p>
              </div>

              {/* Connection Status */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                novuWorkflowId
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${novuWorkflowId ? "text-emerald-500" : "text-amber-400"}`} />
                <div>
                  <p className="text-xs font-bold">
                    {novuWorkflowId ? "Novu Connected" : "Novu Not Configured"}
                  </p>
                  <p className="text-[10px] mt-0.5 opacity-80">
                    {novuWorkflowId
                      ? "Your Workflow ID is saved. Notifications are ready to send from the CRM."
                      : "Enter your Workflow ID and Secret API key below, then click Save Settings."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Workflow ID */}
                <div>
                  <label
                    htmlFor="novu_workflow_id"
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                  >
                    Novu Workflow ID
                  </label>
                  <input
                    type="text"
                    id="novu_workflow_id"
                    value={novuWorkflowId}
                    onChange={(e) => setNovuWorkflowId(e.target.value)}
                    placeholder="Your Novu Workflow Identifier (e.g., push-notification)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Found in your Novu Dashboard under Workflows</p>
                </div>

                {/* Secret API Key */}
                <div>
                  <label
                    htmlFor="novu_api_key"
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2"
                  >
                    Secret API Key
                  </label>
                  <input
                    type="password"
                    id="novu_api_key"
                    value={novuApiKey}
                    onChange={(e) => setNovuApiKey(e.target.value)}
                    placeholder={initialEmailSettings?.novuApiKey ? "••••••••••••••••" : "Your Novu Secret API Key"}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Required to authenticate and trigger notifications server-side.</p>
                </div>
              </div>

              {/* Setup Guide */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Quick Setup Guide</h4>
                {[
                  { n: 1, t: "Sign up at dashboard.novu.co", d: "Create a Novu account and retrieve your Secret API Key and Workflow ID." },
                  { n: 2, t: "Get your Novu credentials", d: "Go to Settings → API Keys in your Novu dashboard and copy your Workflow ID and Secret API Key." },
                  { n: 3, t: "Configure your Push Workflow", d: "Publish your push notification workflow in Novu (e.g. push-notificatuion)." },
                  { n: 4, t: "Paste credentials & save", d: "Enter the Novu Workflow ID and Secret Key above, then click 'Save Settings' at the bottom." },
                ].map(({ n, t, d }) => (
                  <div key={n} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                    <div>
                      <p className="text-xs font-bold text-blue-800">{t}</p>
                      <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">{d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                Changes to push credentials take effect after clicking <strong>Save Settings</strong> below. You can also configure and send push campaigns from <strong>CRM → Marketing → Push Notifications</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions Bar */}
        {activeTab !== "logs" && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              {activeTab === "push"
                ? "Novu credentials are saved securely alongside your email settings."
                : "Ensure credentials match outbound security policies (TLS 587 or SSL 465)."}
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition border-0 outline-none cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving Config..." : "Save Settings"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
