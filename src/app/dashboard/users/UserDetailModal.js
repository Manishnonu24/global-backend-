// src/app/(dashboard)/users/UserDetailModal.js
"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { 
  User, 
  KeyRound, 
  Activity, 
  History, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle,
  Save,
  X
} from "lucide-react";

export default function UserDetailModal({ userId }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [role, setRole] = useState("EDITOR");
  const [isActive, setIsActive] = useState(true);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  // Password reset states
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);

  // Active tab: "profile" | "password" | "activity" | "login"
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch user details
  useEffect(() => {
    let active = true;
    if (!open) return;
    fetch(`/api/dashboard/users/${userId}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json.user) {
          setUser(json.user);
          setRole(json.user.globalRole || "EDITOR");
          setIsActive(Boolean(json.user.isActive));
          setTwoFaEnabled(Boolean(json.user.twoFAEnabled));
          setName(json.user.name || "");
          setBio(json.user.bio || "");
        }
      })
      .catch((e) => {
        console.error(e);
        if (active) setError("Failed to load user details");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [open, userId]);

  // Save profile and roles
  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalRole: role, isActive, name, bio }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update profile settings");
      }
      setSuccess("Profile settings updated successfully!");
      setTimeout(() => {
        setSuccess(null);
        // reload the list view page to show the changes
        window.location.reload();
      }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Administrative override to force disable 2FA
  const handleDisable2Fa = async () => {
    if (!confirm("Are you sure you want to FORCE DISABLE 2FA for this user? This will delete their authentication secret.")) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFAEnabled: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to disable 2FA");
      }
      setTwoFaEnabled(false);
      setSuccess("Two-Factor Authentication has been disabled for this user.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Generate random strong password
  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setResetSuccessMessage(null);
  };

  // Custom password reset save handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setSaving(true);
    setError(null);
    setResetSuccessMessage(null);
    try {
      const res = await fetch(`/api/dashboard/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to reset password");
      }
      setResetSuccessMessage(`Password has been successfully changed to:`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy password to clipboard helper
  const handleCopy = async () => {
    if (!newPassword) return;
    const success = await copyToClipboard(newPassword);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-semibold shadow-sm transition"
        onClick={() => setOpen(true)}
      >
        Manage
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 md:pt-20">
          {/* Backdrop screen */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border">
            {/* Header info */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div>
                <h3 className="dash-section-title text-slate-900 dark:text-slate-100 uppercase tracking-wider">User Console</h3>
                <p className="dash-caption font-medium mt-0.5">
                  {user ? user.email : "Loading details..."}
                </p>
              </div>
              <button
                className="p-1 rounded-lg hover:bg-gray-250 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab layout controls */}
            <div className="flex bg-gray-50/50 border-b px-4 text-xs font-bold text-gray-500 overflow-x-auto">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "profile"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-gray-800"
                }`}
              >
                <User size={14} />
                Access & Roles
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "password"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-gray-800"
                }`}
              >
                <KeyRound size={14} />
                Credentials Reset
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "activity"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-gray-800"
                }`}
              >
                <Activity size={14} />
                Activity Log
              </button>
              <button
                onClick={() => setActiveTab("login")}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "login"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-gray-800"
                }`}
              >
                <History size={14} />
                Login History
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
              {loading ? (
                <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-gray-300" />
                  Loading user records...
                </div>
              ) : error ? (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="shrink-0" size={16} />
                  <p>{error}</p>
                </div>
              ) : user ? (
                <div className="space-y-4">
                  {success && (
                    <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold">
                      <Check className="shrink-0" size={16} />
                      <p>{success}</p>
                    </div>
                  )}

                  {/* TAB 1: Profile and Roles */}
                  {activeTab === "profile" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                            Email Identifier
                          </label>
                          <input
                            type="text"
                            disabled
                            value={user.email}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-gray-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                            System Access Role
                          </label>
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-600"
                          >
                            <option value="SUPERADMIN">SUPERADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="AUTHOR">AUTHOR</option>
                            <option value="MARKETING">MARKETING</option>
                            <option value="VISITOR">VISITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                          <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-600"
                            placeholder="e.g. Altaf Raza"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                          Author Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-600"
                          placeholder="Write a brief professional bio..."
                        />
                      </div>

                      <div className="border-t pt-4">
                        <label className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Account Status Active</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Disabled users are blocked from signing in or requesting credentials reset.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 h-4 w-4 focus:ring-teal-500 cursor-pointer shrink-0"
                          />
                        </label>
                      </div>

                      {/* 2FA Administrative Status Control */}
                      <div className="border-t pt-4 space-y-2">
                        <label className="dash-caption font-bold uppercase tracking-wider block">
                          Two-Factor Authentication Controls
                        </label>
                        {twoFaEnabled ? (
                          <div className="border border-teal-200 bg-teal-50/40 dark:bg-teal-950/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex gap-2.5 items-start">
                              <Lock className="text-teal-600 mt-0.5 shrink-0" size={16} />
                              <div>
                                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">🔒 Two-Factor Security is ACTIVE</span>
                                <p className="text-[10px] text-teal-700 dark:text-teal-400 mt-0.5">
                                  This user must provide a 6-digit OTP code to complete authentication.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleDisable2Fa}
                              disabled={saving}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer self-end sm:self-center"
                            >
                              Disable 2FA Security
                            </button>
                          </div>
                        ) : (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                            <Unlock className="text-slate-400 shrink-0" size={16} />
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🔓 Two-Factor Security is Not Active</span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                The user has not configured or completed enrollment for Two-Factor authentication.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action footer */}
                      <div className="border-t pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                          style={{ background: "var(--admin-accent, #0f7c85)" }}
                        >
                          <Save size={14} />
                          {saving ? "Saving..." : "Save Access Settings"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Password Reset */}
                  {activeTab === "password" && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Administrative Password Reset</h4>
                        <p className="dash-caption mt-0.5">
                          Change or override the account password directly. Enter a custom key or use the random generator.
                        </p>
                      </div>

                      {resetSuccessMessage && (
                        <div className="border border-green-200 bg-green-50 p-4 rounded-xl space-y-3">
                          <p className="text-xs font-semibold text-green-800">{resetSuccessMessage}</p>
                          <div className="flex gap-2">
                            <div className="bg-white border font-mono text-sm px-3 py-1.5 rounded-lg font-bold select-all flex-1 text-slate-800 flex justify-between items-center">
                              {newPassword}
                            </div>
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="admin-btn admin-btn-primary"
                            >
                              {copied ? <Check size={12} /> : <Copy size={12} />}
                              {copied ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleResetPassword} className="space-y-4 max-w-md pt-2">
                        <div>
                          <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                            New Account Password
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Min 6 characters"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setResetSuccessMessage(null);
                              }}
                              className="flex-1 rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              onClick={handleGeneratePassword}
                              className="px-3.5 py-2 border rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 transition flex items-center gap-1 whitespace-nowrap"
                            >
                              <RefreshCw size={12} />
                              Generate Secure
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={saving || newPassword.length < 6}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {saving ? "Resetting..." : "Apply New Password"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 3: Activity Log */}
                  {activeTab === "activity" && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">User Activity Audit History</h4>
                        <p className="dash-caption mt-0.5">
                          View the last 20 logged actions and database changes triggered by this profile.
                        </p>
                      </div>

                      <div className="border rounded-xl overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider dash-caption">
                            <tr>
                              <th className="px-4 py-3">Action Type</th>
                              <th className="px-4 py-3">Site Scope</th>
                              <th className="px-4 py-3">Logged Details (JSON)</th>
                              <th className="px-4 py-3">Event Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-xs text-slate-600 dark:text-slate-300">
                            {user.auditLogs && user.auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-mono font-bold text-[var(--color-accent)] uppercase text-xs">
                                  {log.action}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {log.siteId || "System Global"}
                                </td>
                                <td className="px-4 py-3 font-mono dash-caption max-w-[200px] truncate" title={JSON.stringify(log.meta)}>
                                  {log.meta ? JSON.stringify(log.meta) : "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-400">
                                  {new Date(log.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {(!user.auditLogs || user.auditLogs.length === 0) && (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                                  No audit log actions logged.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Login History */}
                  {activeTab === "login" && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">Account Login Access Attempts</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          View the last 20 verified and failed login requests including IP logs and browser agents.
                        </p>
                      </div>

                      <div className="border rounded-xl overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y text-left">
                          <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                            <tr>
                              <th className="px-4 py-3">Sign-In Status</th>
                              <th className="px-4 py-3">IP Address</th>
                              <th className="px-4 py-3">User Agent / Browser</th>
                              <th className="px-4 py-3">Access Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-[11px] text-gray-600">
                            {user.loginHistory && user.loginHistory.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3">
                                  {log.success ? (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-700 border border-green-200">
                                      Success
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700 border border-red-200">
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {log.ipAddress || "unknown"}
                                </td>
                                <td className="px-4 py-3 truncate max-w-[200px]" title={log.userAgent}>
                                  {log.userAgent || "unknown"}
                                </td>
                                <td className="px-4 py-3 text-gray-400">
                                  {new Date(log.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {(!user.loginHistory || user.loginHistory.length === 0) && (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                                  No sign-in attempts recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-gray-450">No user data retrieved.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition"
                onClick={() => setOpen(false)}
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

