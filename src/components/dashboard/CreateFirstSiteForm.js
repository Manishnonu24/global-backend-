"use client";

import { useState } from "react";

export default function CreateFirstSiteForm() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSite, setCreatedSite] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain: domain || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create site");
      }

      const data = await res.json();
      setCreatedSite(data.site);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-3xl border border-gray-150 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900">Create Your First Site Workspace</h2>
        <p className="text-xs text-gray-500">
          No sites exist in the database yet. Register your first site to get started.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl text-center animate-pulse">
          {error}
        </div>
      )}

      {success && createdSite && (
        <div className="p-4 bg-green-50 text-green-850 border border-green-200 rounded-2xl space-y-3 text-center text-xs">
          <p className="font-bold">✓ Site Workspace Created Successfully!</p>
          <div className="bg-white p-3 rounded-xl border border-green-150 font-mono text-xs select-all select-text break-all">
            Site ID: <span className="font-bold text-indigo-650">{createdSite.id}</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Copy this ID and paste it in your frontend project&apos;s <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">.env</code> file as <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">NEXT_PUBLIC_SITE_ID</code>.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Site Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="My Awesome Site"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Domain (Optional)
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="localhost"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating..." : "Create Site Workspace"}
          </button>
        </form>
      )}
    </div>
  );
}
