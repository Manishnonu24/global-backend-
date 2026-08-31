import React from "react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { redirect } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import { Users, UserCheck, UserX, ShieldAlert } from "lucide-react";
import UsersTableClient from "./UsersTableClient";
import Link from "next/link";

export const metadata = {
  title: "Frontend Users | Global Backend Admin",
  description:
    "View and manage registered public accounts, readers, and community members.",
};

// Frontend user roles only — registered on the public site
const FRONTEND_ROLES = ["VISITOR", "VIEWER"];

export default async function UsersPage() {
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

  // Fetch only frontend users
  const frontendUsers = await prisma.user.findMany({
    where: {
      globalRole: {
        in: FRONTEND_ROLES,
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
  const totalFrontend = frontendUsers.length;
  const activeFrontend = frontendUsers.filter((u) => u.isActive).length;
  const disabledFrontend = frontendUsers.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <div className="flex items-center gap-2">
            <Users size={22} style={{ color: "var(--admin-accent, #0f7c85)" }} />
            <h1 className="admin-page-title">Frontend Users Directory</h1>
          </div>
          <p className="admin-caption mt-1">
            Registered community accounts, website readers, and visitor profiles. For administrative staff &amp; role management, visit{" "}
            <Link
              href="/dashboard/admins"
              className="font-semibold underline hover:text-[var(--admin-accent,#0f7c85)]"
            >
              Admins &amp; Roles
            </Link>.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Registered Users" value={totalFrontend} icon={Users} />
        <StatCard title="Active Accounts" value={activeFrontend} icon={UserCheck} />
        <StatCard title="Inactive / Suspended" value={disabledFrontend} icon={UserX} />
      </div>

      {/* Main Users Table Layout */}
      <SectionCard noPadding>
        <UsersTableClient
          users={frontendUsers}
          sessionUserId={sessionUser.id}
          emptyTitle="No frontend community members found"
          emptyDescription="Public users who register on the website will be listed here automatically."
        />
      </SectionCard>
    </div>
  );
}
