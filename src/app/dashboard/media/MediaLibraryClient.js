"use client";

import { useEffect, useState, useCallback } from "react";
import { Folder, FolderPlus, ArrowLeft, Trash2, Home } from "lucide-react";
import MediaUploader from "@/components/media/MediaUploader";
import MediaGrid from "@/components/media/MediaGrid";
import MediaDetailsModal from "@/components/media/MediaDetailsModal";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { getMediaUrl } from "@/lib/mediaUrl";

export default function MediaLibraryClient({ siteId }) {
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState([
    { id: "root", name: "Media Library" },
  ]);

  const [media, setMedia] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Folder Creation States
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderCreating, setFolderCreating] = useState(false);

  // Details Modal States
  const [selectedMediaId, setSelectedMediaId] = useState(null);

  // Delete Confirm Dialog States
  const [deleteTarget, setDeleteTarget] = useState({
    isOpen: false,
    type: "file",
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalMedia, setTotalMedia] = useState(0);

  const loadContents = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const mediaRes = await fetch(
        `/api/media?folderId=${currentFolderId}&siteId=${siteId}&page=${pageNum}&limit=20`,
        {
          headers: { "x-site-id": siteId },
        },
      );
      const mediaData = await mediaRes.json();
      const items = mediaData.data ?? (Array.isArray(mediaData) ? mediaData : []);
      
      setTotalMedia(mediaData.total || 0);
      
      if (pageNum === 1) {
        setMedia(items);
      } else {
        setMedia((prev) => [...prev, ...items]);
      }

      if (pageNum === 1) {
        const foldersRes = await fetch(
          `/api/media/folders?parentId=${currentFolderId}&siteId=${siteId}`,
          {
            headers: { "x-site-id": siteId },
          },
        );
        const foldersData = await foldersRes.json();
        setFolders((foldersData.data?.folders ?? foldersData.folders) || []);
      }
    } catch (error) {
      console.error("Load media contents error:", error);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  }, [currentFolderId, siteId]);

  useEffect(() => {
    const handleFetch = async () => {
      await loadContents(1);
    };
    handleFetch();
  }, [loadContents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadContents(nextPage);
  };

  // Navigate deep into a folder
  const navigateToFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Click a breadcrumb link
  const navigateToBreadcrumb = (index) => {
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  // Go back one directory
  const navigateBack = () => {
    if (folderHistory.length <= 1) return;
    const parentIndex = folderHistory.length - 2;
    navigateToBreadcrumb(parentIndex);
  };

  // Create folder API trigger
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setFolderCreating(true);
    try {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId === "root" ? null : currentFolderId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create folder");
      }

      setNewFolderName("");
      setShowFolderModal(false);
      toast.success(`Folder "${data.name || newFolderName.trim()}" created`);
      await loadContents(); // Reload items
    } catch (err) {
      toast.error(err.message || "Failed to create folder");
    } finally {
      setFolderCreating(false);
    }
  };

  // Prompt delete folder
  const promptDeleteFolder = (id, name) => {
    setDeleteTarget({
      isOpen: true,
      type: "folder",
      id,
      name: name || "folder",
    });
  };

  // Prompt delete file
  const promptDeleteFile = (id, fileName) => {
    const fileItem = media.find((m) => m.id === id);
    const name = fileName || fileItem?.fileName || "file";
    setDeleteTarget({
      isOpen: true,
      type: "file",
      id,
      name,
    });
  };

  // Confirm delete API trigger
  const handleConfirmDelete = async () => {
    const { type, id, name } = deleteTarget;
    if (!id) return;

    setDeleting(true);
    try {
      if (type === "folder") {
        const res = await fetch(`/api/media/folders/${id}`, {
          method: "DELETE",
          headers: {
            "x-site-id": siteId,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete folder");
        }

        toast.success(`Folder "${name}" deleted`);
      } else {
        const res = await fetch(`/api/media/${id}`, {
          method: "DELETE",
          headers: {
            "x-site-id": siteId,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to delete file");
        }

        setSelectedMediaId(null);
        toast.success("File deleted permanently");
      }

      setDeleteTarget({ isOpen: false, type: "file", id: null, name: "" });
      await loadContents();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  async function copyUrl(mediaItem) {
    try {
      const mediaUrl = getMediaUrl(mediaItem);
      const fullUrl = mediaUrl.startsWith("/") ? `${window.location.origin}${mediaUrl}` : mediaUrl;
      const success = await copyToClipboard(fullUrl);
      if (success) {
        toast.success("Direct S3 image URL copied to clipboard");
      } else {
        toast.error("Failed to copy URL");
      }
    } catch (_) {
      toast.error("Failed to copy URL");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Media Library</h1>
          <p className="admin-caption mt-1">
            Manage folders, images, documents, videos, and optimized web assets.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className="admin-btn admin-btn-secondary"
          >
            <FolderPlus size={15} />
            Create Folder
          </button>

          <MediaUploader
            onUpload={loadContents}
            currentFolderId={currentFolderId}
            siteId={siteId}
          />
        </div>
      </div>

      {/* Directory Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs border bg-slate-50 p-2.5 rounded-lg border-slate-200">
        {currentFolderId !== "root" && (
          <button
            onClick={navigateBack}
            className="p-1 hover:bg-slate-200 rounded text-slate-550 transition-colors mr-1"
            title="Go Back"
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <div className="flex items-center flex-wrap gap-1">
          {folderHistory.map((folder, idx) => (
            <div key={folder.id} className="flex items-center gap-1">
              {idx > 0 && <span className="text-slate-400">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(idx)}
                className={`font-semibold hover:text-blue-600 transition-colors ${idx === folderHistory.length - 1 ? "text-slate-800 pointer-events-none" : "text-slate-500"}`}
              >
                {folder.id === "root" ? (
                  <span className="flex items-center gap-1">
                    <Home size={12} />
                    {folder.name}
                  </span>
                ) : (
                  folder.name
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-400">
          Loading library elements...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Directories
              </h3>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="group border border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white rounded-lg p-2.5 flex items-center justify-between transition-all"
                  >
                    <div
                      onDoubleClick={() => navigateToFolder(f)}
                      onClick={() => navigateToFolder(f)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      title="Double click to enter folder"
                    >
                      <Folder className="h-7 w-7 text-amber-500 fill-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[11px] leading-tight font-semibold text-slate-800 truncate">
                          {f.name}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          {f._count?.media || 0} files
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => promptDeleteFolder(f.id, f.name)}
                      className="text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      title="Delete Folder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Files & Uploads
            </h3>
            <MediaGrid
              media={media}
              onDelete={promptDeleteFile}
              onCopyUrl={copyUrl}
              onSelectMedia={setSelectedMediaId}
            />
            {media.length < totalMedia && (
              <div className="flex justify-center pt-4 pb-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold rounded-lg text-sm transition-colors"
                >
                  Load More ({media.length} of {totalMedia})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900 opacity-40"
            onClick={() => setShowFolderModal(false)}
          />
          <form
            onSubmit={handleCreateFolder}
            className="relative bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full z-10 p-5 space-y-4"
          >
            <h4 className="font-semibold text-slate-900 text-sm">
              Create New Folder
            </h4>
            <div>
              <label
                htmlFor="folderName"
                className="block text-2xs font-semibold text-slate-700"
              >
                Folder Name
              </label>
              <input
                type="text"
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="mt-1 block w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-3 py-1.5 text-xs border rounded hover:bg-slate-50 font-semibold"
                disabled={folderCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={folderCreating || !newFolderName.trim()}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded font-semibold transition-colors shadow-sm"
              >
                {folderCreating ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Media Inspector details Modal */}
      {selectedMediaId && (
        <MediaDetailsModal
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onUpdate={loadContents}
          onDelete={promptDeleteFile}
          siteId={siteId}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteTarget.isOpen}
        onClose={() => setDeleteTarget({ isOpen: false, type: "file", id: null, name: "" })}
        onConfirm={handleConfirmDelete}
        title={deleteTarget.type === "folder" ? "Delete Folder" : "Delete Media File"}
        description={
          deleteTarget.type === "folder"
            ? `Are you sure you want to delete folder "${deleteTarget.name}"? Files and subfolders inside it will be moved back to the parent directory.`
            : `Are you sure you want to delete "${deleteTarget.name}"? This file will be permanently erased from storage.`
        }
        confirmLabel={deleteTarget.type === "folder" ? "Delete Folder" : "Delete File"}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

