import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import RedirectsManager from "./RedirectsManager";

export default async function RedirectsPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Redirect rules</h1>
        <p className="mt-4 text-sm text-red-600">
          No active site found. Please configure a site in the database.
        </p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Pre-load redirect rules
  const redirects = await prisma.redirect.findMany({
    where: { siteId: site.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
    select: { websiteSettings: true },
  });
  const initialCustom404 = settings?.websiteSettings?.custom404 || null;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          URLs & Redirect Rules
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Site: <span className="font-medium text-gray-800">{site.name}</span> (
          {site.domain || site.id})
        </p>
      </div>

      <RedirectsManager
        siteId={site.id}
        initialRedirects={JSON.parse(JSON.stringify(redirects))}
        initialCustom404={initialCustom404}
      />
    </div>
  );
}

