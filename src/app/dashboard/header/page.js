import prisma from "@/lib/prisma";
import HeaderEditor from "./HeaderEditor";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Header Builder | Global Backend Admin",
  description: "Customize layout, logo, sticky behaviour, and mobile navigation headers",
};

export default async function HeaderPage() {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Header Builder</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site first.</p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Retrieve current header configuration and navigation menus
  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
    select: { header: true, navigation: true }
  });

  const headerConfig = settings?.header || null;
  const menuTypes = Object.keys(settings?.navigation || { main: [], footer: [] });

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Header Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Site: <span className="font-medium text-gray-800">{site.name}</span> ({site.domain || site.id})
        </p>
      </div>

      <HeaderEditor
        siteId={site.id}
        initialConfig={headerConfig}
        menuTypes={menuTypes}
        navigation={settings?.navigation || {}}
      />
    </div>
  );
}

