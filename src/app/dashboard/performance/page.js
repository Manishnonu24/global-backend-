import prisma from "@/lib/prisma";
import PerformanceConsole from "./PerformanceConsole";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";

export default async function PerformancePage(props) {
  const searchParams = await props?.searchParams;
  const sessionUser = await requireAuth();

  if (!sessionUser) {
    redirect("/dashboard/login");
  }

  const isAdmin = sessionUser.globalRole === "SUPERADMIN" || sessionUser.globalRole === "ADMIN";
  if (!isAdmin) {
    redirect("/dashboard/dashboard");
  }

  const site = await getSiteForUser(sessionUser);
  const siteId = site ? site.id : null;
  const initialTab = searchParams?.tab || "health";

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Performance & System Diagnostics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor application health, audit system exceptions, and configure asset optimization rules.
        </p>
      </div>

      <PerformanceConsole siteId={siteId} user={sessionUser} initialTab={initialTab} />
    </div>
  );
}

