"use client";

import { useState } from "react";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import DataTable from "@/components/dashboard/ui/DataTable";
import Badge from "@/components/dashboard/ui/Badge";
import { RefreshCw, Download, FileSpreadsheet } from "lucide-react";

export default function CrmReportsTab({ siteId }) {
  const [reportType, setReportType] = useState("overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportResults, setReportResults] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const generateReport = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    setReportError(null);
    setReportResults(null);

    try {
      let url = `/api/dashboard/analytics/custom-reports?type=${reportType}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url, {
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (res.ok) {
        setReportResults(json.data || json);
      } else {
        throw new Error(json.error || "Failed to fetch report data");
      }
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const trafficColumns = [
    {
      key: "createdAt",
      label: "Timestamp",
      sortable: true,
      render: (val) => (
        <span className="font-mono text-[11px] text-[var(--color-muted)]">
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      key: "pageViewed",
      label: "Page Viewed",
      sortable: true,
      render: (val) => <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>,
    },
    {
      key: "trafficSource",
      label: "Referrer/Source",
      render: (val) => val || "Direct",
    },
    {
      key: "duration",
      label: "Duration",
      align: "center",
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-[var(--color-accent)]">{val}s</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="dash-section-title text-slate-900 dark:text-white">Custom Reports Generator</h2>
        <p className="dash-caption mt-0.5">Query site activity and CRM details. Export query logs to JSON formats.</p>
      </div>

      <form onSubmit={generateReport} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 border border-[var(--color-border)] dark:border-slate-800 rounded-[var(--radius-card)] bg-slate-50/60 dark:bg-slate-800/40">
        <div className="space-y-1">
          <label className="dash-caption font-bold uppercase">Dataset Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs bg-white dark:bg-slate-800 outline-none">
            <option value="overview">Executive Overview</option>
            <option value="traffic">Traffic Logs</option>
            <option value="crm">CRM Leads & Subscribers</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="dash-caption font-bold uppercase">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs bg-white dark:bg-slate-800 outline-none" />
        </div>
        <div className="space-y-1">
          <label className="dash-caption font-bold uppercase">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs bg-white dark:bg-slate-800 outline-none" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={reportLoading} className="w-full bg-[var(--color-accent)] hover:opacity-90 text-white rounded-[var(--radius-input)] py-2 text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50">
            <RefreshCw size={12} className={reportLoading ? "animate-spin" : ""} /> {reportLoading ? "Querying..." : "Generate Dataset"}
          </button>
        </div>
      </form>

      {reportError && <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-[var(--radius-input)]">{reportError}</div>}

      {reportResults && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="dash-section-title text-slate-900 dark:text-white">Query Results Table</h3>
            <a
              href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(reportResults, null, 2))}`}
              download={`CRM_Report_${reportType}_${new Date().toISOString().split("T")[0]}.json`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download size={13} /> Export JSON
            </a>
          </div>

          {/* Display Result Sheets based on Type */}
          {reportType === "overview" && reportResults.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="dash-card text-center">
                <div className="dash-caption font-bold uppercase">Traffic Pageviews</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{reportResults.data.totalPageViews}</div>
              </div>
              <div className="dash-card text-center">
                <div className="dash-caption font-bold uppercase">Unique Visitors</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{reportResults.data.uniqueVisitors}</div>
              </div>
              <div className="dash-card text-center">
                <div className="dash-caption font-bold uppercase">New Leads</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{reportResults.data.crmLeads}</div>
              </div>
              <div className="dash-card text-center">
                <div className="dash-caption font-bold uppercase">Newsletter Signups</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{reportResults.data.crmSubscribers}</div>
              </div>
            </div>
          )}

          {reportType === "traffic" && Array.isArray(reportResults.data) && (
            <SectionCard noPadding>
              <DataTable
                columns={trafficColumns}
                rows={reportResults.data}
                emptyIcon={FileSpreadsheet}
                emptyTitle="No traffic records"
              />
            </SectionCard>
          )}

          {reportType === "crm" && reportResults.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Leads Captured">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {reportResults.data.leads?.map((lead) => (
                    <div key={lead.id} className="text-xs pb-2 border-b border-[var(--color-border)] dark:border-slate-700/60 last:border-0 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span>
                        <span className="dash-caption block">Interest: {lead.serviceInterest || "None"}</span>
                      </div>
                      <Badge status={lead.status} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Subscribers Active">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {reportResults.data.subscribers?.map((sub) => (
                    <div key={sub.id} className="text-xs pb-2 border-b border-[var(--color-border)] dark:border-slate-700/60 last:border-0 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.name || sub.email}</span>
                        <span className="dash-caption block">{sub.email}</span>
                      </div>
                      <Badge status={sub.status} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
