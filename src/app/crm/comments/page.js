"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Trash2, Check, AlertTriangle, ShieldAlert } from "lucide-react";

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    const id = (typeof window !== "undefined" && localStorage.getItem("x-site-id")) || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {};
      if (siteId) {
        headers["x-site-id"] = siteId;
      }
      const res = await fetch(`/api/crm/comments?status=${encodeURIComponent(statusFilter)}`, {
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.data.comments || []);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
    setLoading(false);
  }, [statusFilter, siteId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleUpdateStatus = async (id, status) => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (siteId) {
        headers["x-site-id"] = siteId;
      }
      const res = await fetch(`/api/crm/comments/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchComments();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this comment?")) return;
    try {
      const headers = {};
      if (siteId) {
        headers["x-site-id"] = siteId;
      }
      const res = await fetch(`/api/crm/comments/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        fetchComments();
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Comment Moderation
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Review, approve, and filter user comments submitted on blog articles and digital publications
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-800 p-2.5 rounded-lg border dark:border-slate-700">
        {[
          { label: "All Comments", value: "" },
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Spam", value: "spam" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === tab.value
                ? "bg-indigo-600 text-white"
                : "text-slate-650 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
            No comments found in this queue.
          </div>
        ) : (
          comments.map((comment) => {
            const isMag = Boolean(comment.magazineId || comment.targetType === "magazine");
            const targetLabel = isMag ? "Publication" : "Blog";
            const targetTitle = isMag
              ? comment.magazine?.title || comment.targetTitle || "Publication Issue"
              : comment.post?.title || comment.targetTitle || "Blog Post";

            return (
              <div
                key={comment.id}
                className="p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{comment.authorName}</span>
                    <span className="text-slate-400 text-[10px]">({comment.authorEmail})</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-450">
                      {targetLabel}:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-350">
                        {targetTitle}
                      </span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-850">
                    "{comment.content}"
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Submitted: {new Date(comment.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span
                      className={`font-semibold capitalize ${
                        comment.status === "approved"
                          ? "text-green-600"
                          : comment.status === "spam"
                          ? "text-amber-600"
                          : "text-slate-500"
                      }`}
                    >
                      {comment.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {comment.status !== "approved" && (
                    <button
                      onClick={() => handleUpdateStatus(comment.id, "approved")}
                      title="Approve Comment"
                      className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition cursor-pointer"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  {comment.status !== "spam" && (
                    <button
                      onClick={() => handleUpdateStatus(comment.id, "spam")}
                      title="Mark as Spam"
                      className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                    >
                      <AlertTriangle size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    title="Permanently Delete"
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
