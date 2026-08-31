"use client";

import React from "react";
import DataTable from "@/components/dashboard/ui/DataTable";
import Badge from "@/components/dashboard/ui/Badge";
import UserDetailModal from "./UserDetailModal";
import DeleteUserButton from "./DeleteUserButton";
import { Users, Shield, ShieldCheck } from "lucide-react";

export default function UsersTableClient({
  users,
  sessionUserId,
  emptyTitle = "No administrator users found",
  emptyDescription = "Click 'Create User' above to register your first administrative account.",
}) {
  const columns = [
    {
      key: "identity",
      label: "User Identity",
      render: (_, u) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-[var(--radius-pill)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold flex items-center justify-center text-xs uppercase select-none shrink-0">
            {u.email.substring(0, 2)}
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
              {u.email}
            </span>
            <span className="dash-caption font-mono block text-[10px]">
              ID: {u.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "globalRole",
      label: "System Role",
      sortable: true,
      render: (val) => <Badge status={val} />,
    },
    {
      key: "isActive",
      label: "Account Status",
      sortable: true,
      render: (val) => (
        <Badge status={val ? "active" : "disabled"} dot />
      ),
    },
    {
      key: "twoFAEnabled",
      label: "Two-Factor (2FA)",
      render: (val) => (
        val ? (
          <span className="inline-flex items-center gap-1 text-[var(--color-accent)] font-semibold text-xs">
            <ShieldCheck size={14} className="shrink-0" /> Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[var(--color-muted)] text-xs">
            <Shield size={14} className="shrink-0" /> Disabled
          </span>
        )
      ),
    },
    {
      key: "createdAt",
      label: "Enrollment Date",
      sortable: true,
      render: (val) => (
        <span className="dash-caption font-mono">
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, u) => (
        <div className="flex items-center justify-end gap-1">
          <UserDetailModal userId={u.id} />
          {sessionUserId !== u.id && <DeleteUserButton userId={u.id} />}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={users}
      emptyIcon={Users}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}
