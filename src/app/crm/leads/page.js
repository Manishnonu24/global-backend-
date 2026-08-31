import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import LeadsManager from "./LeadsManager";

export const metadata = {
  title: "Leads & Contact Forms | Marketing CRM",
  description: "Manage contact form submissions, leads pipeline, email settings and spam protection",
};

export default async function LeadsPage({ searchParams: rawSearchParams }) {
  const user = await requireAuth();
  if (!user) return null;
  if (user.globalRole === "VIEWER") redirect("/dashboard/dashboard");

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Leads & Contact Forms</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site first.</p>
      </div>
    );
  }

  const searchParams = await rawSearchParams;
  const subPage = parseInt(searchParams?.subPage || "1", 10);
  const leadPage = parseInt(searchParams?.leadPage || "1", 10);
  const PAGE_SIZE = 50;
  
  const query = searchParams?.q || "";
  const subWhere = { siteId: site.id, deletedAt: null };
  const leadWhere = { 
    siteId: site.id, 
    deletedAt: null,
    NOT: [
      { serviceInterest: "Contact Form Submission" },
      { sourcePage: "Contact Page" }
    ]
  };

  if (query) {
    subWhere.OR = [
      { name: { contains: query } },
      { email: { contains: query } },
      { message: { contains: query } },
    ];
    leadWhere.AND = [
      {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { notes: { contains: query } },
        ]
      }
    ];
  }

  const [submissions, submissionsTotal, leads, leadsTotal, settings] = await Promise.all([
    prisma.contactFormSubmission.findMany({
      where: subWhere,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (subPage - 1) * PAGE_SIZE,
    }),
    prisma.contactFormSubmission.count({ where: subWhere }),
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (leadPage - 1) * PAGE_SIZE,
    }),
    prisma.lead.count({ where: leadWhere }),
    prisma.globalSettings.findUnique({
      where: { siteId: site.id },
      select: { emailSettings: true, securityControls: true },
    }),
  ]);

  // Sanitize email settings: never expose password to client
  const emailSettings = settings?.emailSettings
    ? { ...settings.emailSettings, password: settings.emailSettings.password ? "********" : "" }
    : {};

  const initialConfig = {
    emailSettings,
    spamConfig: settings?.securityControls || {},
  };

  return (
    <LeadsManager
      siteId={site.id}
      initialSubmissions={JSON.parse(JSON.stringify(submissions))}
      submissionsTotal={submissionsTotal}
      initialLeads={JSON.parse(JSON.stringify(leads))}
      leadsTotal={leadsTotal}
      initialConfig={initialConfig}
    />
  );
}
