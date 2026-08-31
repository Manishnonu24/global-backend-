import prisma from "@/lib/prisma";
import SecurityConsole from "./SecurityConsole";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";

export default async function SecurityPage() {
  const sessionUser = await requireAuth();

  if (!sessionUser) {
    redirect("/dashboard/login");
  }

  // Get active site configuration
  const site = await getSiteForUser(sessionUser);
  const siteId = site ? site.id : null;

  if (
    sessionUser.globalRole !== "SUPERADMIN" &&
    sessionUser.globalRole !== "ADMIN"
  ) {
    redirect("/dashboard/dashboard");
  }

  return (
    <div className="space-y-6 w-full">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            Security Center
          </h1>
          <p className="admin-caption mt-1">
            Manage your account credentials, configure two-factor authentication,
            and monitor security access.
          </p>
        </div>
      </div>

      <SecurityConsole siteId={siteId} user={sessionUser} />
    </div>
  );
}

