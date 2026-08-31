import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import prisma from "@/lib/prisma";
import { Shield } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Cookie Consent Logs | CRM",
};

export default async function ConsentPage() {
  const user = await requireAuth();
  if (!user) redirect("/login");

  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="p-6 text-sm text-red-600">
        No active site found. Please configure a site first.
      </div>
    );
  }

  const dbLogs = await prisma.cookieConsentLog.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const logs = dbLogs.map((item) => {
    let consentType = "Essential Only";
    if (item.analytics && item.marketing) consentType = "Accept All";
    else if (item.analytics) consentType = "Analytics Only";
    else if (item.marketing) consentType = "Marketing Only";
    else if (!item.accepted) consentType = "Declined";

    return {
      visitorId: item.visitorId,
      consentType,
      accepted: item.accepted,
      timestamp: item.createdAt,
    };
  });

  const acceptedCount = logs.filter((l) => l.accepted).length;
  const acceptanceRate = logs.length > 0 ? Math.round((acceptedCount / logs.length) * 100) : 0;

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          GDPR Cookie Consent Logs
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Review visitor privacy agreements and opt-in settings for tracking
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Total Consent Events</span>
          <p className="text-2xl font-bold mt-1">{logs.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Accepted Count</span>
          <p className="text-2xl font-bold mt-1 text-green-600">{acceptedCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Acceptance Rate</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600">{acceptanceRate}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Shield className="mx-auto text-slate-300" size={32} />
            <p className="font-semibold">No consent activities recorded yet.</p>
            <p>When visitors accept or decline cookies on your frontend, their choices will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3">Visitor ID</th>
                <th className="p-3">Consent Type</th>
                <th className="p-3">Accepted</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {logs.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="p-3 font-mono text-[10px] text-slate-900 dark:text-slate-100">{item.visitorId}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 capitalize">{item.consentType}</td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                      item.accepted ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      {item.accepted ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-[10px]">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
