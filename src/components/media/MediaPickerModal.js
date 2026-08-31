"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Upload, Folder, Home, ArrowLeft, Search, Image as ImageIcon, FileIcon, CheckCircle } from "lucide-react";

import { getMediaUrl } from "@/lib/mediaUrl";

function getThumbnailUrl(rawUrl) {
  const url = getMediaUrl(rawUrl);
  if (!url) return url;
  if (url.includes("res.cloudinary.com")) {
    return url.replace("/upload/", "/upload/c_fill,w_200,h_200,g_auto,q_auto,f_auto/");
  }
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

export default function MediaPickerModal({ onSelect, onClose, title = "Select from Media Library", filter = "all", siteId }) {
  const effectiveSiteId = siteId || (typeof window !== "undefined" ? localStorage.getItem("x-site-id") : "") || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
  
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState([{ id: "root", name: "Media Library" }]);
  const [scope, setScope] = useState("all"); // "all" = show all media across site, "folders" = show current folder
  const [activeFilter, setActiveFilter] = useState(filter || "all");

  const [media, setMedia] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalMedia, setTotalMedia] = useState(0);

  const loadContents = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const targetFolder = search ? "all" : (scope === "all" ? "all" : currentFolderId);

      const fetchPromises = [
        fetch(`/api/media?folderId=${targetFolder}&limit=60&page=${pageNum}`, {
          headers: {
            "x-site-id": effectiveSiteId,
          },
        }),
      ];

      if (pageNum === 1 && scope === "folders" && !search) {
        fetchPromises.push(
          fetch(`/api/media/folders?parentId=${currentFolderId}`, {
            headers: {
              "x-site-id": effectiveSiteId,
            },
          })
        );
      }

      const responses = await Promise.all(fetchPromises);
      const mediaRes = responses[0];
      const foldersRes = responses.length > 1 ? responses[1] : null;

      const mediaData = await mediaRes.json();
      setTotalMedia(mediaData.total || 0);

      let items = mediaData.data ?? (Array.isArray(mediaData) ? mediaData : []);

      if (activeFilter === "images") {
        items = items.filter((m) => m.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(m.url || m.fileName || ""));
      } else if (activeFilter === "documents") {
        items = items.filter((m) => m.mimeType?.includes("pdf") || m.mimeType?.includes("document") || /\.(pdf|doc|docx|csv|txt|xlsx|xml)$/i.test(m.url || m.fileName || ""));
      } else if (activeFilter === "video") {
        items = items.filter((m) => m.mimeType?.startsWith("video/") || m.mimeType?.startsWith("audio/") || /\.(mp4|webm|mov|avi|mp3|wav|ogg)$/i.test(m.url || m.fileName || ""));
      }

      if (pageNum === 1) {
        setMedia(items);
        if (foldersRes) {
          const foldersData = await foldersRes.json();
          setFolders(foldersData.folders || []);
        } else if (scope === "all") {
          setFolders([]);
        }
      } else {
        setMedia((prev) => [...prev, ...items]);
      }
    } catch (err) {
      console.error("MediaPickerModal load error:", err);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  }, [currentFolderId, scope, activeFilter, search, effectiveSiteId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadContents(1);
  }, [loadContents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadContents(nextPage);
  };

  const navigateToFolder = (folder) => {
    setScope("folders");
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    setScope("folders");
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  const navigateBack = () => {
    if (folderHistory.length <= 1) return;
    navigateToBreadcrumb(folderHistory.length - 2);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(files.map((f) => ({ name: f.name, status: "pending" })));

    const folderIdVal = scope === "folders" && currentFolderId !== "root" ? currentFolderId : null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p))
      );

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (folderIdVal) formData.append("folderId", folderIdVal);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            "x-site-id": effectiveSiteId,
          },
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        setUploadProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "success" } : p))
        );
      } catch (err) {
        console.error("Upload file error:", err);
        setUploadProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "error" } : p))
        );
      }
    }

    setUploading(false);
    loadContents(1);
  };

  const filteredMedia = search
    ? media.filter(
        (m) =>
          m.fileName?.toLowerCase().includes(search.toLowerCase()) ||
          m.altText?.toLowerCase().includes(search.toLowerCase())
      )
    : media;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[#0f7c85]" />
            <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f7c85] hover:bg-[#0c6b73] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs">
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload New Image"}
              <input
                type="file"
                multiple
                accept={filter === "images" ? "image/*" : "*/*"}
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
            {/* Scope Toggle */}
            <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl">
              <button
                onClick={() => { setScope("all"); setCurrentFolderId("root"); }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scope === "all"
                    ? "bg-white text-[#0f7c85] shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Media Items
              </button>
              <button
                onClick={() => setScope("folders")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scope === "folders"
                    ? "bg-white text-[#0f7c85] shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                By Folders
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              {[
                { id: "all", label: "All Types" },
                { id: "images", label: "Images" },
                { id: "documents", label: "Documents & PDFs" },
                { id: "video", label: "Videos / Audio" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeFilter === tab.id
                      ? "bg-[#0f7c85] text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Breadcrumb if in folder view */}
            {scope === "folders" && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                {folderHistory.length > 1 && (
                  <button
                    onClick={navigateBack}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                {folderHistory.map((folder, index) => {
                  const isLast = index === folderHistory.length - 1;
                  return (
                    <div key={folder.id} className="flex items-center gap-1 shrink-0">
                      {index > 0 && <span className="text-slate-300">/</span>}
                      <button
                        onClick={() => navigateToBreadcrumb(index)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors text-[11px] ${
                          isLast
                            ? "text-slate-900 bg-white shadow-xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                        }`}
                      >
                        {index === 0 ? <Home size={12} /> : <Folder size={12} className="text-amber-500" />}
                        <span>{folder.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative w-56 shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search all media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0f7c85]"
            />
          </div>
        </div>

        {/* Upload Progress Overlay */}
        {uploading && (
          <div className="px-5 py-2 bg-teal-50 border-b border-teal-200 text-xs flex items-center justify-between">
            <span className="font-bold text-[#0f7c85]">Uploading files to media library...</span>
            <div className="flex items-center gap-2">
              {uploadProgress.map((p, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    p.status === "success"
                      ? "bg-emerald-100 text-emerald-800"
                      : p.status === "error"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-teal-100 text-[#0f7c85] animate-pulse"
                  }`}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-slate-400">Loading media library...</div>
          ) : (
            <div className="space-y-6">
              {folders.length > 0 && !search && (
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Folders</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => navigateToFolder(f)}
                        className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#0f7c85] hover:shadow-xs text-left transition-all group"
                      >
                        <Folder className="h-6 w-6 text-amber-500 fill-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-xs font-extrabold text-slate-800 truncate">{f.name}</span>
                          <span className="block text-[10px] text-slate-400">{f._count?.media || 0} files</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Grid */}
              <div className="space-y-2">
                {folders.length > 0 && !search && (
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Files</p>
                )}
                {filteredMedia.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
                    <p className="font-bold">No custom uploads found in this folder.</p>
                    <p className="text-[11px] text-slate-400">Click <strong>&quot;Upload New Image&quot;</strong> above to upload your assets.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filteredMedia.map((m) => {
                      const isImage = m.mimeType?.startsWith("image/");
                      const isHovered = hoveredId === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onSelect(m)}
                          onMouseEnter={() => setHoveredId(m.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-[#0f7c85] bg-white transition-all hover:shadow-md focus:outline-none cursor-pointer"
                          title={m.fileName}
                        >
                          {isImage ? (
                            <img
                              src={getThumbnailUrl(m.secureUrl || m.url)}
                              alt={m.altText || m.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <FileIcon className="h-8 w-8 text-slate-400" />
                            </div>
                          )}

                          <div className={`absolute inset-0 bg-[#0f7c85]/80 flex flex-col items-center justify-center transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
                            <CheckCircle className="h-6 w-6 text-white mb-1" />
                            <span className="text-[10px] text-white font-extrabold uppercase">Select</span>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="block text-[10px] text-white truncate font-medium">{m.fileName}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {media.length < totalMedia && !loading && !search && (
                  <div className="mt-6 flex justify-center pb-4">
                    <button
                      onClick={loadMore}
                      className="rounded-full bg-[#0f7c85] px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#0c6b73] transition-all cursor-pointer"
                    >
                      Load More Items
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-white flex items-center justify-between shrink-0">
          <p className="text-[11px] font-bold text-slate-400">
            {filteredMedia.length} {filter === "images" ? "image" : "file"}{filteredMedia.length !== 1 ? "s" : ""} available
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-extrabold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
