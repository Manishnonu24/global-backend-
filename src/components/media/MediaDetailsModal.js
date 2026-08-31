"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, Trash2, Save, RefreshCw, X, FileIcon, Info, Folder } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { getMediaUrl } from "@/lib/mediaUrl";

export default function MediaDetailsModal({ mediaId, onClose, onUpdate, onDelete, siteId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  
  const [item, setItem] = useState(null);
  const [usages, setUsages] = useState([]);
  const [allFolders, setAllFolders] = useState([]);

  // Form inputs
  const [fileName, setFileName] = useState("");
  const [altText, setAltText] = useState("");
  const [folderId, setFolderId] = useState("");
  
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch details and folder list
  async function loadDetails() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch file info and usage lists
      const detailsRes = await fetch(`/api/media/${mediaId}?siteId=${siteId}`);
      const detailsData = await detailsRes.json();
      if (!detailsRes.ok) throw new Error(detailsData.error || "Failed to load media details");
      
      setItem(detailsData.media);
      setUsages(detailsData.usages || []);
      setFileName(detailsData.media.fileName || "");
      setAltText(detailsData.media.altText || "");
      setFolderId(detailsData.media.folderId || "root");

      // 2. Fetch all folders for moving
      const foldersRes = await fetch(`/api/media/folders?parentId=all&siteId=${siteId}`);
      const foldersData = await foldersRes.json();
      if (foldersRes.ok) {
        setAllFolders(foldersData.folders || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mediaId && siteId) {
      loadDetails();
    }
  }, [mediaId, siteId]);

  // Handle patch/save details
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-site-id": siteId
        },
        body: JSON.stringify({
          fileName,
          altText,
          folderId: folderId === "root" ? null : folderId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update media details");

      setSuccessMsg("Details updated successfully");
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle replace file
  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReplacing(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/media/${mediaId}/replace`, {
        method: "POST",
        headers: {
          "x-site-id": siteId,
        },
        body: formData,
      });


      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to replace file");

      setSuccessMsg("File replaced successfully");
      loadDetails(); // Reload page/info to reflect changes
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
      e.target.value = "";
    }
  };

  const copyUrl = async () => {
    if (!item) return;
    const mediaUrl = getMediaUrl(item);
    const fullUrl = mediaUrl.startsWith("/") ? `${window.location.origin}${mediaUrl}` : mediaUrl;
    const success = await copyToClipboard(fullUrl);
    if (success) {
      toast.success("Direct S3 image URL copied to clipboard");
    } else {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  if (!mediaId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900 opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col z-10 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Media File Inspector & Details</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="py-24 text-center text-sm text-slate-400">
              Loading file statistics...
            </div>
          ) : error && !item ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Visual Preview & Statistics */}
              <div className="space-y-6">
                
                {/* Visual Box */}
                <div className="bg-white border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm min-h-[220px]">
                  {item.mimeType?.startsWith("image/") ? (
                    <img
                      src={item.url.startsWith("/") ? item.url : `/api/media/proxy?url=${encodeURIComponent(item.url)}`}
                      alt={item.altText || item.fileName}
                      className="max-h-[240px] max-w-full rounded-lg object-contain border bg-slate-50 shadow-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 p-12">
                      <FileIcon className="h-16 w-16 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700 uppercase">
                        {item.extension} file
                      </span>
                    </div>
                  )}
                </div>

                {/* Statistics Listing */}
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">File Info</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <span className="block text-slate-400">Dimensions</span>
                      <span className="font-semibold text-slate-800">
                        {item.width && item.height ? `${item.width} × ${item.height} px` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">File Size</span>
                      <span className="font-semibold text-slate-800">
                        {item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Mime Type</span>
                      <span className="font-semibold text-slate-800 truncate block" title={item.mimeType}>
                        {item.mimeType || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Upload Date</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={copyUrl}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-md transition-colors shadow-sm"
                    >
                      <Copy size={13} />
                      Copy URL
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center py-1.5 border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-md text-center transition-colors shadow-sm"
                    >
                      Open Original
                    </a>
                  </div>
                </div>

                {/* File Usages Panel */}
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Global Backend Usage Diagnostics</h4>
                  <div className="space-y-1.5">
                    {usages.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">This media asset is not linked in any pages, posts, or services.</p>
                    ) : (
                      usages.map((usage, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-slate-50 border border-slate-100 transition-colors">
                          <div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-slate-100 text-slate-600 mr-2 uppercase border">
                              {usage.type}
                            </span>
                            <span className="font-medium text-slate-800">{usage.title}</span>
                          </div>
                          <Link
                            href={usage.link}
                            onClick={onClose}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Edit
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Editing details & operations Form */}
              <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <form onSubmit={handleSave} className="space-y-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Settings</h4>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-md">
                      {successMsg}
                    </div>
                  )}

                  <div>
                    <label htmlFor="fileName" className="block text-xs font-semibold text-slate-700">
                      File Display Name
                    </label>
                    <input
                      type="text"
                      id="fileName"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="altText" className="block text-xs font-semibold text-slate-700">
                      Alt Text (SEO Description)
                    </label>
                    <textarea
                      id="altText"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image content for screen readers..."
                      rows={2}
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="folderId" className="block text-xs font-semibold text-slate-700">
                      Location Folder
                    </label>
                    <div className="flex gap-2 items-center mt-1">
                      <Folder className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <select
                        id="folderId"
                        value={folderId}
                        onChange={(e) => setFolderId(e.target.value)}
                        className="block w-full px-3 py-1.5 text-xs border border-slate-300 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="root">/ Root (No Folder)</option>
                        {allFolders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
                    >
                      <Save size={13} />
                      {saving ? "Saving Details..." : "Save Settings"}
                    </button>
                  </div>
                </form>

                {/* Replacement & Deletion triggers */}
                <div className="mt-8 pt-6 border-t space-y-4">
                  
                  {/* Replace asset */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Replace Media Asset in Place
                    </label>
                    <label
                      htmlFor="replace-file"
                      className={`w-full inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition-colors shadow-sm ${replacing ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      <RefreshCw size={13} className={replacing ? "animate-spin" : ""} />
                      {replacing ? "Replacing File..." : "Choose Replacement File"}
                    </label>
                    <input
                      id="replace-file"
                      type="file"
                      className="hidden"
                      onChange={handleReplace}
                      disabled={replacing}
                    />
                    <p className="text-3xs text-slate-400 mt-1">
                      Swaps the image source file but retains this database link ID so references do not break.
                    </p>
                  </div>

                  {/* Danger Delete */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-md transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete Permanently
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
