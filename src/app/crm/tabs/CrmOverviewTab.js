"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import StatCard from "@/components/dashboard/StatCard";
import Badge from "@/components/dashboard/ui/Badge";
import {
  Users,
  Inbox,
  DollarSign,
  TrendingUp,
  Mail,
  PlusCircle,
  Bell,
} from "lucide-react";

export default function CrmOverviewTab({
  siteId,
  initialStats,
  initialTrends,
  initialCampaignPerformance,
  recentSubscribers,
}) {
  const [stats, setStats] = useState(
    initialStats || {
      crmSubscribers: 0,
      crmLeads: 0,
      totalPipelineValue: 0,
      conversionRate: 0,
      totalPageViews: 0,
    }
  );
  const [trends, setTrends] = useState(initialTrends || []);
  const [campaigns, setCampaigns] = useState(initialCampaignPerformance || []);
  const [subscribers, setSubscribers] = useState(recentSubscribers || []);
  const [loading, setLoading] = useState(!initialStats);
  const [range, setRange] = useState("30");

  const refreshOverviewData = useCallback(async (newRange = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm?range=${newRange}`, {
        headers: { "x-site-id": siteId },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setStats(json.data.stats);
        setTrends(json.data.trends);
        setCampaigns(json.data.campaignsPerf);
        setSubscribers(json.data.recentSubscribers || []);
      }
    } catch (err) {
      console.error("Failed to refresh CRM stats", err);
    } finally {
      setLoading(false);
    }
  }, [siteId, range]);

  useEffect(() => {
    let active = true;
    if (!initialStats && siteId) {
      fetch(`/api/crm?range=${range}`, {
        headers: { "x-site-id": siteId },
      })
        .then((res) => res.json())
        .then((json) => {
          if (active && json.success && json.data) {
            setStats(json.data.stats);
            setTrends(json.data.trends);
            setCampaigns(json.data.campaignsPerf);
            setSubscribers(json.data.recentSubscribers || []);
          }
        })
        .catch((err) => console.error("Failed to refresh CRM stats", err))
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => { active = false; };
  }, [initialStats, siteId, range]);

  const handleRangeChange = (e) => {
    const val = e.target.value;
    setRange(val);
    refreshOverviewData(val);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions / Shortcuts */}
      <SectionCard title="CRM Workspace Shortcuts">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/crm/campaigns"
            className="flex flex-col p-3.5 bg-white dark:bg-slate-800 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] hover:border-[var(--color-accent)] transition-colors duration-[var(--dur-fast)]"
          >
            <Mail size={16} className="text-[var(--color-accent)] mb-2" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">New Campaign</h3>
            <p className="dash-caption mt-0.5">Draft a new email broadcast</p>
          </Link>
          <Link
            href="/crm/subscribers"
            className="flex flex-col p-3.5 bg-white dark:bg-slate-800 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] hover:border-[var(--color-accent)] transition-colors duration-[var(--dur-fast)]"
          >
            <Users size={16} className="text-[var(--color-accent)] mb-2" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Import Contacts</h3>
            <p className="dash-caption mt-0.5">Upload CSV subscriber list</p>
          </Link>
          <Link
            href="/crm/templates"
            className="flex flex-col p-3.5 bg-white dark:bg-slate-800 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] hover:border-[var(--color-accent)] transition-colors duration-[var(--dur-fast)]"
          >
            <PlusCircle size={16} className="text-[var(--color-accent)] mb-2" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">New Template</h3>
            <p className="dash-caption mt-0.5">Create newsletter template</p>
          </Link>
          <Link
            href="/crm/push"
            className="flex flex-col p-3.5 bg-white dark:bg-slate-800 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] hover:border-[var(--color-accent)] transition-colors duration-[var(--dur-fast)]"
          >
            <Bell size={16} className="text-[var(--color-accent)] mb-2" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Send Push</h3>
            <p className="dash-caption mt-0.5">Broadcast web push alert</p>
          </Link>
        </div>
      </SectionCard>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Subscribers" value={stats.crmSubscribers} icon={Users} />
        <StatCard title="Lead Inflow" value={stats.crmLeads} icon={Inbox} />
        <StatCard title="Total Pageviews" value={stats.totalPageViews} icon={TrendingUp} />
      </div>

      {/* Traffic Chart */}
      <SectionCard
        title={`Pageview Trends (Last ${range} Days)`}
        action={
          <div className="flex items-center gap-1 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800">
            <select
              value={range}
              onChange={handleRangeChange}
              className="bg-transparent outline-none font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
        }
      >
        <div className="h-44 flex items-end gap-1 pt-4">
          {trends.map((t, idx) => {
            const maxVal = Math.max(...trends.map((day) => day.pageViews), 1);
            const heightPercent = `${(t.pageViews / maxVal) * 100}%`;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div className="relative w-full h-full flex items-end justify-center">
                  <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
                    {t.date}: {t.pageViews} views
                  </div>
                  <div
                    className="bg-[var(--color-accent)] hover:opacity-90 w-full rounded-t transition-all"
                    style={{
                      height: heightPercent,
                      minHeight: t.pageViews > 0 ? "4px" : "1px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Campaigns and Subscribers grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Email Campaigns">
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {loading && campaigns.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">No campaigns found.</div>
            ) : (
              campaigns.map((c) => (
                <div
                  key={c.id}
                  className="p-3 border border-[var(--color-border)] dark:border-slate-700/60 rounded-[var(--radius-input)] text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                    <Badge status={c.status} />
                  </div>
                  {c.status === "sent" && (
                    <div className="flex gap-4 text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-[var(--color-border)] dark:border-slate-700/60">
                      <span>Sent: {c.sentCount}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent Subscribers">
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {loading && subscribers.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">Loading subscribers...</div>
            ) : subscribers.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">No subscribers found.</div>
            ) : (
              subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="flex justify-between items-center text-xs pb-2 border-b border-[var(--color-border)] dark:border-slate-700/60 last:border-0"
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {sub.name || sub.email}
                    </span>
                    <span className="dash-caption block">{sub.email}</span>
                  </div>
                  <Badge status={sub.status} />
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
