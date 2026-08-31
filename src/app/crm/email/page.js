import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import EmailEditor from "./EmailEditor";

export default async function EmailSettingsPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="mt-4 text-sm text-red-650">No active site found. Please configure a site in the database.</p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Fetch the existing email settings
  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
    select: { emailSettings: true }
  });

  const emailSettings = settings?.emailSettings || {};

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Email Settings & Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure SMTP connections, auto-reply text alerts, admin alerts, and review SMTP transfer logs for: <span className="font-medium text-gray-800">{site.name}</span> ({site.domain || site.id})
        </p>
      </div>

      <EmailEditor
        siteId={site.id}
        initialEmailSettings={JSON.parse(JSON.stringify(emailSettings))}
      />
    </div>
  );
}
