// src/app/(dashboard)/pages/page.js
import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import CreatePageForm from "./CreatePageForm";
import PublishToggle from "./PublishToggle";
import DeletePageButton from "./DeletePageButton";
import { redirect } from "next/navigation";
import { getPageCapabilities } from '@/lib/pageCapabilities';
import { isDynamicRoutePattern } from '@/lib/routeClassification';
import { requireAuth } from '@/lib/requireAuth';
import { getSiteForUser } from "@/lib/getSiteForUser";
import { headers } from "next/headers";
import {
  FileText,
  Eye,
  Edit2,
  FilePlus2,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

export const metadata = {
  title: "Pages Management | Global Backend Admin",
  description:
    "Create pages, edit layouts, modify text/images, and toggle publishing statuses.",
};

function resolveFrontendUrl(value, requestHost) {
  const fallback = process.env.FRONTEND_URL || "http://localhost:3001";

  if (requestHost) {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    if (!value || value.includes("localhost") || value.includes("127.0.0.1")) {
      return `${protocol}://${requestHost}`;
    }
  }

  const raw = (value || fallback).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.href.replace(/\/+$/, "");
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

export default async function PagesAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <p className="mt-4 text-sm text-red-655">
          No active tenant site configured for your profile.
        </p>
      </div>
    );
  }

  // Fetch frontend URL from settings
  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
    select: { websiteSettings: true },
  });
  const requestHeaders = await headers();
  const frontendUrl = resolveFrontendUrl(
    settings?.websiteSettings?.domain,
    requestHeaders.get("host")
  );

  // Retrieve all pages under this site
  const pages = await prisma.page.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate metrics
  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === "PUBLISHED").length;
  const draftPages = pages.filter((p) => p.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Pages Manager</h1>
          <p className="admin-caption mt-1">
            Site:{" "}
            <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>
              {site.name}
            </span>{" "}
            ({site.domain || site.id})
          </p>
        </div>
        <div className="admin-page-header-actions">
          <CreatePageForm siteId={site.id} />
        </div>
      </div>

      {/* ── Metrics Row ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Pages",  value: totalPages,     icon: FileText,   color: "var(--admin-accent, #0f7c85)" },
          { label: "Published",    value: publishedPages, icon: CheckCircle, color: "var(--admin-success, #16a34a)" },
          { label: "Drafts",       value: draftPages,     icon: FilePlus2,  color: "var(--admin-text-muted, #64748b)" },
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

      {/* ── Pages Table ──────────────────────────────── */}
      <div className="admin-card-noPad">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Page Title & ID</th>
                <th>Slug Path</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th className="text-right" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  {/* Title column */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "var(--admin-accent-soft, rgba(15,124,133,0.10))",
                          color: "var(--admin-accent, #0f7c85)",
                        }}
                      >
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs" style={{ color: "var(--admin-text, #0f172a)" }}>
                            {p.title}
                          </span>
                          {p.isHardcoded && (
                            <span className="admin-badge admin-badge-warning" style={{ fontSize: "9px", padding: "1px 6px" }}>
                              🔒 Fixed Route
                            </span>
                          )}
                          {isDynamicRoutePattern(p.slug) && (
                            <span className="admin-badge admin-badge-info" style={{ fontSize: "9px", padding: "1px 6px" }}>
                              🌐 Dynamic
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono block mt-0.5" style={{ color: "var(--admin-text-xmuted, #94a3b8)" }}>
                          {p.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Slug column */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a
                      href={`${frontendUrl}${p.slug || "/"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs px-2 py-1 rounded transition-colors"
                      style={{
                        color: "var(--admin-accent, #0f7c85)",
                        background: "var(--admin-accent-soft, rgba(15,124,133,0.08))",
                        border: "1px solid var(--admin-border, #e2e8f0)",
                      }}
                    >
                      {p.slug || "/"}
                    </a>
                  </td>

                  {/* Status column */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    {!getPageCapabilities(p).canPublish ? (
                      <span className="admin-badge admin-badge-neutral">Always Active</span>
                    ) : p.status === "PUBLISHED" ? (
                      <span className="admin-badge admin-badge-success">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-current"
                          style={{ flexShrink: 0 }}
                        />
                        Published
                      </span>
                    ) : (
                      <span className="admin-badge admin-badge-neutral">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" style={{ flexShrink: 0 }} />
                        Draft
                      </span>
                    )}
                  </td>

                  {/* Updated column */}
                  <td style={{ whiteSpace: "nowrap" }} className="admin-caption">
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>

                  {/* Actions column */}
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      {(() => {
                        const caps = getPageCapabilities(p);
                        const isDynamic = isDynamicRoutePattern(p.slug);
                        
                        if (isDynamic) {
                          return (
                            <span className="admin-caption italic">
                              Managed via feature dashboard
                            </span>
                          );
                        }

                        return (
                          <>
                            {(caps.canEditContent || caps.canEditMetadata) && (
                              <Link
                                href={`/dashboard/pages/${p.id}/edit`}
                                className="admin-btn admin-btn-primary"
                                style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "9999px" }}
                              >
                                <Edit2 size={12} />
                                Edit
                              </Link>
                            )}

                            {caps.canPreview && (
                              <a
                                href={`${frontendUrl}/api/dashboard/pages/${p.id}/preview`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn"
                                style={{
                                  fontSize: "11px",
                                  padding: "5px 10px",
                                  borderRadius: "9999px",
                                  background: "var(--admin-success, #16a34a)",
                                  color: "#fff",
                                }}
                              >
                                <Eye size={12} />
                                Preview
                              </a>
                            )}

                            {(caps.canPublish || caps.canDisable) && (
                              <PublishToggle
                                pageId={p.id}
                                initialStatus={p.status}
                                siteId={site.id}
                              />
                            )}

                            {caps.canSoftDelete && (
                              <DeletePageButton pageId={p.id} siteId={site.id} />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-2 opacity-20" size={32} style={{ color: "var(--admin-text-muted)" }} />
            <p className="admin-body-text font-semibold">No pages created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
