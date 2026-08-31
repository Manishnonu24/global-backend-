// src/app/(dashboard)/services/page.js
import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import DeleteServiceButton from "./DeleteServiceButton";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { Briefcase, CheckCircle, FileText, Plus, DollarSign, ListOrdered } from "lucide-react";

export const metadata = {
  title: "Service Management | Global Backend Admin",
  description: "Configure business services, pricing tags, CTAs, custom descriptions, and specific page FAQs.",
};

export default async function ServicesAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  // Retrieve site config securely
  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <p className="mt-4 text-sm text-red-600">No active site configured for your profile.</p>
      </div>
    );
  }

  // Retrieve services scoped to this site
  const services = await prisma.service.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate stats metrics
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.status === "ACTIVE").length;
  const draftServices = services.filter((s) => s.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Service Management</h1>
          <p className="admin-caption mt-1">
            Site: <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{site.name}</span> ({site.domain || site.id})
          </p>
        </div>
        <div className="admin-page-header-actions">
          <Link
            href="/dashboard/services/new"
            className="admin-btn admin-btn-primary"
          >
            <Plus size={14} />
            Create Service
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Services",  value: totalServices,  icon: Briefcase,   color: "var(--admin-accent, #0f7c85)" },
          { label: "Active Services", value: activeServices, icon: CheckCircle, color: "var(--admin-success, #16a34a)" },
          { label: "Draft Services",  value: draftServices,  icon: FileText,    color: "var(--admin-text-muted, #64748b)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="admin-stat-card flex-row items-center gap-4" style={{ flexDirection: "row" }}>
            <span
              className="flex-shrink-0 inline-flex p-3 rounded-xl"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
            >
              <Icon size={20} />
            </span>
            <div>
              <p className="admin-label">{label}</p>
              <p className="admin-metric" style={{ fontSize: "1.5rem", marginTop: "2px" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Services Table List */}
      <div className="admin-card-noPad">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service Details & Order</th>
                <th>Price Tag</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th className="text-right" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "var(--admin-accent-soft, rgba(15,124,133,0.10))",
                          color: "var(--admin-accent, #0f7c85)",
                        }}
                      >
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: "var(--admin-text, #0f172a)" }}>{s.title}</span>
                        <span className="text-[10px] font-mono block mt-0.5" style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}>Order Weight: {s.sortOrder}</span>
                      </div>
                    </div>
                  </td>

                  <td style={{ whiteSpace: "nowrap" }} className="font-bold">
                    {s.price || "—"}
                  </td>

                  <td style={{ whiteSpace: "nowrap" }}>
                    {s.status === "ACTIVE" ? (
                      <span className="admin-badge admin-badge-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        Active
                      </span>
                    ) : (
                      <span className="admin-badge admin-badge-neutral">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        Draft
                      </span>
                    )}
                  </td>

                  <td style={{ whiteSpace: "nowrap" }} className="admin-caption">
                    {new Date(s.updatedAt).toLocaleString()}
                  </td>

                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/dashboard/services/${s.id}/edit`}
                        className="admin-btn admin-btn-primary"
                        style={{ fontSize: "11px", padding: "5px 10px" }}
                      >
                        Edit Service
                      </Link>
                      <DeleteServiceButton serviceId={s.id} siteId={site.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {services.length === 0 && (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto mb-2 opacity-20" size={32} style={{ color: "var(--admin-text-muted, #64748b)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--admin-text-muted, #64748b)" }}>No services configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
