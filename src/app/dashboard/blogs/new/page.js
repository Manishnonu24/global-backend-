import React from "react";
import PostEditor from "../PostEditor";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Create New Post | Global Backend Admin",
  description:
    "Write and publish a new blog post with categories, featured image, author assignment, scheduling and SEO fields.",
};

export default async function NewPostPage() {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Create New Post</h1>
        <p className="text-sm text-rose-600">
          No active site configured for your profile.
        </p>
      </div>
    );
  }

  // Categories scoped to this site
  const categories = await prisma.category.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { name: "asc" },
  });

  // Authors scoped to this site via SiteUser memberships + global admins
  const siteUsers = await prisma.siteUser.findMany({
    where: { siteId: site.id, deletedAt: null },
    include: { user: { select: { id: true, email: true } } },
  });

  const globalAdmins = await prisma.user.findMany({
    where: {
      globalRole: { in: ["SUPERADMIN", "ADMIN"] },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, email: true },
  });

  const authorMap = new Map();
  siteUsers.forEach((su) => {
    if (su.user) authorMap.set(su.user.id, su.user);
  });
  globalAdmins.forEach((admin) => {
    authorMap.set(admin.id, admin);
  });

  const authors = Array.from(authorMap.values());

  // Tags scoped to this site
  const tags = await prisma.tag.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Create New Post
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Site:{" "}
          <span className="font-semibold text-slate-700">{site.name}</span>
        </p>
      </div>
      <PostEditor
        siteId={site.id}
        categories={categories}
        tags={tags}
        authors={authors}
      />
    </div>
  );
}

