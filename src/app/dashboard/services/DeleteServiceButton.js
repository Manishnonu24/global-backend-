"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";

export default function DeleteServiceButton({ serviceId, siteId }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const activeSiteId =
        siteId ||
        (typeof window !== "undefined" && localStorage.getItem("x-site-id")) ||
        "AHP";
      const res = await fetch(`/api/dashboard/services/${serviceId}`, {
        method: "DELETE",
        headers: {
          "x-site-id": activeSiteId,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to delete service");
      } else {
        toast.success("Service deleted successfully");
        router.refresh();
      }
    } catch (err) {
      console.error("Delete service error:", err);
      toast.error("Network error occurred while trying to delete the service.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Deleting..." : "Delete Service"}
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action is permanent and cannot be undone."
        confirmText="Yes, Delete"
      />
    </>
  );
}

