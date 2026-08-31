import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import LegalEditor from "./LegalEditor";

export default async function LegalPagesPage() {
  const user = await requireAuth();
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Legal Pages</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site in the database.</p>
      </div>
    );
  }

  // Fetch all legal pages for this site to pass down as initial state
  const legalPages = await prisma.legalPage.findMany({
    where: {
      siteId: site.id,
      deletedAt: null
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Legal & Compliance Pages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage privacy, terms, cookies, and other compliance agreements for site: <span className="font-medium text-gray-800">{site.name}</span> ({site.domain || site.id})
        </p>
      </div>

      <LegalEditor
        siteId={site.id}
        initialPages={JSON.parse(JSON.stringify(legalPages))}
      />
    </div>
  );
}

