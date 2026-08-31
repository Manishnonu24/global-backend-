import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import BackupConsole from "./BackupConsole";

export default async function BackupPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <p className="mt-4 text-sm text-red-600">
          No active site found. Please configure a site in the database.
        </p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Fetch current backup history list
  const settings = await prisma.globalSettings.findFirst({
    where: { siteId: site.id },
    select: { devTools: true },
  });

  const devTools = settings?.devTools || {};
  const backupHistory = devTools.backupHistory || [];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Backup & Restore Console
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Site: <span className="font-medium text-gray-800">{site.name}</span> (
          {site.domain || site.id})
        </p>
      </div>

      <BackupConsole siteId={site.id} initialHistory={backupHistory} />
    </div>
  );
}

