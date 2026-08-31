"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Globe,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateSiteForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const resetForm = () => {
    setName("");
    setDomain("");
    setError(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Site name is required.");

    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create site");
      }
      toast.success("Site created successfully!");
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  };

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
        Create Site
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 md:pt-20">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border">
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="text-indigo-600" size={18} />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  New Site
                </h3>
              </div>
              <button
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
                    <AlertTriangle className="shrink-0 text-red-600" size={16} />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Site Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Law Firm"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Domain (optional)
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. mylawfirm.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    Will be used to auto-create a site ID slug.
                  </p>
                </div>
              </div>

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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

