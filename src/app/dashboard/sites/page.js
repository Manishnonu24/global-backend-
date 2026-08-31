import React from "react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { redirect } from "next/navigation";
import CreateSiteForm from "./CreateSiteForm";
import SiteRow from "./SiteRow";
import StatCard from "@/components/dashboard/StatCard";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import { Globe, Activity, FileText, Newspaper } from "lucide-react";

export const metadata = {
  title: "Site Workspaces | Global Backend Admin",
  description: "Manage sites in multi-site deployment.",
};

export default async function SitesPage() {
  const user = await requireAuth();
  if (!user) redirect("/dashboard/login");

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          pages: { where: { deletedAt: null } },
          posts: { where: { deletedAt: null } },
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="dash-page-title text-slate-900 dark:text-white">
            Sites
          </h1>
          <p className="dash-caption mt-1">
            Create and manage multi-site instances.
          </p>
        </div>
        <div className="shrink-0">
          <CreateSiteForm />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sites" value={totalSites} icon={Globe} />
        <StatCard title="Active" value={activeSites} icon={Activity} />
        <StatCard title="Total Pages" value={sites.reduce((sum, s) => sum + s._count.pages, 0)} icon={FileText} />
        <StatCard title="Total Posts" value={sites.reduce((sum, s) => sum + s._count.posts, 0)} icon={Newspaper} />
      </div>

      {/* Sites Table */}
      <SectionCard noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] dark:divide-slate-700 text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider dash-caption">
              <tr>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Pages</th>
                <th className="px-6 py-4 text-center">Posts</th>
                <th className="px-6 py-4 text-center">Users</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-slate-900 divide-y divide-[var(--color-border)] dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {sites.map((site) => (
                <SiteRow key={site.id} site={site} />
              ))}
            </tbody>
          </table>
        </div>

        {sites.length === 0 && (
          <EmptyState
            icon={Globe}
            title="No sites configured"
            description="Create your first site workspace using the button above."
          />
        )}
      </SectionCard>
    </div>
  );
}
