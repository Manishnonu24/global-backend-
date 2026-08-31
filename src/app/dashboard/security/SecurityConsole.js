"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Shield,
  ShieldCheck,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  QrCode,
  RefreshCw,
  Sliders,
  Globe,
  Trash2,
  Plus,
  Save,
} from "lucide-react";

export default function SecurityConsole({ siteId, user }) {
  // Tabs: "password", "2fa", "history", "audit"
  const [activeTab, setActiveTab] = useState("password");
  const isAdmin =
    user?.globalRole === "SUPERADMIN" || user?.globalRole === "ADMIN";

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(user?.twoFAEnabled || false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState(1); // 1 = Off, 2 = Secret Generated
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaQrCode, setTwoFaQrCode] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaError, setTwoFaError] = useState(null);
  const [twoFaSuccess, setTwoFaSuccess] = useState(null);

  // Logs state
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Security Controls States
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState("");
  const [recaptchaSecretKey, setRecaptchaSecretKey] = useState("");
  const [rateLimitRps, setRateLimitRps] = useState(60);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [ipBlocklist, setIpBlocklist] = useState([]);
  const [newIpToBlock, setNewIpToBlock] = useState("");
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsSuccess, setControlsSuccess] = useState(null);
  const [controlsError, setControlsError] = useState(null);

  // Security audit states
  const [securityTesting, setSecurityTesting] = useState(false);
  const [securityResults, setSecurityResults] = useState(null);
  const [securityError, setSecurityError] = useState(null);

  const runSecurityAudit = async () => {
    setSecurityTesting(true);
    setSecurityError(null);
    try {
      const res = await fetch("/api/dashboard/security/audit", {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityResults(data.data || data);
      } else {
        throw new Error(data.error || "Failed to execute security audit scanner");
      }
    } catch (err) {
      setSecurityError(err.message);
    } finally {
      setSecurityTesting(false);
    }
  };

  // Fetch Security Controls Config
  const fetchSecurityControls = async () => {
    if (!isAdmin) return;
    setControlsLoading(true);
    setControlsError(null);
    try {
      const res = await fetch("/api/dashboard/security/config", {
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (res.ok) {
        setRecaptchaSiteKey(json.securityControls?.recaptchaSiteKey || "");
        setRecaptchaSecretKey(json.securityControls?.recaptchaSecretKey || "");
        setRateLimitRps(json.securityControls?.rateLimitRps || 60);
        setSessionTimeoutMinutes(
          json.securityControls?.sessionTimeoutMinutes || 30,
        );
        setIpBlocklist(json.securityControls?.ipBlocklist || []);
      }
    } catch (err) {
      setControlsError(err.message);
    } finally {
      setControlsLoading(false);
    }
  };

  // Save Security Controls Configuration
  const handleSaveControls = async (e) => {
    e.preventDefault();
    setControlsLoading(true);
    setControlsError(null);
    setControlsSuccess(null);
    try {
      const res = await fetch("/api/dashboard/security/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          recaptchaSiteKey,
          recaptchaSecretKey,
          rateLimitRps: parseInt(rateLimitRps, 10) || 60,
          sessionTimeoutMinutes: parseInt(sessionTimeoutMinutes, 10) || 30,
          ipBlocklist,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update security controls");
      setControlsSuccess("Security configurations saved successfully!");
      if (json.securityControls?.recaptchaSecretKey) {
        setRecaptchaSecretKey(json.securityControls.recaptchaSecretKey);
      }
      setTimeout(() => setControlsSuccess(null), 3500);
    } catch (err) {
      setControlsError(err.message);
    } finally {
      setControlsLoading(false);
    }
  };

  // Block a single IP Address
  const handleBlockIp = async (e) => {
    e.preventDefault();
    if (!newIpToBlock) return;

    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex =
      /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?$/;

    if (!ipv4Regex.test(newIpToBlock) && !ipv6Regex.test(newIpToBlock)) {
      setControlsError(
        "Invalid IP address format. Please enter a valid IPv4 or IPv6 address.",
      );
      return;
    }

    setControlsLoading(true);
    setControlsError(null);
    setControlsSuccess(null);
    try {
      const res = await fetch("/api/dashboard/security/ip-block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ ip: newIpToBlock }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to block IP");
      setIpBlocklist(json.ipBlocklist || []);
      setNewIpToBlock("");
      setControlsSuccess(`IP Address ${newIpToBlock} blocked successfully.`);
      setTimeout(() => setControlsSuccess(null), 3000);
    } catch (err) {
      setControlsError(err.message);
    } finally {
      setControlsLoading(false);
    }
  };

  // Unblock a single IP Address
  const handleUnblockIp = async (ipToUnblock) => {
    setControlsLoading(true);
    setControlsError(null);
    setControlsSuccess(null);
    try {
      const res = await fetch(
        `/api/dashboard/security/ip-block?ip=${ipToUnblock}`,
        {
          method: "DELETE",
          headers: {
            "x-site-id": siteId,
          },
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to unblock IP");
      setIpBlocklist(json.ipBlocklist || []);
      setControlsSuccess(`IP Address ${ipToUnblock} unblocked successfully.`);
      setTimeout(() => setControlsSuccess(null), 3000);
    } catch (err) {
      setControlsError(err.message);
    } finally {
      setControlsLoading(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update password");
      }

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Generate 2FA Secret
  const handleStart2Fa = async () => {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST" });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to generate 2FA secret");

      const payload = json.data || json;
      setTwoFaSecret(payload.secret);
      setTwoFaQrCode(payload.qrCode || "");
      setTwoFaStep(2);
    } catch (err) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Verify and Enable 2FA
  const handleVerify2Fa = async (e) => {
    e.preventDefault();
    setTwoFaLoading(true);
    setTwoFaError(null);
    setTwoFaSuccess(null);

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFaToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verification failed");

      setTwoFaEnabled(true);
      setTwoFaSuccess("Two-Factor Authentication is now enabled!");
      setTwoFaStep(1);
      setTwoFaSecret("");
      setTwoFaToken("");
    } catch (err) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Fetch Login History
  const fetchLoginHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/dashboard/security/login-history", {
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (res.ok) {
        setLoginHistory(json.data?.loginHistory || json.loginHistory || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    setAuditLoading(true);
    try {
      const res = await fetch("/api/dashboard/security/audit-logs", {
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (res.ok) {
        setAuditLogs(json.data?.auditLogs ?? (json.auditLogs || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Load appropriate data when tab changes
  useEffect(() => {
    if (activeTab === "history") {
      fetchLoginHistory();
    } else if (activeTab === "audit" && isAdmin) {
      fetchAuditLogs();
    } else if (activeTab === "controls" && isAdmin) {
      fetchSecurityControls();
    }
  }, [activeTab]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-fit space-y-1">
        <button
          onClick={() => setActiveTab("password")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "password"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Lock size={16} />
          Change Password
        </button>

        <button
          onClick={() => setActiveTab("2fa")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "2fa"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <ShieldCheck size={16} />
          Two-Factor Auth (2FA)
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
            activeTab === "history"
              ? "bg-blue-50 text-blue-600 border border-blue-100"
              : "text-gray-600 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <History size={16} />
          Login History
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
                activeTab === "audit"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-gray-600 hover:bg-gray-50 border border-transparent"
              }`}
            >
              <FileText size={16} />
              System Audit Logs
            </button>

            <button
              onClick={() => setActiveTab("controls")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
                activeTab === "controls"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-gray-600 hover:bg-gray-50 border border-transparent"
              }`}
            >
              <Sliders size={16} />
              Security Controls
            </button>

            <button
              onClick={() => setActiveTab("auditScanner")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition text-left ${
                activeTab === "auditScanner"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-gray-600 hover:bg-gray-50 border border-transparent"
              }`}
            >
              <Shield size={16} />
              OWASP Security Audit
            </button>
          </>
        )}
      </div>

      {/* Main Console Content */}
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[400px]">
        {/* Change Password Tab */}
        {activeTab === "password" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <KeyRound size={20} className="text-blue-600" />
                Change Account Password
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Keep your credentials secure. It is recommended to choose a
                strong password.
              </p>
            </div>

            {passwordError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertCircle className="shrink-0 animate-bounce" size={18} />
                <p className="font-medium">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
                <CheckCircle2 className="shrink-0" size={18} />
                <p className="font-medium">{passwordSuccess}</p>
              </div>
            )}

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 max-w-md pt-2"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {passwordLoading ? "Saving..." : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* Two-Factor Auth Tab */}
        {activeTab === "2fa" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Two-Factor Authentication (2FA)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Protect your account by adding an extra layer of security.
              </p>
            </div>

            {twoFaError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertCircle className="shrink-0" size={18} />
                <p className="font-medium">{twoFaError}</p>
              </div>
            )}

            {twoFaSuccess && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
                <CheckCircle2 className="shrink-0" size={18} />
                <p className="font-medium">{twoFaSuccess}</p>
              </div>
            )}

            {twoFaEnabled ? (
              <div className="bg-green-50/50 border border-green-200 rounded-xl p-5 max-w-xl space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <ShieldCheck size={20} />
                  2FA Protection is Enabled
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your login sessions are secured with Two-Factor
                  authentication. Every sign-in request will demand your OTP
                  token from your mobile authenticator app.
                </p>
              </div>
            ) : (
              <div className="max-w-xl space-y-4">
                {twoFaStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Two-Factor authentication is currently{" "}
                      <strong>disabled</strong> on your profile. Enroll to add
                      high-security multi-factor validation.
                    </p>
                    <button
                      onClick={handleStart2Fa}
                      disabled={twoFaLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      {twoFaLoading ? "Generating Setup..." : "Begin 2FA Setup"}
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleVerify2Fa}
                    className="space-y-5 border p-5 rounded-xl bg-gray-50/50"
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                      <QrCode size={18} className="text-blue-600" />
                      Step 1: Scan Authenticator Setup Code
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-gray-650 leading-relaxed">
                        Scan this QR code using Google Authenticator, Microsoft
                        Authenticator, or 1Password:
                      </p>

                      {twoFaQrCode && (
                        <div className="flex justify-center p-3 bg-white border rounded-xl w-fit mx-auto shadow-sm">
                          <img
                            src={twoFaQrCode}
                            alt="2FA enrollment QR code"
                            className="w-36 h-36"
                          />
                        </div>
                      )}

                      <p className="text-xs text-gray-600">
                        Or enter the configuration key manually:
                      </p>
                      <div className="p-3 bg-white border font-mono rounded text-xs select-all text-gray-800 flex justify-between items-start gap-2">
                        <span className="break-all">{twoFaSecret}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-sans uppercase font-semibold shrink-0 mt-0.5">
                          Base32 Key
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                        <ShieldCheck size={18} className="text-blue-600" />
                        Step 2: Enter Verification Code
                      </div>
                      <p className="text-xs text-gray-600">
                        Input the 6-digit verification code generated by your
                        app:
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={twoFaToken}
                          onChange={(e) => setTwoFaToken(e.target.value)}
                          className="rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono tracking-widest w-36 text-center"
                        />
                        <button
                          type="submit"
                          disabled={twoFaLoading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition whitespace-nowrap"
                        >
                          {twoFaLoading
                            ? "Verifying..."
                            : "Verify & Enable 2FA"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Login History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History size={20} className="text-blue-600" />
                  Recent Login History
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Check active sign-ins to verify login integrity.
                </p>
              </div>

              <button
                onClick={fetchLoginHistory}
                disabled={historyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold text-gray-600 transition"
              >
                <RefreshCw
                  size={12}
                  className={historyLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading history logs...
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">User Agent / Browser</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {loginHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {log.user?.email}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {log.ipAddress || "unknown"}
                        </td>
                        <td
                          className="px-4 py-3 truncate max-w-[200px]"
                          title={log.userAgent}
                        >
                          {log.userAgent || "unknown"}
                        </td>
                        <td className="px-4 py-3">
                          {log.success ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(log.createdAt).toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                    {loginHistory.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          No login attempts recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Global Audit Logs Tab */}
        {activeTab === "audit" && isAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  System Activity & Audit Logs
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Full security log tracing actions across pages, users,
                  backups, and settings.
                </p>
              </div>

              <button
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold text-gray-600 transition"
              >
                <RefreshCw
                  size={12}
                  className={auditLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {auditLoading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading audit history...
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Responsible User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Logged Action</th>
                      <th className="px-4 py-3">Action Details (JSON)</th>
                      <th className="px-4 py-3">Event Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {log.user?.email || "unknown"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 uppercase text-[10px] tracking-wide">
                          {log.user?.globalRole || "VIEWER"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {log.action}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-[10px] text-gray-500 max-w-[250px] truncate"
                          title={JSON.stringify(log.meta)}
                        >
                          {log.meta ? JSON.stringify(log.meta) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(log.createdAt).toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          No audit activities recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Security Controls Tab */}
        {activeTab === "controls" && isAdmin && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Global Security Controls Configuration
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure Google reCAPTCHA integrations, global request rate
                limiting rules, session timeout conditions, and network IP
                blocking filters.
              </p>
            </div>

            {controlsError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertCircle className="shrink-0" size={18} />
                <p className="font-medium">{controlsError}</p>
              </div>
            )}

            {controlsSuccess && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm animate-in fade-in duration-150">
                <CheckCircle2 className="shrink-0" size={18} />
                <p className="font-medium">{controlsSuccess}</p>
              </div>
            )}

            {controlsLoading && !recaptchaSiteKey && !rateLimitRps ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading configurations...
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Left Columns: Config Form */}
                <form
                  onSubmit={handleSaveControls}
                  className="xl:col-span-2 space-y-6"
                >
                  {/* Rate Limits & Timeout Card */}
                  <div className="border p-5 rounded-xl space-y-4 bg-gray-50/20">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Sliders size={14} className="text-blue-600" />
                      Rate Limiting & Session Rules
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          API Rate Limit Threshold (RPS)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="1000"
                          value={rateLimitRps}
                          onChange={(e) => setRateLimitRps(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                        />
                        <p className="text-[9px] text-gray-400 mt-1">
                          Maximum allowed requests per second per client IP
                          address.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Session Inactivity Timeout (Minutes)
                        </label>
                        <input
                          type="number"
                          required
                          min="5"
                          max="1440"
                          value={sessionTimeoutMinutes}
                          onChange={(e) =>
                            setSessionTimeoutMinutes(e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                        />
                        <p className="text-[9px] text-gray-400 mt-1">
                          Automatically logs out inactive user sessions after
                          this window.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* reCAPTCHA setup */}
                  <div className="border p-5 rounded-xl space-y-4 bg-gray-50/20">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Lock size={14} className="text-blue-600" />
                      Google reCAPTCHA Integration
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          reCAPTCHA Site Key
                        </label>
                        <input
                          type="text"
                          value={recaptchaSiteKey}
                          onChange={(e) => setRecaptchaSiteKey(e.target.value)}
                          placeholder="e.g. 6LeIxAcTAAAAAJcZVRqyhFYlk8ppGJN..."
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:border-blue-600 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          reCAPTCHA Secret Key
                        </label>
                        <input
                          type="password"
                          value={recaptchaSecretKey}
                          onChange={(e) =>
                            setRecaptchaSecretKey(e.target.value)
                          }
                          placeholder="Provide secret key or '********' to retain current key"
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:border-blue-600 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={controlsLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save size={13} />
                    Save Security Controls
                  </button>
                </form>

                {/* Right Columns: IP Blocking Panel */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Block IP Form */}
                  <form
                    onSubmit={handleBlockIp}
                    className="border p-5 rounded-xl space-y-4 bg-gray-50/20"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Globe size={14} className="text-blue-600" />
                      Block Network IP
                    </h3>

                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Enter an IPv4 or IPv6 network address to immediately
                        blacklist and restrict site routing access.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newIpToBlock}
                          onChange={(e) => setNewIpToBlock(e.target.value)}
                          placeholder="e.g. 192.168.1.100"
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:border-blue-600 text-xs font-mono"
                        />
                        <button
                          type="submit"
                          disabled={controlsLoading}
                          className="px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 border-0 outline-none"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Active Blocklist */}
                  <div className="border p-5 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-xs text-gray-700 border-b pb-1">
                      Active IP Blocklist ({ipBlocklist.length})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {ipBlocklist.map((ip) => (
                        <div
                          key={ip}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-150"
                        >
                          <span className="font-mono text-xs text-gray-800 select-all">
                            {ip}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnblockIp(ip)}
                            disabled={controlsLoading}
                            className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                            title="Unblock IP"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {ipBlocklist.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic text-center py-4">
                          No blocked IP addresses.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Security Audit Scanner */}
        {activeTab === "auditScanner" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield size={20} className="text-blue-600" />
                  OWASP Top 10 Security Scanner
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Run simulated penetration testing and vulnerability checks to audit access controls and input validations.
                </p>
              </div>

              <button
                onClick={runSecurityAudit}
                disabled={securityTesting}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                <RefreshCw
                  size={14}
                  className={securityTesting ? "animate-spin" : ""}
                />
                {securityTesting ? "Scanning..." : "Run Security Audit"}
              </button>
            </div>

            {securityError && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                <AlertCircle className="shrink-0" size={18} />
                <p>{securityError}</p>
              </div>
            )}

            {securityTesting && !securityResults && (
              <div className="py-16 text-center space-y-3">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" />
                <p className="text-sm text-gray-500 font-medium">Scanning authentication endpoints, parameter validation, and security headers...</p>
              </div>
            )}

            {securityResults ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Security Score</span>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">{securityResults.securityScore}%</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Passed Checks</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">{securityResults.passedChecks} / {securityResults.totalChecks}</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Vulnerabilities Detected</span>
                    <div className="text-2xl font-extrabold text-red-600 mt-1">
                      {securityResults.checks.filter(c => c.status === "FAILED").length}
                    </div>
                  </div>
                  <div className="p-4 border rounded-xl bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Warnings</span>
                    <div className="text-2xl font-extrabold text-amber-500 mt-1">
                      {securityResults.checks.filter(c => c.status === "WARNING").length}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Audit Check Checklist</h3>
                  <div className="space-y-2.5">
                    {securityResults.checks?.map((check) => (
                      <div key={check.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 transition space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase shrink-0 ${
                            check.status === "PASSED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : (check.status === "WARNING" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-rose-50 text-rose-200")
                          }`}>
                            {check.status}
                          </span>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{check.name}</div>
                        </div>
                        <div className="pl-0.5 space-y-0.5">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{check.description}</p>
                          {check.status !== "PASSED" && (
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                              <span>💡 Recommendation:</span> {check.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              !securityTesting && (
                <div className="py-12 text-center text-xs text-gray-400 italic">
                  Press "Run Security Audit" to execute simulated vulnerability checks.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

