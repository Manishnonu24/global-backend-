import React from "react";
import prisma from "@/lib/prisma";
import CreateUserForm from "../users/CreateUserForm";
import { requireAuth } from "@/lib/requireAuth";
import { redirect } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import { Shield, ShieldCheck, UserCheck, UserCog } from "lucide-react";
import UsersTableClient from "../users/UsersTableClient";

export const metadata = {
  title: "Admin Management | Global Backend Admin",
  description:
    "Manage administrative accounts, role privileges, access scopes, and multi-factor authentication policies.",
};

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN", "EDITOR", "AUTHOR", "MARKETING"];

export default async function AdminsPage() {
  const sessionUser = await requireAuth();

  if (!sessionUser) {
    redirect("/dashboard/login");
  }

  // Restrict access to SUPERADMIN and ADMIN
  if (
    sessionUser.globalRole !== "SUPERADMIN" &&
    sessionUser.globalRole !== "ADMIN"
  ) {
    redirect("/dashboard/dashboard");
  }

  // Fetch all active sites for site-access assignment
  const sites = await prisma.site.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, domain: true },
    orderBy: { name: "asc" },
  });

  // Fetch only admin users
  const adminUsers = await prisma.user.findMany({
    where: {
      globalRole: {
        in: ADMIN_ROLES,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      isActive: true,
      twoFAEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate metrics
  const totalAdmins = adminUsers.length;
  const activeAdmins = adminUsers.filter((u) => u.isActive).length;
  const superAdmins = adminUsers.filter(
    (u) => u.globalRole === "SUPERADMIN" || u.globalRole === "ADMIN"
  ).length;
  const adminsWithMFA = adminUsers.filter((u) => u.twoFAEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <div className="flex items-center gap-2">
            <UserCog size={22} style={{ color: "var(--admin-accent, #0f7c85)" }} />
            <h1 className="admin-page-title">Admin Management & Roles</h1>
          </div>
          <p className="admin-caption mt-1">
            Configure system permissions, assign administrative roles (Superadmin, Admin, Editor, Author, Marketing), and manage 2FA security.
          </p>
        </div>
        <div className="admin-page-header-actions">
          <CreateUserForm sites={JSON.parse(JSON.stringify(sites))} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Admins" value={totalAdmins} icon={UserCog} />
        <StatCard title="Active Accounts" value={activeAdmins} icon={UserCheck} />
        <StatCard title="Admins & Superadmins" value={superAdmins} icon={Shield} />
        <StatCard title="2FA Protected" value={adminsWithMFA} icon={ShieldCheck} />
      </div>

      {/* Main Admin Table Layout */}
      <SectionCard noPadding>
        <UsersTableClient
          users={adminUsers}
          sessionUserId={sessionUser.id}
          emptyTitle="No administrator accounts found"
          emptyDescription="Click 'Create User' above to assign administrative access."
        />
      </SectionCard>
    </div>
  );
}
