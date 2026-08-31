import React from "react";
import PostEditor from "../../PostEditor";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Edit Post | Global Backend Admin",
  description:
    "Edit an existing blog post, update content, categories, featured image, author, schedule and SEO fields.",
};

export default async function EditPostPage({ params: rawParams }) {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Edit Post</h1>
        <p className="text-sm text-rose-600">
          No active site configured for your profile.
        </p>
      </div>
    );
  }

  const { postId } = await rawParams;

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    include: {
      categories: true,
      tags: true,
      featuredImage: true,
      author: { select: { id: true, email: true } },
    },
  });

  if (!post || post.siteId !== site.id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Error</h1>
        <p className="text-sm text-rose-600">
          Post not found or you do not have access to it.
        </p>
      </div>
    );
  }

  // Categories scoped to this site
  const categories = await prisma.category.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { name: "asc" },
  });

  // Authors scoped to this site + global admins
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
          Edit Post
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Editing:{" "}
          <span className="font-semibold text-slate-700">{post.title}</span>
          {" — "}
          Site:{" "}
          <span className="font-semibold text-slate-700">{site.name}</span>
        </p>
      </div>
      <PostEditor
        siteId={site.id}
        post={post}
        categories={categories}
        tags={tags}
        authors={authors}
      />
    </div>
  );
}
