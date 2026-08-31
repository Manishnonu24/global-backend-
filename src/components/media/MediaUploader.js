"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle } from "lucide-react";

/**
 * MediaUploader
 * 
 * Supports multi-file upload. Accepts any file type.
 * Props:
 *  - onUpload()            — called after all files are uploaded
 *  - currentFolderId       — folder context for uploads (string | "root")
 */
export default function MediaUploader({ onUpload, currentFolderId, siteId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState([]); // [{name, status: "pending"|"uploading"|"done"|"error"}]

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const folderIdVal =
      !currentFolderId || currentFolderId === "root" ? null : currentFolderId;

    setUploading(true);
    setProgress(files.map((f) => ({ name: f.name, status: "pending" })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p))
      );

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (folderIdVal) formData.append("folderId", folderIdVal);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            "x-site-id": siteId,
          },
          body: formData,
        });


        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p))
        );
      } catch (error) {
        console.error("Upload error:", error);
        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "error" } : p))
        );
      }
    }

    e.target.value = "";
    setUploading(false);

    // Short delay so the user sees the final progress states, then clear
    setTimeout(() => {
      setProgress([]);
      if (onUpload) onUpload();
    }, 1200);
  }

  return (
    <div className="relative flex flex-col items-end gap-2">
      <label
        htmlFor="media-upload"
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        <Upload size={15} />
        {uploading ? "Uploading..." : "Upload Files"}
      </label>

      <input
        id="media-upload"
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />

      {/* Per-file progress badges */}
      {progress.length > 0 && (
        <div className="absolute top-full right-0 mt-2 flex flex-wrap gap-1.5 w-max max-w-xs justify-end max-h-40 overflow-y-auto bg-white p-3 rounded-xl shadow-xl border border-slate-200 z-50 styled-scrollbar">
          {progress.map((p, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                p.status === "done"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : p.status === "error"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : p.status === "uploading"
                  ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              {p.status === "done" && <CheckCircle size={10} />}
              {p.status === "error" && <XCircle size={10} />}
              <span className="truncate max-w-[120px]">{p.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
