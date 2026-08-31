// src/app/(dashboard)/pages/CreatePageForm.js
"use client";

import { useState } from "react";
import { Plus, X, FilePlus, Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreatePageForm({ siteId }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setError(null);
  };

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Page title is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          siteId,
          title: title.trim(),
          slug: slug.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create page");
      }

      toast.success("Page created successfully!");
      router.refresh();
      setShow(false);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to create page");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="admin-btn admin-btn-primary shadow-sm"
        onClick={() => {
          resetForm();
          setShow(true);
        }}
      >
        <Plus size={14} />
        Create Page
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 md:pt-20">
          {/* Modal Backdrop screen */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShow(false)}
          />

          {/* Modal box */}
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilePlus className="text-green-600" size={18} />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Create New Page</h3>
              </div>
              <button
                className="p-1 rounded-lg hover:bg-gray-250 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setShow(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
                    <AlertTriangle className="shrink-0 text-red-600" size={16} />
                    <p>{error}</p>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. About Our Mission"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>

                {/* Slug (Optional) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Route Slug Path (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 text-gray-400" size={14} />
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. about-us"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed">
                    Leave blank to automatically construct a search-engine-friendly slug path directly from your title label (e.g. "/about-our-mission").
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition"
                  onClick={() => setShow(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="admin-btn admin-btn-primary disabled:opacity-50"
                >
                  {saving ? "Creating Page..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

