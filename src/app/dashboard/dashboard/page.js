import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import StatCard from "@/components/dashboard/StatCard";
import CreateFirstSiteForm from "@/components/dashboard/CreateFirstSiteForm";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import Badge from "@/components/dashboard/ui/Badge";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import {
  Inbox,
  FileText,
  Newspaper,
  Play,
  Database,
  ShieldCheck,
  PlusCircle,
  Layers,
  FolderOpen,
  Activity,
  AlertCircle,
} from "lucide-react";

const allActions = [
  {
    label: "Database Backup",
    desc: "Run database/media backups",
    href: "/dashboard/backup",
    icon: Database,
    minRole: "ADMIN",
  },
  {
    label: "Security Console",
    desc: "View audit logs & access history",
    href: "/dashboard/security",
    icon: ShieldCheck,
    minRole: "ADMIN",
  },
  {
    label: "Leads CRM",
    desc: "Manage customer form inquiries",
    href: "/crm/leads",
    icon: Inbox,
    minRole: "EDITOR",
    additionalRoles: ["MARKETING"],
  },
  {
    label: "Manage Menus",
    desc: "Modify navigation structures",
    href: "/dashboard/navigation",
    icon: Layers,
    minRole: "EDITOR",
  },
  {
    label: "New Blog Post",
    desc: "Compose a new draft article",
    href: "/dashboard/blogs/new",
    icon: Newspaper,
    minRole: "AUTHOR",
  },
  {
    label: "Upload Media",
    desc: "Manage images and assets",
    href: "/dashboard/media",
    icon: FolderOpen,
    minRole: "AUTHOR",
  },
  {
    label: "System Status",
    desc: "Monitor platform performance",
    href: "/dashboard/performance",
    icon: Activity,
    minRole: "VIEWER",
  },
  {
    label: "Manage Pages",
    desc: "Edit layouts & build pages",
    href: "/dashboard/pages",
    icon: PlusCircle,
    minRole: "EDITOR",
  },
  {
    label: "Edit Blogs",
    desc: "Update resources & articles",
    href: "/dashboard/blogs",
    icon: FileText,
    minRole: "AUTHOR",
  },
];

export default async function DashboardPage() {
  // Fetch active site context
  const user = await requireAuth();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard/login");
  }
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6 space-y-6 w-full max-w-lg mx-auto">
        <h1 className="dash-page-title text-center text-slate-900 dark:text-white">Dashboard</h1>
        <EmptyState
          icon={AlertCircle}
          title="No active site configuration found"
          description="Please create your first site workspace below to start managing content."
        />
        <CreateFirstSiteForm />
      </div>
    );
  }

  // Fetch site-scoped stats
  const totalPages = await prisma.page.count({
    where: { siteId: site.id, deletedAt: null },
  });

  const totalPosts = await prisma.post.count({
    where: { siteId: site.id, deletedAt: null },
  });
  const totalLeads = await prisma.lead.count({
    where: { siteId: site.id, status: { in: ["new", "contacted"] } },
  });
  const totalTestimonials = await prisma.testimonial.count({
    where: { siteId: site.id, showHide: true },
  });

  // Fetch recent items
  const recentLeads = await prisma.lead.findMany({
    where: { siteId: site.id },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const recentSubmissions = await prisma.contactFormSubmission.findMany({
    where: { siteId: site.id },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const globalRole = user.globalRole || "VIEWER";
  const filteredActions = allActions.filter(
    (action) =>
      hasRole(globalRole, action.minRole) ||
      (action.additionalRoles || []).includes(globalRole)
  );

  return (
    <div className="space-y-6 w-full">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-caption mt-1 flex flex-wrap items-center gap-1.5">
            Overview for{" "}
            <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>
              {site.name}
            </span>
            {site.domain ? `(${site.domain})` : ""}
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded select-all font-semibold"
              style={{
                background: "var(--admin-bg-elevated, #e8edf4)",
                color: "var(--admin-accent, #0f7c85)",
              }}
            >
              {site.id}
            </span>
          </p>
        </div>
        <div className="admin-page-header-actions">
          <span
            className="admin-badge admin-badge-accent"
            style={{ fontSize: "11px", padding: "3px 10px" }}
          >
            {globalRole}
          </span>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Pages" value={totalPages} icon={PlusCircle} />
        <StatCard title="Blog Posts" value={totalPosts} icon={Newspaper} />
        <StatCard title="Open CRM Leads" value={totalLeads} icon={Inbox} />
        <StatCard title="Testimonials (Visible)" value={totalTestimonials} icon={FileText} />
      </div>

      {/* ── Quick Actions ────────────────────────────── */}
      <SectionCard
        title="Quick Actions"
        description="Available tools and controls based on your permission level"
      >
        {filteredActions.length === 0 ? (
          <p className="admin-caption italic">No actions available for your role.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  href={action.href}
                  className="admin-quick-action"
                >
                  <span className="admin-quick-action-icon">
                    <Icon size={15} />
                  </span>
                  <div>
                    <h3
                      className="text-xs font-semibold leading-tight"
                      style={{ color: "var(--admin-text, #0f172a)" }}
                    >
                      {action.label}
                    </h3>
                    <p className="admin-caption mt-0.5 line-clamp-2">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Main Content Grid ────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <SectionCard
          title="Recent CRM Leads"
          action={
            <Link
              href="/crm/leads"
              className="admin-btn admin-btn-ghost text-xs gap-1"
              style={{ color: "var(--admin-accent, #0f7c85)", padding: "4px 8px" }}
            >
              View all <Play size={10} fill="currentColor" />
            </Link>
          }
        >
          {recentLeads.length === 0 ? (
            <EmptyState
              compact
              icon={Inbox}
              title="No leads yet"
              description="Captured CRM leads will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentLeads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between pb-2.5 text-xs"
                  style={{ borderBottom: "1px solid var(--admin-border, #e2e8f0)" }}
                >
                  <div>
                    <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>
                      {item.name}
                    </span>
                    <p className="admin-caption mt-0.5">
                      {item.serviceInterest || "General inquiry"}
                    </p>
                  </div>
                  <Badge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Inquiries */}
        <SectionCard
          title="Recent Inquiries"
          action={
            <Link
              href="/crm/leads"
              className="admin-btn admin-btn-ghost text-xs gap-1"
              style={{ color: "var(--admin-accent, #0f7c85)", padding: "4px 8px" }}
            >
              View inbox <Play size={10} fill="currentColor" />
            </Link>
          }
        >
          {recentSubmissions.length === 0 ? (
            <EmptyState
              compact
              icon={Inbox}
              title="No inquiries yet"
              description="Website contact submissions will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 pb-2.5 text-xs"
                  style={{ borderBottom: "1px solid var(--admin-border, #e2e8f0)" }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>
                      {item.name}
                    </span>
                    <span className="admin-caption">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="admin-caption italic truncate">
                    &quot;{item.message}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* System & Operations */}
        <SectionCard title="System Integrations">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--admin-text-secondary, #334155)" }}>
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: "var(--admin-success, #16a34a)" }}
              />
              MySQL DB Connected
            </div>
            {process.env.CLOUDINARY_CLOUD_NAME && (
              <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--admin-text-secondary, #334155)" }}>
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--admin-success, #16a34a)" }}
                />
                Cloudinary Connected
              </div>
            )}
            {process.env.S3_ENDPOINT && (
              <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--admin-text-secondary, #334155)" }}>
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--admin-success, #16a34a)" }}
                />
                S3/MinIO Connected
              </div>
            )}
            <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--admin-text-secondary, #334155)" }}>
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  background: "var(--admin-accent, #0f7c85)",
                  animation: "admin-spin 3s linear infinite",
                }}
              />
              <span className="admin-caption">
                Server:{" "}
                <span
                  className="font-mono text-[10px] px-1 rounded font-semibold"
                  style={{
                    background: "var(--admin-bg-elevated, #e8edf4)",
                    color: "var(--admin-text, #0f172a)",
                  }}
                >
                  Dev Bypass
                </span>
              </span>
            </div>
          </div>

          <div
            className="mt-5 pt-4 space-y-2"
            style={{ borderTop: "1px solid var(--admin-border, #e2e8f0)" }}
          >
            <p className="admin-label mb-3">Operations</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/dashboard/backup",      label: "Backup" },
                { href: "/dashboard/redirects",   label: "Link Auditor" },
                { href: "/dashboard/faq",          label: "FAQ Editor" },
                { href: "/dashboard/testimonials", label: "Reviews" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-center text-xs font-semibold py-2 px-1 rounded-lg transition-colors truncate"
                  style={{
                    border: "1px solid var(--admin-border, #e2e8f0)",
                    color: "var(--admin-text-secondary, #334155)",
                    background: "var(--admin-surface, #fff)",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
