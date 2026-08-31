import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import DeletePostButton from "./DeletePostButton";
import CategoryManager from "./CategoryManager";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import {
  FileText,
  CheckCircle,
  Clock,
  CalendarClock,
  Plus,
  Tag,
  User,
} from "lucide-react";
import { getPaginationRange } from "@/lib/pagination";

export const metadata = {
  title: "Blog & Resources | Global Backend Admin",
  description:
    "Manage blog posts, categories, author assignments, featured images, and scheduled publications.",
};

export default async function BlogsAdmin({ searchParams: rawSearchParams }) {
  const user = await requireAuth();
  if (!user) redirect("/dashboard/login");
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Blog & Resources</h1>
        <p className="mt-4 text-sm text-rose-600">
          No active site configured for your profile.
        </p>
      </div>
    );
  }

  const searchParams = await rawSearchParams;
  const statusFilter = searchParams?.status || "ALL";
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10));
  const pageSize = 10;
  const skip = (currentPage - 1) * pageSize;

  // Build posts query
  const where = { siteId: site.id, deletedAt: null };
  if (statusFilter === "PUBLISHED") {
    where.status = "PUBLISHED";
    where.publishedAt = { lte: new Date() };
  } else if (statusFilter === "DRAFT") {
    where.status = "DRAFT";
  } else if (statusFilter === "SCHEDULED") {
    where.publishedAt = { gt: new Date() };
  }

  const now = new Date();

  const [posts, filteredCount, totalCount, publishedCount, draftCount, scheduledCount, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        author: { select: { id: true, email: true } },
        categories: true,
        featuredImage: { select: { url: true, secureUrl: true, altText: true } },
      },
    }),
    prisma.post.count({ where }),
    prisma.post.count({ where: { siteId: site.id, deletedAt: null } }),
    // Published: status=PUBLISHED AND publishedAt <= now
    prisma.post.count({
      where: { siteId: site.id, deletedAt: null, status: "PUBLISHED", publishedAt: { lte: now } },
    }),
    // Draft: status=DRAFT AND (no publishedAt OR publishedAt <= now)
    prisma.post.count({
      where: {
        siteId: site.id,
        deletedAt: null,
        status: "DRAFT",
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
    }),
    // Scheduled: publishedAt is in the future (regardless of status)
    prisma.post.count({ where: { siteId: site.id, deletedAt: null, publishedAt: { gt: now } } }),
    prisma.category.findMany({
      where: { siteId: site.id },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            posts: {
              where: { siteId: site.id, deletedAt: null },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(filteredCount / pageSize);
  const sortedPosts = posts;

  const filters = [
    { label: "All Posts", value: "ALL", count: totalCount },
    { label: "Published", value: "PUBLISHED", count: publishedCount },
    { label: "Draft", value: "DRAFT", count: draftCount },
    { label: "Scheduled", value: "SCHEDULED", count: scheduledCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            Blog & Resources
          </h1>
          <p className="admin-caption mt-1">
            Site:{" "}
            <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{site.name}</span>{" "}
            ({site.domain || site.id})
          </p>
        </div>
        <div className="admin-page-header-actions">
          <Link
            href="/dashboard/blogs/new"
            className="admin-btn admin-btn-primary"
          >
            <Plus size={14} />
            Create New Post
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: totalCount, icon: FileText, color: "var(--admin-accent, #0f7c85)" },
          { label: "Published", value: publishedCount, icon: CheckCircle, color: "var(--admin-success, #16a34a)" },
          { label: "Drafts", value: draftCount, icon: Clock, color: "var(--admin-text-muted, #64748b)" },
          { label: "Scheduled", value: scheduledCount, icon: CalendarClock, color: "var(--admin-warning, #ca8a04)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="admin-stat-card flex-row items-center gap-3" style={{ flexDirection: "row" }}>
            <span
              className="flex-shrink-0 inline-flex p-2.5 rounded-xl"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="admin-label break-words whitespace-normal" title={label}>{label}</p>
              <p className="admin-metric truncate" style={{ fontSize: "1.25rem", marginTop: "2px" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content area: table + categories sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Posts table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter Tabs */}
          <div className="admin-tabs">
            {filters.map((f) => {
              const isActive = statusFilter === f.value;
              return (
                <Link
                  key={f.value}
                  href={`/dashboard/blogs${f.value === "ALL" ? "" : `?status=${f.value}`}`}
                  className={`admin-tab ${isActive ? "is-active" : ""}`}
                >
                  {f.label}
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ml-1"
                    style={{
                      background: isActive
                        ? "color-mix(in srgb, var(--admin-accent, #0f7c85) 15%, transparent)"
                        : "var(--admin-bg-elevated, #e8edf4)",
                      color: isActive
                        ? "var(--admin-accent, #0f7c85)"
                        : "var(--admin-text-muted, #64748b)",
                    }}
                  >
                    {f.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Table */}
          <div className="admin-card-noPad">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Categories</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Publish Date</th>
                    <th className="text-right" style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center" style={{ textAlign: "center" }}>
                        <div className="flex flex-col items-center justify-center">
                          <FileText
                            className="mx-auto mb-2 opacity-20"
                            size={36}
                            style={{ color: "var(--admin-text-muted, #64748b)" }}
                          />
                          <p className="text-sm font-semibold" style={{ color: "var(--admin-text-muted, #64748b)" }}>
                            No posts found.
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {statusFilter !== "ALL"
                              ? "Try changing the filter above."
                              : "Create your first blog post!"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedPosts.map((post) => {
                      const isScheduled =
                        post.publishedAt && new Date(post.publishedAt) > now;
                      const isPublished =
                        post.status === "PUBLISHED" &&
                        (!post.publishedAt ||
                          new Date(post.publishedAt) <= now);
                      const coverUrl =
                        post.featuredImage?.secureUrl ||
                        post.featuredImage?.url;

                      // Author initials
                      const authorEmail = post.author?.email || "System";
                      const initials = authorEmail
                        .split("@")[0]
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={post.id}
                          className="group hover:bg-slate-50/40 transition-colors duration-100"
                        >
                          {/* Post title + slug + thumbnail */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {coverUrl ? (
                                <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={coverUrl}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-9 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center border border-slate-100">
                                  <FileText
                                    size={14}
                                    className="text-slate-300"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate max-w-[220px]">
                                  {post.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                                  /{post.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Categories */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {post.categories.length === 0 ? (
                                <span className="text-slate-300 italic text-[10px]">
                                  None
                                </span>
                              ) : (
                                post.categories.map((cat) => (
                                  <span
                                    key={cat.id}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                                  >
                                    <Tag size={8} />
                                    {cat.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Author */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <span className="text-slate-600 text-[11px] truncate max-w-[100px]">
                                {authorEmail}
                              </span>
                            </div>
                          </td>

                          {/* Status badge */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {isScheduled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <CalendarClock size={9} />
                                Scheduled
                              </span>
                            ) : isPublished ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Draft
                              </span>
                            )}
                          </td>

                          {/* Publish date */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {post.publishedAt ? (
                              <div>
                                <div className="text-slate-600 text-[11px] font-medium">
                                  {new Date(
                                    post.publishedAt,
                                  ).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(
                                    post.publishedAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic text-[10px]">
                                Not set
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/dashboard/blogs/${post.id}/edit`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                              >
                                Edit Post
                              </Link>
                              <DeletePostButton
                                postId={post.id}
                                siteId={site.id}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredCount)}</span> of{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">{filteredCount}</span> posts
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentPage > 1 ? (
                      <Link
                        href={`/dashboard/blogs?status=${statusFilter}&page=${currentPage - 1}`}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed">
                        Previous
                      </span>
                    )}

                    {getPaginationRange(currentPage, totalPages).map((page, idx) => {
                      if (typeof page === "string" && page.startsWith("...")) {
                        const isLeft = page === "...left" || (page === "..." && idx < 4);
                        const jumpTarget = isLeft
                          ? Math.max(1, currentPage - 5)
                          : Math.min(totalPages, currentPage + 5);

                        return (
                          <Link
                            key={`dots-${idx}`}
                            href={`/dashboard/blogs?status=${statusFilter}&page=${jumpTarget}`}
                            title={isLeft ? "Previous 5 pages" : "Next 5 pages"}
                            className="w-7 h-7 text-slate-400 hover:text-[#0f7c85] transition-colors font-bold text-xs tracking-widest flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            …
                          </Link>
                        );
                      }

                      const pageNum = Number(page);
                      const isActive = currentPage === pageNum;

                      return (
                        <Link
                          key={pageNum}
                          href={`/dashboard/blogs?status=${statusFilter}&page=${pageNum}`}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition flex items-center justify-center ${
                            isActive
                              ? "bg-[#0f7c85] text-white shadow-sm"
                              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}

                    {currentPage < totalPages ? (
                      <Link
                        href={`/dashboard/blogs?status=${statusFilter}&page=${currentPage + 1}`}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category sidebar */}
        <div className="lg:col-span-1">
          <CategoryManager initialCategories={categories} siteId={site.id} />
        </div>
      </div>
    </div>
  );
}

