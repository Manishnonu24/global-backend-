import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteIdForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import ContactDetailsEditor from "./ContactDetailsEditor";

export const metadata = {
  title: "Contact Details | Global Backend Admin",
  description: "Manage business contact information, business hours and social links",
};

export default async function ContactPage() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  const siteId = await getSiteIdForUser(user);

  let initialData = null;
  if (siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { contactDetails: true },
    });
    initialData = settings?.contactDetails || null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ContactDetailsEditor siteId={siteId} initialData={initialData} />
    </div>
  );
}

