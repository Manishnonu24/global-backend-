"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";

export default function DeleteUserButton({ userId }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: "DELETE",
      });
      let body = null;
      const text = await res.text();
      try {
        body = text ? JSON.parse(text) : null;
      } catch (e) {
        body = { error: text || null };
      }

      if (!res.ok) {
        const message =
          (body && (body.error || body.message)) ||
          `Delete failed — status ${res.status}`;
        toast.error(message);
        return;
      }

      toast.success("User deleted successfully");
      router.refresh();
      setShowConfirm(false);
    } catch (err) {
      console.error("Delete user network error:", err);
      toast.error("Network error while deleting user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-[var(--radius-input)] text-xs font-semibold transition-colors cursor-pointer"
        onClick={() => setShowConfirm(true)}
      >
        Delete
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete User Account"
        description="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete User"
        loading={loading}
        variant="danger"
      />
    </>
  );
}
