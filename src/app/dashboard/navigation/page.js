import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import NavigationEditor from "./NavigationEditor";

export default async function NavigationPage() {
  const user = await requireAuth();
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site in the database.</p>
      </div>
    );
  }

  // Fetch all published/active pages to help user easily bind menu items
  const pages = await prisma.page.findMany({
    where: { siteId: site.id, deletedAt: null },
    select: { title: true, slug: true },
    orderBy: { title: "asc" }
  });

  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
    select: { navigation: true }
  });

  const initialNavigation = settings?.navigation || {};

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Navigation & Menus</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure site header navigation and footer quick links for: <span className="font-medium text-gray-800">{site.name}</span> ({site.domain || site.id})
        </p>
      </div>

      <NavigationEditor
        siteId={site.id}
        initialNavigation={JSON.parse(JSON.stringify(initialNavigation))}
        availablePages={JSON.parse(JSON.stringify(pages))}
      />
    </div>
  );
}

