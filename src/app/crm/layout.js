import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";

export const dynamic = "force-dynamic";

export default async function Layout({ children }) {
  const user = await requireAuth();

  if (!user) {
    redirect("/dashboard/login");
  }

  const allowedRoles = ["SUPERADMIN", "ADMIN", "MARKETING"];
  if (!allowedRoles.includes(user.globalRole)) {
    redirect("/");
  }

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";
  const connectedSiteId = siteId;
  let sites = [];
  const connectedSite = await prisma.site.findUnique({
    where: { id: connectedSiteId, deletedAt: null },
    select: { id: true, name: true }
  });
  if (connectedSite) {
    sites = [connectedSite];
  }

  return (
    <DashboardLayout siteId={siteId} sites={sites}>
      {children}
    </DashboardLayout>
  );
}
