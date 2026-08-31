import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import ServicesBookingsManager from "./ServicesBookingsManager";

export const metadata = {
  title: "Service Bookings | Marketing CRM",
  description: "Manage all media partnership service booking requests and form completions.",
};

export default async function ServicesBookingsPage() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Service Bookings</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site first.</p>
      </div>
    );
  }

  // Fetch ONLY leads from the services booking form
  // Identified by their sourcePage — excludes contact page leads
  const SERVICE_SOURCE_PAGES = [
    "Services Booking Form",
    "Services Secret Portal",
    "Services Page",
  ];

  const [bookingLeads, services, emailSettings] = await Promise.all([
    prisma.lead.findMany({
      where: {
        siteId: site.id,
        deletedAt: null,
        sourcePage: { in: SERVICE_SOURCE_PAGES },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { siteId: site.id, deletedAt: null },
      select: { id: true, title: true, price: true },
    }),
    prisma.globalSettings.findUnique({
      where: { siteId: site.id },
      select: { emailSettings: true },
    }),
  ]);

  // serviceLeads = only real service bookings (sourcePage already filtered above)
  const serviceLeads = bookingLeads;

  const safeEmailSettings = emailSettings?.emailSettings
    ? { ...emailSettings.emailSettings, password: "********" }
    : {};

  return (
    <ServicesBookingsManager
      siteId={site.id}
      initialLeads={JSON.parse(JSON.stringify(serviceLeads))}
      services={JSON.parse(JSON.stringify(services))}
      emailSettings={safeEmailSettings}
    />
  );
}
