import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import ImportConsole from "./ImportConsole";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Import & Restore | Dashboard",
  description: "Import content from CSV, JSON, XML, or SQL files with atomic rollback support.",
};

export default async function ImportPage() {
  const user = await requireAuth();
  if (!user) redirect("/dashboard/login");

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";

  return <ImportConsole siteId={siteId} userId={user.id} userRole={user.globalRole} />;
}
