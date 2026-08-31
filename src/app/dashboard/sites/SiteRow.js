"use client";

import { useState } from "react";
import Badge from "@/components/dashboard/ui/Badge";
import {
  Trash2,
  Edit3,
  AlertTriangle,
  X,
  CheckCircle,
  Globe,
} from "lucide-react";

export default function SiteRow({ site, currentUserId }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/dashboard/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to update");
        return;
      }
      setEditing(false);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await fetch(`/api/dashboard/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !site.isActive }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to toggle status");
        return;
      }
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/dashboard/sites/${site.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to delete");
        return;
      }
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <tr className="hover:bg-gray-50/50 transition">
      <td className="px-6 py-4 whitespace-nowrap">
        {editing ? (
          <div className="space-y-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-600"
              placeholder="Site name"
            />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-600"
              placeholder="Domain (optional)"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleSave}
                className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-2 py-1 border rounded text-[10px] font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border uppercase">
              {site.name.substring(0, 2)}
            </div>
            <div>
              <span className="font-semibold text-gray-900 block">
                {site.name}
              </span>
              <span className="dash-caption font-mono block text-[10px]">
                ID: {site.id}
              </span>
            </div>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
        {site.domain || (
          <span className="dash-caption italic">No domain set</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge status={site.isActive ? "active" : "inactive"} dot />
      </td>
      <td className="px-6 py-4 text-center text-gray-500">{site._count.pages}</td>
      <td className="px-6 py-4 text-center text-gray-500">{site._count.posts}</td>
      <td className="px-6 py-4 text-center text-gray-500">{site._count?.users ?? site._count?.userAccess ?? 0}</td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
        {new Date(site.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
            title="Edit"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={handleToggleActive}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600 transition"
            title={site.isActive ? "Deactivate" : "Activate"}
          >
            <CheckCircle size={14} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 border rounded text-[10px] font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

