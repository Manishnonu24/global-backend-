// global_backend/src/app/(dashboard)/pages/PublishToggle.js
"use client";

import { useState } from "react";
import { toast } from "sonner";

/*
 PublishToggle client component
 Props:
  - pageId: string
  - initialStatus: "DRAFT" | "PUBLISHED"
*/
import { EyeOff, UploadCloud } from "lucide-react";

export default function PublishToggle({ pageId, initialStatus, siteId }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const isPublishing = status !== "PUBLISHED";
      const res = await fetch(`/api/dashboard/pages/${pageId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ publish: isPublishing }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update page status");
      } else {
        const newStatus = isPublishing ? "PUBLISHED" : "DRAFT";
        setStatus(json.page?.status ?? newStatus);
        toast.success(`Page status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error("Toggle publish error", err);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const isPublished = status === "PUBLISHED";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="admin-btn"
      style={{
        fontSize: "11px",
        padding: "5px 10px",
        borderRadius: "9999px",
        background: isPublished ? "#475569" : "var(--admin-accent, #0f7c85)",
        color: "#fff",
      }}
      title={isPublished ? "Unpublish" : "Publish"}
    >
      {isPublished ? <EyeOff size={12} /> : <UploadCloud size={12} />}
      <span>{loading ? "..." : isPublished ? "Unpublish" : "Publish"}</span>
    </button>
  );
}
