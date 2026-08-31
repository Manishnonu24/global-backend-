"use client";

import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Activity, Megaphone, FileSpreadsheet } from "lucide-react";

// Dynamically import tab components to minimize initial JS bundle size
const CrmOverviewTab = dynamic(() => import("./tabs/CrmOverviewTab"), {
  loading: () => (
    <div className="space-y-4 py-8">
      <div
        className="admin-skeleton h-32 rounded-xl"
        style={{ borderRadius: "var(--admin-radius-card, 10px)" }}
      />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="admin-skeleton h-24 rounded-xl"
            style={{ borderRadius: "var(--admin-radius-card, 10px)" }}
          />
        ))}
      </div>
    </div>
  ),
});

const CrmAdsTab = dynamic(() => import("./tabs/CrmAdsTab"), {
  loading: () => (
    <div
      className="admin-skeleton h-64 my-8"
      style={{ borderRadius: "var(--admin-radius-card, 10px)" }}
    />
  ),
});

const CrmReportsTab = dynamic(() => import("./tabs/CrmReportsTab"), {
  loading: () => (
    <div
      className="admin-skeleton h-64 my-8"
      style={{ borderRadius: "var(--admin-radius-card, 10px)" }}
    />
  ),
});

const TABS = [
  { id: "overview", label: "Overview & Reports", icon: Activity },
  { id: "reports",  label: "Custom Reports", icon: FileSpreadsheet },
];

export default function CrmDashboardClient({
  siteId,
  siteName,
  initialStats,
  initialTrends,
  initialCampaignPerformance,
  recentSubscribers,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get("tab");
  const activeTab = (tabParam === "reports" || tabParam === "ads") ? tabParam : "overview";

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── Page Header + Tabs ─────────────────────────────── */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Marketing CRM</h1>
          <p className="admin-caption mt-1">
            Website:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--admin-text, #0f172a)" }}
            >
              {siteName}
            </span>
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="admin-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`admin-tab ${activeTab === id ? "is-active" : ""}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dynamic Tab Content ────────────────────────────── */}
      {activeTab === "overview" && (
        <CrmOverviewTab
          siteId={siteId}
          initialStats={initialStats}
          initialTrends={initialTrends}
          initialCampaignPerformance={initialCampaignPerformance}
          recentSubscribers={recentSubscribers}
        />
      )}

      {activeTab === "ads" && <CrmAdsTab siteId={siteId} />}

      {activeTab === "reports" && <CrmReportsTab siteId={siteId} />}
    </div>
  );
}
