// src/app/(dashboard)/users/CreateUserForm.js
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  UserPlus,
  Mail,
  KeyRound,
  Shield,
  AlertTriangle,
} from "lucide-react";

const ROLE_LEVEL = {
  SUPERADMIN: 5,
  ADMIN: 4,
  EDITOR: 3,
  AUTHOR: 2,
  MARKETING: 1,
  VISITOR: 1,
  VIEWER: 1,
};

export default function CreateUserForm({ sites = [] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [selectedSites, setSelectedSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatorRole, setCreatorRole] = useState(null);

  // Reset all states
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirm("");
    setRole("EDITOR");
    setSelectedSites([]);
    setError(null);
  };

  // Perform POST to create new user
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email address is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm)
      return setError("Confirmation passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          globalRole: role,
          siteIds: selectedSites,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.details?.[0];
        const msg = detail
          ? `${detail.path?.join(".") || "Field"}: ${detail.message}`
          : json.error || "Failed to create user";
        throw new Error(msg);
      }

      // Success: refresh the window to show new list
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current session user's role to restrict role assignment values
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        const role = json?.user?.globalRole || null;
        setCreatorRole(role);
      })
      .catch((err) => {
        console.error("Session fetching error in CreateUserForm:", err);
        if (mounted) setCreatorRole(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allRoles = ["SUPERADMIN", "ADMIN", "EDITOR", "AUTHOR", "MARKETING", "VISITOR", "VIEWER"];
  const allowedRoles = creatorRole
    ? allRoles.filter(
        (r) => (ROLE_LEVEL[r] || 0) <= (ROLE_LEVEL[creatorRole] || 0),
      )
    : ["EDITOR", "AUTHOR", "VIEWER"]; // Safe fallback

  return (
    <>
      <button
        type="button"
        className="admin-btn admin-btn-primary shadow-sm"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <Plus size={14} />
        Create User
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 md:pt-20">
          {/* Modal Backdrop screen */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal box */}
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="text-green-600" size={18} />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Add System Member
                </h3>
              </div>
              <button
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
                    <AlertTriangle
                      className="shrink-0 text-red-600"
                      size={16}
                    />
                    <p>{error}</p>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-3 text-gray-400"
                      size={14}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@domain.com"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                    Sign-In Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-3 top-3 text-gray-400"
                      size={14}
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                    Confirm Sign-In Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-3 top-3 text-gray-400"
                      size={14}
                    />
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat account password"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Role dropdown */}
                <div>
                  <label className="dash-caption font-bold uppercase tracking-wider block mb-1">
                    System Global Access Role
                  </label>
                  <div className="relative">
                    <Shield
                      className="absolute left-3 top-3 text-gray-400"
                      size={14}
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-600"
                    >
                      {allowedRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Site Access Selection — only for admin/superadmin users */}
                {creatorRole &&
                  (creatorRole === "SUPERADMIN" || creatorRole === "ADMIN") &&
                  sites.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Site Access
                      </label>
                      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2 max-h-48 overflow-y-auto">
                        {sites.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">
                            No sites available
                          </p>
                        ) : (
                          sites.map((site) => (
                            <label
                              key={site.id}
                              className="flex items-center gap-2.5 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSites.includes(site.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSites((prev) => [
                                      ...prev,
                                      site.id,
                                    ]);
                                  } else {
                                    setSelectedSites((prev) =>
                                      prev.filter((id) => id !== site.id),
                                    );
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition">
                                  {site.name}
                                </span>
                                {site.domain && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {site.domain}
                                  </span>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 italic">
                        Assign which sites this user can access. Site role
                        defaults to Editor.
                      </p>
                    </div>
                  )}
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="admin-btn admin-btn-primary disabled:opacity-50"
                >
                  {loading ? "Creating Member..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

