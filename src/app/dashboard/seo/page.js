import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import SeoDashboardClient from "./SeoDashboardClient";

export default async function SeoPage() {
  const user = await requireAuth();
  if (!user) redirect("/dashboard/login");
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">SEO Management</h1>
        <p className="mt-4 text-sm text-red-600">No active site found.</p>
      </div>
    );
  }

  const isSuperAdmin = user.globalRole === "SUPERADMIN";

  const [pages, posts, services, magazines, quizTypes, recipes, legalPages] = await Promise.all([
    prisma.page.findMany({
      where: { siteId: site.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        pageType: true,
        seoTitle: true,
        seoKeywords: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.post.findMany({
      where: { siteId: site.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.service.findMany({
      where: { siteId: site.id, deletedAt: null, visibility: "PUBLIC" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.magazine.findMany({
      where: isSuperAdmin
        ? { OR: [{ siteId: site.id }, { siteId: null }] }
        : { siteId: site.id },
      select: {
        id: true,
        siteId: true,
        title: true,
        slug: true,
        status: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
    }),
    prisma.quizType.findMany({
      where: isSuperAdmin
        ? { OR: [{ siteId: site.id }, { siteId: null }] }
        : { siteId: site.id },
      select: {
        id: true,
        siteId: true,
        title: true,
        slug: true,
        isActive: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.recipe.findMany({
      where: isSuperAdmin
        ? { status: "APPROVED", OR: [{ siteId: site.id }, { siteId: null }] }
        : { status: "APPROVED", siteId: site.id },
      select: {
        id: true,
        siteId: true,
        title: true,
        status: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.legalPage.findMany({
      where: { siteId: site.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        published: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        canonicalUrl: true,
        jsonLd: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6 w-full">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">SEO Management</h1>
          <p className="admin-caption mt-1">
            Site: <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{site.name}</span> ({site.domain || site.id})
          </p>
        </div>
      </div>

      <SeoDashboardClient
        siteId={site.id}
        userRole={user.globalRole}
        domain={site.domain || process.env.NEXT_PUBLIC_APP_URL || "https://ahealthplace.com"}
        initialPages={JSON.parse(JSON.stringify(pages))}
        initialPosts={JSON.parse(JSON.stringify(posts))}
        initialServices={JSON.parse(JSON.stringify(services))}
        initialMagazines={JSON.parse(JSON.stringify(magazines))}
        initialQuizTypes={JSON.parse(JSON.stringify(quizTypes))}
        initialRecipes={JSON.parse(JSON.stringify(recipes))}
        initialLegalPages={JSON.parse(JSON.stringify(legalPages))}
      />
    </div>
  );
}
