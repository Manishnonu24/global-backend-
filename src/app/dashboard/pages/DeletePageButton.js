"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";

export default function DeletePageButton({ pageId, siteId }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/pages/${pageId}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to delete page");
      } else {
        toast.success("Page deleted successfully");
        router.refresh();
      }
    } catch (err) {
      console.error("Delete page error:", err);
      toast.error("Network error occurred while trying to delete the page.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="admin-btn admin-btn-danger"
        style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "9999px" }}
      >
        <Trash2 size={12} />
        <span>{loading ? "..." : "Delete"}</span>
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Page"
        message="Are you sure you want to delete this page? This will permanently remove all sections and content under this page. This action cannot be undone."
        confirmText="Yes, Delete"
      />
    </>
  );
}

