"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";

export default function DeleteMagazineButton({ magazineSlug, siteId }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/magazines/${magazineSlug}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to delete magazine");
      } else {
        toast.success("Magazine deleted successfully");
        router.refresh();
      }
    } catch (err) {
      console.error("Delete magazine error:", err);
      toast.error("Network error while deleting magazine.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Delete magazine"
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Trash2 size={11} />
        )}
        {loading ? "Deleting..." : "Delete"}
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message="Are you sure you want to permanently delete this magazine? This action cannot be undone."
        confirmText="Yes, Delete"
      />
    </>
  );
}
