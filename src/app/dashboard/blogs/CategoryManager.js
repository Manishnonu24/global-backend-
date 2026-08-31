"use client";

import { useState } from "react";
import {
  Tag,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Loader2,
  FolderOpen,
} from "lucide-react";

export default function CategoryManager({ initialCategories = [], siteId }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rename state — per-category
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");
      const cat = data.data?.category ?? data.category;
      setCategories((prev) =>
        [...prev, { ...cat, _count: { posts: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id) {
    if (
      !editingName.trim() ||
      editingName.trim() === categories.find((c) => c.id === id)?.name
    ) {
      setEditingId(null);
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch(`/api/dashboard/categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename category");
      const cat = data.data?.category ?? data.category;
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, name: cat.name } : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete(id, catName) {
    if (
      !confirm(
        `Delete "${catName}"? This removes the category tag from all posts — posts will not be deleted.`,
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/categories/${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <Tag size={14} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Categories</h2>
          <p className="text-[10px] text-slate-400">
            {categories.length} total
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
          <X size={13} className="shrink-0 text-rose-500 mt-0.5" />
          {error}
        </div>
      )}

      {/* Add new */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="New category name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          required
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="admin-btn admin-btn-primary shadow-sm !px-3 !py-2 !text-[10px] !rounded-xl"
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Plus size={11} />
          )}
          Add
        </button>
      </form>

      {/* Category list */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-slate-300">
            <FolderOpen size={28} />
            <p className="text-xs font-semibold text-slate-400">
              No categories yet.
            </p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/40 transition-all duration-150"
            >
              {editingId === cat.id ? (
                /* Inline rename form */
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRename(cat.id);
                      }
                      if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(cat.id)}
                    disabled={renaming}
                    className="p-1 text-green-600 hover:text-green-800 transition"
                    title="Save"
                  >
                    {renaming ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                /* Normal display */
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {cat.name}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 shrink-0">
                      {cat._count?.posts ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={loading}
                      className="p-1 text-slate-400 hover:text-rose-600 transition disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

