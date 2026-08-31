"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import {
  Plus, Layers, RefreshCw, BarChart3, Eye, MousePointerClick,
  Target, Calendar, Users, Briefcase, FileText, CheckCircle2,
  XCircle, Trash2, Globe, Clock, Settings, Zap, Play, Pause,
  DollarSign, Sparkles, Filter, ChevronRight, Search, X,
  ExternalLink, Edit, Copy, Code, Image as ImageIcon, SlidersHorizontal,
  TrendingUp, AlertTriangle, ArrowUpRight
} from "lucide-react";

function proxyUrl(url) {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

// --- Constants ---
const AD_STATUS_CONFIG = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700" },
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40" },
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40" },
  expired: { label: "Expired", cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
};

function StatusBadge({ status, isActive }) {
  const effectiveStatus = !isActive ? "draft" : status;
  const cfg = AD_STATUS_CONFIG[effectiveStatus] || AD_STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function AdsPage() {
  const [siteId, setSiteId] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, ads, campaigns, advertisers, zones
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // Lists
  const [ads, setAds] = useState([]);
  const [zones, setZones] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [pages, setPages] = useState([]);

  // Forms & Modals
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState(null);
  const [editingZone, setEditingZone] = useState(null); // zone object being edited
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(""); // "adImageUrl" | "advertiserLogo"

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (mediaItem) => {
    const url = mediaItem.secureUrl || mediaItem.url;
    if (mediaPickerTarget === "adImageUrl") {
      setFormAd(prev => ({ ...prev, imageUrl: url }));
    } else if (mediaPickerTarget === "advertiserLogo") {
      setNewAdvertiser(prev => ({ ...prev, logo: url }));
    }
    setMediaPickerOpen(false);
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  // Google AdSense settings state
  const [adsensePublisherId, setAdsensePublisherId] = useState("");
  const [autoAdsEnabled, setAutoAdsEnabled] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // New Entity States
  const [newZone, setNewZone] = useState({ name: "", width: "", height: "" });
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Auto-derive the slug preview (mirrors server-side slugify)
  const newZoneSlugPreview = newZone.name
    ? newZone.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
    : '';
  const [newCampaign, setNewCampaign] = useState({
    name: "", description: "", budget: "", startDate: "", endDate: "", status: "active"
  });
  const [newAdvertiser, setNewAdvertiser] = useState({
    companyName: "", contactName: "", email: "", phone: "", website: "", logo: "", status: "active"
  });

  const [formAd, setFormAd] = useState({
    zoneId: "", name: "", type: "banner", code: "", imageUrl: "", targetUrl: "",
    headline: "", description: "", ctaText: "", ctaColor: "#0f7c85",
    advertiserId: "", campaignId: "", priority: 50, isActive: true, status: "active",
    targetDevice: "all", targetCountry: "all", targetRoutes: "",
    schedTimezone: "UTC", schedTimeStart: "", schedTimeEnd: "", schedDays: [], maxClicks: ""
  });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [adsRes, zonesRes, campaignsRes, advertisersRes, analyticsRes, settingsRes, pagesRes] = await Promise.all([
        fetch("/api/dashboard/ads", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/ads/zones", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/advertisement-campaigns", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/advertisers", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/ads/analytics", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/ads/settings", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/pages", { headers: { "x-site-id": siteId } })
      ]);

      if (adsRes.ok) {
        const adsData = await adsRes.json();
        setAds(adsData.data?.ads || []);
      }
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData.data?.zones || []);
      }
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.data?.campaigns || []);
      }
      if (advertisersRes.ok) {
        const advertisersData = await advertisersRes.json();
        setAdvertisers(advertisersData.data?.advertisers || []);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAdsensePublisherId(settingsData.data?.adSettings?.adsensePublisherId || "");
        setAutoAdsEnabled(settingsData.data?.adSettings?.autoAdsEnabled || false);
      }
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(pagesData.data?.pages || []);
      }
    } catch (e) {
      console.error("Failed to load ads context:", e);
      showToast("Error loading page data context", "error");
    } finally {
      setLoading(false);
    }
  }, [siteId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setLoaderFor = (id, state) => setActionLoading(prev => ({ ...prev, [id]: state }));

  // --- Campaign Handlers ---
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/advertisement-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          ...newCampaign,
          budget: newCampaign.budget ? Number(newCampaign.budget) : null,
          startDate: newCampaign.startDate || null,
          endDate: newCampaign.endDate || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Campaign group created successfully!");
        setNewCampaign({ name: "", description: "", budget: "", startDate: "", endDate: "", status: "active" });
        fetchData();
      } else {
        showToast(data.error || "Failed to create campaign", "error");
      }
    } catch (err) {
      showToast("Error creating campaign group", "error");
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm("Are you sure you want to delete this ad campaign group? All linked ads will remain active but unassigned.")) return;
    try {
      const res = await fetch(`/api/dashboard/advertisement-campaigns/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      if (res.ok) {
        showToast("Campaign group removed successfully");
        fetchData();
      }
    } catch (err) {
      showToast("Failed to delete campaign group", "error");
    }
  };

  // --- Advertiser Handlers ---
  const handleCreateAdvertiser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/advertisers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(newAdvertiser)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Advertiser account registered!");
        setNewAdvertiser({ companyName: "", contactName: "", email: "", phone: "", website: "", logo: "", status: "active" });
        fetchData();
      } else {
        showToast(data.error || "Failed to add advertiser", "error");
      }
    } catch (err) {
      showToast("Error creating advertiser account", "error");
    }
  };

  const handleDeleteAdvertiser = async (id) => {
    if (!confirm("Delete advertiser profile? Linked ads will remain active but show 'No Advertiser'.")) return;
    try {
      const res = await fetch(`/api/dashboard/advertisers/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      if (res.ok) {
        showToast("Advertiser removed from site context");
        fetchData();
      }
    } catch (err) {
      showToast("Failed to delete advertiser", "error");
    }
  };

  // --- Ad Zone Handlers ---
  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/ads/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          name: newZone.name,
          width: newZone.width ? Number(newZone.width) : null,
          height: newZone.height ? Number(newZone.height) : null,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Zone created! Use <AdSlot zone="${data.data?.zone?.slug || newZoneSlugPreview}" /> to embed it.`);
        setNewZone({ name: "", width: "", height: "" });
        fetchData();
      } else {
        showToast(data.error || "Failed to create zone", "error");
      }
    } catch (err) {
      showToast("Error creating zone", "error");
    }
  };

  const handleDeleteZone = async (zoneId) => {
    const linked = ads.filter(a => a.zoneId === zoneId).length;
    const msg = linked > 0
      ? `This zone has ${linked} linked ad(s). Deleting it will unassign them. Continue?`
      : "Delete this ad zone? This cannot be undone.";
    if (!confirm(msg)) return;
    setLoaderFor(zoneId, "deleting");
    try {
      const res = await fetch(`/api/dashboard/ads/zones/${zoneId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      if (res.ok) {
        showToast("Zone deleted.");
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to delete zone", "error");
      }
    } catch (e) {
      showToast("Failed to delete zone", "error");
    } finally {
      setLoaderFor(zoneId, null);
    }
  };

  const handleUpdateZone = async (e) => {
    e.preventDefault();
    if (!editingZone) return;
    setLoaderFor("zoneEdit", true);
    try {
      const res = await fetch(`/api/dashboard/ads/zones/${editingZone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          name: editingZone.name,
          width: editingZone.width ? Number(editingZone.width) : null,
          height: editingZone.height ? Number(editingZone.height) : null,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Zone updated!");
        setEditingZone(null);
        fetchData();
      } else {
        showToast(data.error || "Failed to update zone", "error");
      }
    } catch (err) {
      showToast("Error updating zone", "error");
    } finally {
      setLoaderFor("zoneEdit", false);
    }
  };

  const copySlug = async (slug) => {
    const success = await copyToClipboard(slug);
    if (success) {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  };

  // --- Ad CRUD Handlers ---
  const openNewAd = () => {
    setEditingAdId(null);
    setFormAd({
      zoneId: zones[0]?.id || "",
      name: "",
      type: "banner",
      code: "",
      imageUrl: "",
      targetUrl: "",
      headline: "",
      description: "",
      ctaText: "",
      ctaColor: "#0f7c85",
      advertiserId: "",
      campaignId: "",
      priority: 50,
      isActive: true,
      status: "active",
      targetDevice: "all",
      targetCountry: "all",
      targetRoutes: "",
      schedTimezone: "UTC",
      schedTimeStart: "",
      schedTimeEnd: "",
      schedDays: [],
      maxClicks: ""
    });
    setPanelOpen(true);
  };
  const openCompose = openNewAd;

  const openEditAd = (ad) => {
    setEditingAdId(ad.id);
    let targetDevice = "all";
    let targetCountry = "all";
    let targetRoutes = "";
    if (ad.targeting) {
      try {
        const targetingObj = JSON.parse(ad.targeting);
        targetDevice = targetingObj.device || "all";
        targetCountry = targetingObj.country || "all";
        targetRoutes = Array.isArray(targetingObj.routes) ? targetingObj.routes.join(", ") : "";
      } catch (e) {
        console.error(e);
      }
    }

    let schedTimezone = "UTC";
    let schedTimeStart = "";
    let schedTimeEnd = "";
    let schedDays = [];
    if (ad.scheduling) {
      try {
        const schedulingObj = JSON.parse(ad.scheduling);
        schedTimezone = schedulingObj.timezone || "UTC";
        schedTimeStart = schedulingObj.timeStart || "";
        schedTimeEnd = schedulingObj.timeEnd || "";
        schedDays = Array.isArray(schedulingObj.days) ? schedulingObj.days : [];
      } catch (e) {
        console.error(e);
      }
    }

    setFormAd({
      zoneId: ad.zoneId,
      name: ad.name,
      type: ad.type,
      code: ad.code || "",
      imageUrl: ad.imageUrl || "",
      targetUrl: ad.targetUrl || "",
      headline: ad.headline || "",
      description: ad.description || "",
      ctaText: ad.ctaText || "",
      ctaColor: ad.ctaColor || "#0f7c85",
      advertiserId: ad.advertiserId || "",
      campaignId: ad.campaignId || "",
      priority: ad.priority,
      isActive: ad.isActive,
      status: ad.status || "active",
      targetDevice,
      targetCountry,
      targetRoutes,
      schedTimezone,
      schedTimeStart,
      schedTimeEnd,
      schedDays,
      maxClicks: ad.maxClicks !== null && ad.maxClicks !== undefined ? String(ad.maxClicks) : ""
    });
    setPanelOpen(true);
  };

  const handleSaveAd = async (e) => {
    e.preventDefault();
    setLoaderFor("adform", true);

    const targetingObj = {
      device: formAd.targetDevice,
      country: formAd.targetCountry,
      routes: formAd.targetRoutes ? formAd.targetRoutes.split(",").map(r => r.trim()).filter(Boolean) : []
    };

    const schedulingObj = {
      timezone: formAd.schedTimezone,
      timeStart: formAd.schedTimeStart || null,
      timeEnd: formAd.schedTimeEnd || null,
      days: formAd.schedDays.map(Number)
    };

    const payload = {
      zoneId: formAd.zoneId,
      name: formAd.name,
      type: formAd.type,
      code: formAd.code || null,
      imageUrl: formAd.imageUrl || null,
      targetUrl: formAd.targetUrl || null,
      headline: formAd.headline || null,
      description: formAd.description || null,
      ctaText: formAd.ctaText || null,
      ctaColor: formAd.ctaColor || null,
      advertiserId: formAd.advertiserId || null,
      campaignId: formAd.campaignId || null,
      priority: Number(formAd.priority),
      isActive: formAd.isActive,
      status: formAd.status,
      targeting: JSON.stringify(targetingObj),
      scheduling: JSON.stringify(schedulingObj),
      maxClicks: formAd.maxClicks !== "" && formAd.maxClicks !== null ? Number(formAd.maxClicks) : null
    };

    try {
      let res;
      if (editingAdId) {
        res = await fetch(`/api/dashboard/ads/${editingAdId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/dashboard/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json();
      if (data.success) {
        showToast(editingAdId ? "Advertisement updated successfully!" : "Ad campaign deployed!");
        setPanelOpen(false);
        fetchData();
      } else {
        showToast(data.error || "Failed to process campaign", "error");
      }
    } catch (err) {
      showToast("Error processing request", "error");
    } finally {
      setLoaderFor("adform", false);
    }
  };

  const handleDeleteAd = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this advertisement deployment?")) return;
    setLoaderFor(id, "deleting");
    try {
      const res = await fetch(`/api/dashboard/ads/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      if (res.ok) {
        showToast("Advertisement deleted");
        fetchData();
      }
    } catch (e) {
      showToast("Failed to delete ad", "error");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const toggleAdActive = async (ad) => {
    // Optimistic Update
    const prevActive = ad.isActive;
    setAds(prev => prev.map(item => item.id === ad.id ? { ...item, isActive: !prevActive } : item));

    try {
      const res = await fetch(`/api/dashboard/ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ isActive: !prevActive })
      });
      if (!res.ok) {
        showToast("Failed to toggle status", "error");
        setAds(prev => prev.map(item => item.id === ad.id ? { ...item, isActive: prevActive } : item));
      } else {
        showToast(`Ad campaign is now ${!prevActive ? 'Active' : 'Paused'}`);
        fetchData();
      }
    } catch (e) {
      showToast("Failed to contact server endpoint", "error");
      setAds(prev => prev.map(item => item.id === ad.id ? { ...item, isActive: prevActive } : item));
    }
  };

  // --- Save AdSense Global settings ---
  const handleSaveAdsenseSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/dashboard/ads/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ adsensePublisherId, autoAdsEnabled })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Google AdSense settings updated successfully!");
        fetchData();
      } else {
        showToast(data.error || "Failed to update AdSense settings", "error");
      }
    } catch (err) {
      showToast("Error updating settings", "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  // --- Filtering Ads list ---
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch = ad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ad.campaign?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ad.advertiser?.companyName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && ad.isActive && ad.status === "active") ||
        (statusFilter === "draft" && (!ad.isActive || ad.status === "draft")) ||
        ad.status === statusFilter;

      const matchesZone = zoneFilter === "all" || ad.zoneId === zoneFilter;

      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [ads, searchQuery, statusFilter, zoneFilter]);

  const combinedRoutes = useMemo(() => {
    const staticList = [
      { slug: "/", title: "Home Page" },
      { slug: "/about", title: "About Us" },
      { slug: "/blogs", title: "Blogs Directory" },
      { slug: "/blogs/*", title: "All Individual Blog Posts" },
      { slug: "/services", title: "Services Directory" },
      { slug: "/contact", title: "Contact Us" },
      { slug: "/quizzes", title: "Quizzes Directory" },
      { slug: "/quizzes/*", title: "All Individual Quizzes" },
      { slug: "/publication", title: "Publications Page" },
      { slug: "/magazine/*", title: "All Individual Magazines" }
    ];

    const dynamicList = pages.map(p => ({
      slug: p.slug.startsWith("/") ? p.slug : `/${p.slug}`,
      title: `${p.title} (Custom Page)`
    }));

    const all = [...staticList];
    dynamicList.forEach(item => {
      if (!all.some(x => x.slug === item.slug)) {
        all.push(item);
      }
    });

    return all;
  }, [pages]);

  return (
    <div className="space-y-6 w-full relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-100 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}>
          {toast.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "var(--admin-crm-accent-soft)" }}>
              <Layers size={22} style={{ color: "var(--admin-crm-accent)" }} />
            </div>
            <div>
              <h1 className="admin-page-title">
                Ads Manager
              </h1>
              <p className="admin-caption mt-0.5">
                Create and manage the advertisements shown on your website — no technical knowledge needed.
              </p>
            </div>
          </div>
        </div>
        <div className="admin-page-header-actions">
          {adsensePublisherId && (
            <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[10px] font-bold">
              <Zap size={11} className="text-amber-500 fill-amber-500" /> Google Auto Ads ON
            </div>
          )}
          <button
            onClick={openNewAd}
            className="admin-btn admin-btn-primary"
          >
            <Plus size={14} /> + Create New Ad
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {[
          { key: "overview", label: "Dashboard", icon: BarChart3 },
          { key: "ads", label: "My Ads", icon: FileText },
          { key: "campaigns", label: "Campaigns", icon: Briefcase },
          { key: "advertisers", label: "Advertisers", icon: Users },
          { key: "zones", label: "Ad Locations", icon: Settings },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`admin-tab ${activeTab === t.key ? "is-active" : ""}`}
          >
            <t.icon size={13} className="shrink-0 hidden sm:block" />
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === "overview" && (
        <div className="space-y-6">

          {/* Quick Start Guide */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5">
            <h2 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-2"><Sparkles size={15} className="text-indigo-500" /> How Ads Work — 3 Simple Steps</h2>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/70 mb-4">Follow these steps to get your first ad showing on the website.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Set an Ad Location", desc: "Go to \"Ad Locations\" tab and create a spot — e.g. \"Top of Homepage\". Think of it like choosing where on the page your ad will appear.", icon: Target, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
                { step: "2", title: "Add Your Advertiser (Optional)", desc: "Go to \"Advertisers\" tab to register the company whose ad you're running. This helps you keep track of who placed each ad.", icon: Users, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30" },
                { step: "3", title: "Create the Ad", desc: "Click \"+ Create New Ad\", upload your image or paste ad code, pick the location you set up, then click Save. Your ad will appear on the site immediately.", icon: ImageIcon, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
              ].map(item => (
                <div key={item.step} className="flex gap-3 bg-white/70 dark:bg-slate-900/50 rounded-xl p-3.5 border border-white dark:border-slate-800">
                  <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon size={15} className={item.color} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Step {item.step}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl"><Eye size={18} /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Impressions</p>
                <p className="text-lg font-black mt-0.5">{(analytics?.totals?.impressions || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl"><MousePointerClick size={18} /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Clicks</p>
                <p className="text-lg font-black mt-0.5">{(analytics?.totals?.clicks || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-500 rounded-xl"><TrendingUp size={18} /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average CTR</p>
                <p className="text-lg font-black mt-0.5">{analytics?.totals?.ctr || "0.00"}%</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-500 rounded-xl"><CheckCircle2 size={18} /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Campaigns</p>
                <p className="text-lg font-black mt-0.5">{analytics?.totals?.activeAds || 0} / {analytics?.totals?.totalAds || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30 Day Timeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5"><Clock size={16} className="text-indigo-500" /> Delivery Metrics (Last 30 Days)</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Daily breakdown of visitor impressions and click counts</p>
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400"><RefreshCw className="animate-spin text-indigo-500 mr-2" size={16} /> Fetching timeline data...</div>
              ) : !analytics?.timeline || analytics.timeline.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">No activity logs recorded.</div>
              ) : (
                <div className="h-60 flex items-end gap-1.5 pt-6">
                  {analytics.timeline.map((day, idx) => {
                    const maxVal = Math.max(...analytics.timeline.map(d => d.impressions + d.clicks), 1);
                    const impPct = (day.impressions / maxVal) * 100;
                    const clickPct = (day.clicks / maxVal) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[9px] py-1 px-2 rounded hidden group-hover:block whitespace-nowrap z-10 shadow-lg">
                          <p className="font-bold">{day.date}</p>
                          <p className="text-indigo-300">Imps: {day.impressions}</p>
                          <p className="text-emerald-300">Clicks: {day.clicks}</p>
                        </div>
                        {/* Stacked bars */}
                        <div className="w-full flex flex-col justify-end gap-0.5 h-full">
                          <div className="bg-emerald-500 rounded-t w-full" style={{ height: `${clickPct}%` }} />
                          <div className="bg-indigo-500 rounded-t w-full" style={{ height: `${impPct}%` }} />
                        </div>
                        <span className="text-[7.5px] text-slate-400 mt-1.5 hidden md:block">
                          {idx % 5 === 0 ? day.date.slice(5) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top performing Ads */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5"><TrendingUp size={16} className="text-indigo-500" /> Top CTR Performers</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Advertisements driving highest CTR (minimum 10 imps)</p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400"><RefreshCw className="animate-spin text-indigo-500" size={14} /></div>
              ) : !analytics?.topAds || analytics.topAds.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No ad performers computed yet.</div>
              ) : (
                <div className="space-y-3.5">
                  {analytics.topAds.map((ad, idx) => (
                    <div key={ad.id} className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ad.name}</p>
                        <p className="text-[9.5px] text-slate-400 truncate">{ad.zoneName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{ad.ctr}%</span>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">{ad.clicks} clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADVERTISEMENTS TAB --- */}
      {activeTab === "ads" && (
        <div className="space-y-4">
          {/* Help Banner */}
          <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-xl px-4 py-3 flex items-start gap-3">
            <Sparkles size={14} className="text-sky-500 mt-0.5 shrink-0" />
            <p className="text-xs text-sky-700 dark:text-sky-300">
              <strong>Tip:</strong> Each row below is an advertisement. Click <strong>Edit</strong> to change an ad&apos;s image or link. Toggle the <strong>Active/Paused</strong> button to instantly show or hide an ad on your website.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-60">
              <Search size={14} className="text-slate-450 shrink-0" />
              <input
                type="text"
                placeholder="Search by ad name, advertiser, or campaign..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-850 dark:text-slate-250"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-1.5 border rounded-lg text-[10.5px] font-bold dark:bg-slate-900 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="draft">Draft / Paused</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="p-1.5 border rounded-lg text-[10.5px] font-bold dark:bg-slate-900 outline-none max-w-37.5"
              >
                <option value="all">All Ad Locations</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>

              <button
                onClick={fetchData}
                className="p-1.8 text-slate-450 border hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-20 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <RefreshCw size={16} className="animate-spin text-indigo-500" /> Loading your ads...
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center mx-auto">
                  <ImageIcon size={22} className="text-indigo-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No ads yet</p>
                <p className="text-xs text-slate-400">Click <strong>&quot;+ Create New Ad&quot;</strong> at the top to add your first advertisement.</p>
                <button onClick={openNewAd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold mt-1">
                  <Plus size={13} /> + Create New Ad
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Ad Name</th>
                      <th className="p-4">Where it shows</th>
                      <th className="p-4">Advertiser / Campaign</th>
                      <th className="p-4 text-center">Priority</th>
                      <th className="p-4 text-center">Live?</th>
                      <th className="p-4 text-center">Performance</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                    {filteredAds.map(ad => {
                      const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
                      return (
                        <tr key={ad.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/50 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">{ad.name}</div>
                            <div className="flex items-center gap-2 mt-1 text-[9.5px] text-slate-400">
                              <span className="font-mono">{ad.type.toUpperCase()}</span>
                              {ad.startDate && <span>• {new Date(ad.startDate).toLocaleDateString()}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-md font-bold text-[10px]">
                              {ad.zone?.name || "Unassigned"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-750 dark:text-slate-350">{ad.advertiser?.companyName || "—"}</div>
                            <div className="text-[10px] text-slate-450 mt-0.5">{ad.campaign?.name || "No Campaign Link"}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-1.8 py-0.5 rounded font-mono font-bold text-[10px] ${ad.priority >= 80 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20" :
                              ad.priority >= 50 ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20" :
                                "bg-slate-100 text-slate-600 dark:bg-slate-800"
                              }`}>
                              {ad.priority}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {ad.maxClicks !== null && ad.maxClicks !== undefined && ad.clicks >= ad.maxClicks ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-bold rounded-full border bg-amber-50 text-amber-700 border-amber-200" title="Click limit reached — auto deactivated">
                                🛑 Limit Met
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleAdActive(ad)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-bold rounded-full border transition-all ${ad.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
                                  }`}
                              >
                                {ad.isActive ? <Play size={8} /> : <Pause size={8} />}
                                {ad.isActive ? "Active" : "Paused"}
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">{ctr}% CTR</div>
                            <div className="text-[9.5px] text-slate-400 mt-0.5">
                              {ad.clicks} {ad.maxClicks ? `/ ${ad.maxClicks}` : ""} clicks • {ad.impressions} imps
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditAd(ad)}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded text-slate-500 hover:text-indigo-600 transition"
                                title="Edit Configuration"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-rose-600 transition"
                                title="Delete Ad"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CAMPAIGNS TAB --- */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Help Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl px-4 py-3 flex items-start gap-3">
              <Briefcase size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>What is a Campaign?</strong> A campaign groups multiple ads together under one budget and date range. For example: <em>&quot;Summer Promotions&quot;</em> — then link all summer ads to it for easy tracking.
              </p>
            </div>
            {campaigns.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No campaigns yet</p>
                <p className="text-xs text-slate-400">Use the form on the right to create your first campaign group.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(camp => {
                  const linkedAds = ads.filter(a => a.campaignId === camp.id);
                  const totalBudget = camp.budget || 0;
                  return (
                    <div key={camp.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{camp.name}</h4>
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${camp.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {camp.status.toUpperCase()}
                          </span>
                        </div>
                        {camp.description && <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{camp.description}</p>}

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5"><Clock size={10} /> {camp.startDate ? new Date(camp.startDate).toLocaleDateString() : "Immediate"}</span>
                          <span className="text-right">Ads Count: <strong>{linkedAds.length}</strong></span>
                        </div>
                      </div>

                      <div className="mt-4 border-t dark:border-slate-700 pt-3">
                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                          <span className="text-slate-400">Budget Progress</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{totalBudget > 0 ? `$${totalBudget}` : "Unlimited"}</span>
                        </div>
                        {totalBudget > 0 && (
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full w-[45%]" />
                          </div>
                        )}
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="text-rose-600 hover:text-rose-700 text-[10px] font-bold"
                          >
                            Delete Group
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Campaign form card */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                <Briefcase size={14} className="text-indigo-500" /> Create a Campaign
              </h3>
              <p className="text-[9.5px] text-slate-450 mt-0.5">Group your ads under a shared budget and date range</p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Campaign Name *</label>
                <input
                  type="text" required placeholder="e.g. Summer Wellness Promotions"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Description <span className="font-normal normal-case">(optional)</span></label>
                <textarea
                  rows={2} placeholder="Brief notes about what this campaign is for..."
                  value={newCampaign.description}
                  onChange={e => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Budget ($) <span className="font-normal normal-case">(optional — leave blank for unlimited)</span></label>
                <input
                  type="number" placeholder="e.g. 500"
                  value={newCampaign.budget}
                  onChange={e => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newCampaign.startDate}
                    onChange={e => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">End Date</label>
                  <input
                    type="date"
                    value={newCampaign.endDate}
                    onChange={e => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition mt-2 shadow-sm"
              >
                Save Campaign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADVERTISERS TAB --- */}
      {activeTab === "advertisers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Help Banner */}
            <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 rounded-xl px-4 py-3 flex items-start gap-3">
              <Users size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-300">
                <strong>What is an Advertiser?</strong> An advertiser is the company or person who placed the ad. Adding them here lets you track which ads belong to which client or brand. This step is optional.
              </p>
            </div>
            {advertisers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No advertisers yet</p>
                <p className="text-xs text-slate-400">Use the form on the right to add the first advertiser.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advertisers.map(adv => {
                  const linkedAds = ads.filter(a => a.advertiserId === adv.id);
                  return (
                    <div key={adv.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 flex gap-4 items-start shadow-sm justify-between">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg overflow-hidden shrink-0">
                          {adv.logo ? <img src={adv.logo} alt="" className="w-full h-full object-cover" /> : "🏢"}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">{adv.companyName}</h4>
                          <p className="text-[9.5px] text-slate-400 truncate">{adv.contactName || "No agent info"}</p>
                          <div className="pt-2 text-[9.5px] text-slate-450 space-y-0.5">
                            {adv.email && <p className="truncate">Email: {adv.email}</p>}
                            {adv.website && (
                              <p className="truncate">
                                Web: <a href={adv.website} target="_blank" rel="noreferrer" className="text-indigo-500 underline inline-flex items-center gap-0.5">{adv.website} <ArrowUpRight size={8} /></a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end h-full">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">{adv.status.toUpperCase()}</span>
                        <div className="text-right mt-6 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-medium">Ads: {linkedAds.length}</p>
                          <button
                            onClick={() => handleDeleteAdvertiser(adv.id)}
                            className="text-rose-600 hover:text-rose-750 text-[10px] font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Advertiser Form card */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-500" /> Add Advertiser Account
              </h3>
              <p className="text-[9.5px] text-slate-450 mt-0.5">Establish profiles for tracking metrics, bills, and campaigns attribution</p>
            </div>

            <form onSubmit={handleCreateAdvertiser} className="space-y-3.5">
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Company / Brand Name *</label>
                <input
                  type="text" required placeholder="Novartis Inc."
                  value={newAdvertiser.companyName}
                  onChange={e => setNewAdvertiser({ ...newAdvertiser, companyName: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Contact Agent Name</label>
                <input
                  type="text" placeholder="John Doe"
                  value={newAdvertiser.contactName}
                  onChange={e => setNewAdvertiser({ ...newAdvertiser, contactName: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Agent Email</label>
                  <input
                    type="email" placeholder="billing@brand.com"
                    value={newAdvertiser.email}
                    onChange={e => setNewAdvertiser({ ...newAdvertiser, email: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Phone</label>
                  <input
                    type="text" placeholder="+1 (555) 0122"
                    value={newAdvertiser.phone}
                    onChange={e => setNewAdvertiser({ ...newAdvertiser, phone: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Website URL</label>
                <input
                  type="url" placeholder="https://novartis.com"
                  value={newAdvertiser.website}
                  onChange={e => setNewAdvertiser({ ...newAdvertiser, website: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9.5px] font-bold text-slate-455 uppercase block">Logo URL</label>
                  <button
                    type="button"
                    onClick={() => openMediaPicker("advertiserLogo")}
                    className="text-[9px] font-extrabold text-indigo-650 hover:text-indigo-855 dark:text-indigo-400 dark:hover:text-indigo-300 transition cursor-pointer"
                  >
                    Choose from Media
                  </button>
                </div>
                <input
                  type="text" placeholder="https://image-hosting.com/logo.webp"
                  value={newAdvertiser.logo}
                  onChange={e => setNewAdvertiser({ ...newAdvertiser, logo: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition mt-2 shadow-sm"
              >
                Add Advertiser
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ZONES & SETTINGS TAB --- */}
      {activeTab === "zones" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Google AdSense Configuration Panel */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="border-b dark:border-slate-700 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe size={16} className="text-amber-500" /> Google AdSense Auto Ads serving
                </h3>
                <p className="text-slate-450 text-[10px] mt-0.5">Link your Google publisher ID to serve automatic ads units dynamically</p>
              </div>

              <form onSubmit={handleSaveAdsenseSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">AdSense Publisher ID</label>
                    <input
                      type="text"
                      placeholder="pub-xxxxxxxxxxxxxxxx"
                      value={adsensePublisherId}
                      onChange={e => setAdsensePublisherId(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none font-mono"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Ex: pub-1234567890123456</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-3">
                      <input
                        type="checkbox"
                        checked={autoAdsEnabled}
                        onChange={e => setAutoAdsEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-750 dark:text-slate-350">Enable Auto Ads serving</span>
                        <p className="text-[9px] text-slate-450">Let Google place ad units automatically in ideal layouts</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end border-t dark:border-slate-700 pt-3.5">
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition"
                  >
                    {settingsSaving ? "Updating Settings..." : "Save AdSense Configuration"}
                  </button>
                </div>
              </form>
            </div>

            {/* Placement zones table list */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5"><Layers size={16} className="text-indigo-500" /> Placement Ad Zones</h3>
                  <p className="text-slate-450 text-[10px] mt-0.5">All active zone slots — each slug wires directly to an &lt;AdSlot&gt; component on the frontend.</p>
                </div>
                <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{zones.length} zones</span>
              </div>

              {zones.length === 0 ? (
                <p className="text-xs text-slate-450 italic text-center py-6">No placement zones configured. Use the form on the right to create one.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {zones.map(zone => {
                    const linkedAds = ads.filter(a => a.zoneId === zone.id);
                    const isEditing = editingZone?.id === zone.id;
                    const isCopied = copiedSlug === zone.slug;
                    return (
                      <div key={zone.id} className="py-3 px-2 rounded-lg transition">
                        {isEditing ? (
                          /* Inline Edit Form */
                          <form onSubmit={handleUpdateZone} className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-3 space-y-3 border border-indigo-100 dark:border-indigo-900/40">
                            <p className="text-[9.5px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Editing Zone</p>
                            <div>
                              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Zone Label</label>
                              <input
                                type="text" required
                                value={editingZone.name}
                                onChange={e => setEditingZone({ ...editingZone, name: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Width (px)</label>
                                <input type="number" value={editingZone.width || ""} onChange={e => setEditingZone({ ...editingZone, width: e.target.value })} className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Height (px)</label>
                                <input type="number" value={editingZone.height || ""} onChange={e => setEditingZone({ ...editingZone, height: e.target.value })} className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none" />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="submit" disabled={actionLoading.zoneEdit} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition">
                                {actionLoading.zoneEdit ? "Saving..." : "Save Changes"}
                              </button>
                              <button type="button" onClick={() => setEditingZone(null)} className="flex-1 py-1.5 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          /* Normal Row */
                          <div className="flex justify-between items-start gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-850 rounded-lg px-1 py-1.5 transition">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{zone.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <code className="text-[9px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded select-all">{zone.slug}</code>
                                <button
                                  type="button"
                                  onClick={() => copySlug(zone.slug)}
                                  title="Copy slug to clipboard"
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all border ${isCopied
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20"
                                      : "border-slate-200 dark:border-slate-700 text-slate-450 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                                    }`}
                                >
                                  {isCopied ? "✓ Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] text-slate-400 font-semibold whitespace-nowrap">{linkedAds.length} ad{linkedAds.length !== 1 ? 's' : ''}</span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-350 rounded-md font-bold text-[9.5px] whitespace-nowrap">
                                {zone.width && zone.height ? `${zone.width}×${zone.height}` : "Fluid"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingZone({ id: zone.id, name: zone.name, width: zone.width || "", height: zone.height || "" })}
                                className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded text-slate-400 hover:text-indigo-600 transition"
                                title="Edit zone"
                              >
                                <Edit size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteZone(zone.id)}
                                disabled={!!actionLoading[zone.id]}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-rose-500 hover:text-rose-700 transition disabled:opacity-40"
                                title="Delete zone"
                              >
                                {actionLoading[zone.id] === "deleting" ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Page Sections Reference */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <SlidersHorizontal size={16} className="text-indigo-500" /> Page Sections Map
                </h3>
                <p className="text-slate-450 text-[10px] mt-0.5">Automatically fetched layouts and active sections configured on each page</p>
              </div>

              {pages.length === 0 ? (
                <p className="text-xs text-slate-450 italic text-center py-6">No custom pages configured.</p>
              ) : (
                <div className="space-y-4">
                  {pages.map(page => {
                    const pageSections = page.sections || [];
                    return (
                      <div key={page.id} className="border dark:border-slate-750 rounded-xl p-3.5 space-y-2 bg-slate-50/20 dark:bg-slate-900/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{page.title}</span>
                            <code className="block text-[9px] text-slate-450 font-mono mt-0.5">{page.slug}</code>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${page.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800"
                            }`}>
                            {page.status}
                          </span>
                        </div>

                        {pageSections.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic pl-1">No dynamic layout sections created. Standard template page.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5">
                            {pageSections.map((sec) => (
                              <div key={sec.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-800/85 text-[10.5px]">
                                <div className="min-w-0 mr-2">
                                  <p className="font-semibold text-slate-750 dark:text-slate-350 truncate">{sec.name || `${sec.type} Section`}</p>
                                  <span className="text-[9px] text-slate-450 font-mono">{sec.type}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 shrink-0 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  Order #{sec.order}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Create Placement Zone Form */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-500" /> Create New Ad Zone
              </h3>
              <p className="text-[9.5px] text-slate-450 mt-0.5">Each zone maps to an <code className="font-mono">&lt;AdSlot zone="slug"&gt;</code> on the frontend</p>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3.5">
              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Zone Label *</label>
                <input
                  type="text" required placeholder="e.g. Blog Sidebar Top"
                  value={newZone.name}
                  onChange={e => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                />
                {newZoneSlugPreview && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">Frontend slug:</span>
                    <code className="text-[9px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">{newZoneSlugPreview}</code>
                    <span className="text-[9px] text-slate-400">→ use as <code className="font-mono text-indigo-600">zone="{newZoneSlugPreview}"</code></span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Layout Preset Dimensions</label>
                <select
                  onChange={e => {
                    if (!e.target.value) {
                      setNewZone(prev => ({ ...prev, width: "", height: "" }));
                      return;
                    }
                    const [w, h] = e.target.value.split("x");
                    setNewZone(prev => ({ ...prev, width: w, height: h }));
                  }}
                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  defaultValue=""
                >
                  <option value="">Responsive / Custom</option>
                  <optgroup label="Standard IAB Banners">
                    <option value="728x90">728 × 90 px — Leaderboard</option>
                    <option value="970x90">970 × 90 px — Large Leaderboard</option>
                    <option value="300x250">300 × 250 px — Medium Rectangle</option>
                    <option value="336x280">336 × 280 px — Large Rectangle</option>
                    <option value="300x600">300 × 600 px — Half Page / Skyscraper</option>
                    <option value="160x600">160 × 600 px — Wide Skyscraper</option>
                    <option value="120x600">120 × 600 px — Skyscraper</option>
                  </optgroup>
                  <optgroup label="Mobile">
                    <option value="320x50">320 × 50 px — Mobile Banner</option>
                    <option value="320x100">320 × 100 px — Large Mobile Banner</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Width (px)</label>
                  <input
                    type="number" placeholder="300"
                    value={newZone.width}
                    onChange={e => setNewZone({ ...newZone, width: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Height (px)</label>
                  <input
                    type="number" placeholder="250"
                    value={newZone.height}
                    onChange={e => setNewZone({ ...newZone, height: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* AdSlot embed snippet preview */}
              {newZoneSlugPreview && (
                <div className="bg-slate-900 text-emerald-400 font-mono text-[9.5px] p-3 rounded-lg leading-relaxed">
                  <p className="text-slate-500 mb-1">// Add this to any page/component:</p>
                  <p>&lt;AdSlot zone=<span className="text-amber-400">"{newZoneSlugPreview}"</span> /&gt;</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition mt-2 shadow-sm"
              >
                + Create Ad Zone
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- AD COMPOSE / EDIT SLIDE OVER --- */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/55 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-2xl overflow-hidden">
            {/* Slide Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {editingAdId ? "Edit Ad" : "Create New Ad"}
                </h2>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Fill in the details below — the only required fields are the ad name, location, and content (image or code).</p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2">
              {/* Form Side */}
              <form id="ad-campaign-form" onSubmit={handleSaveAd} className="p-6 space-y-5 overflow-y-auto border-r dark:border-slate-800">

                {/* Content type */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><FileText size={12} /> Basic Info</h3>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Ad Name *</label>
                    <input
                      type="text" required placeholder="e.g. Summer Sale Banner"
                      value={formAd.name}
                      onChange={e => setFormAd({ ...formAd, name: e.target.value })}
                      className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">A label for your own reference — visitors won&apos;t see this.</p>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Where to show this ad *</label>
                    <select
                      required value={formAd.zoneId}
                      onChange={e => setFormAd({ ...formAd, zoneId: e.target.value })}
                      className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                    >
                      <option value="">Select a location...</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">Choose a page location. Create locations first in the <strong>Ad Locations</strong> tab.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Advertiser <span className="normal-case font-normal">(optional)</span></label>
                      <select
                        value={formAd.advertiserId}
                        onChange={e => setFormAd({ ...formAd, advertiserId: e.target.value })}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                      >
                        <option value="">No Advertiser</option>
                        {advertisers.map(a => <option key={a.id} value={a.id}>{a.companyName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Campaign <span className="normal-case font-normal">(optional)</span></label>
                      <select
                        value={formAd.campaignId}
                        onChange={e => setFormAd({ ...formAd, campaignId: e.target.value })}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                      >
                        <option value="">No Campaign Link</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ad Content Format */}
                <div className="space-y-3 pt-3 border-t dark:border-slate-800">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Code size={12} /> Ad Content</h3>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1.5">What type of ad is this?</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormAd({ ...formAd, type: "banner" })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${formAd.type === "banner" ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20" : "border-slate-200 text-slate-400 dark:border-slate-700"}`}
                      >
                        🖼 Image Banner
                        <p className="font-normal text-[9px] mt-0.5 opacity-70">Upload an image and a link</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormAd({ ...formAd, type: "adsense" })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${formAd.type === "adsense" ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20" : "border-slate-200 text-slate-400 dark:border-slate-700"}`}
                      >
                        {"</>"} Embed Code
                        <p className="font-normal text-[9px] mt-0.5 opacity-70">Paste HTML code from partner</p>
                      </button>
                    </div>
                  </div>

                  {formAd.type === "banner" ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Ad Image *</label>
                          <button
                            type="button"
                            onClick={() => openMediaPicker("adImageUrl")}
                            className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 transition dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                          >
                            Choose from Media Library
                          </button>
                        </div>
                        <input
                          type="text" required={formAd.type === "banner"} placeholder="Paste image URL or use button above to select from library"
                          value={formAd.imageUrl}
                          onChange={e => setFormAd({ ...formAd, imageUrl: e.target.value })}
                          className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Where the ad should link to *</label>
                        <input
                          type="text" required={formAd.type === "banner"} placeholder="e.g. https://yourpartner.com/offer"
                          value={formAd.targetUrl}
                          onChange={e => setFormAd({ ...formAd, targetUrl: e.target.value })}
                          className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">When visitors click the ad, they&apos;ll be taken to this web page.</p>
                      </div>

                      {/* Optional Text Overlay / Native Card Fields */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <span className="text-[9.5px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                          Optional Text Display
                        </span>
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Ad Headline / Title <span className="normal-case font-normal">(optional)</span></label>
                          <input
                            type="text" placeholder="e.g. 20% Off Wellness Supplements"
                            value={formAd.headline || ""}
                            onChange={e => setFormAd({ ...formAd, headline: e.target.value })}
                            className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Ad Subtitle / Description <span className="normal-case font-normal">(optional)</span></label>
                          <textarea
                            rows={2} placeholder="e.g. Align your health with certified organic nutrition."
                            value={formAd.description || ""}
                            onChange={e => setFormAd({ ...formAd, description: e.target.value })}
                            className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Button CTA Text <span className="normal-case font-normal">(optional)</span></label>
                          <input
                            type="text" placeholder="e.g. Shop Now → or Learn More →"
                            value={formAd.ctaText || ""}
                            onChange={e => setFormAd({ ...formAd, ctaText: e.target.value })}
                            className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">
                            Button Colour <span className="normal-case font-normal">(optional)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formAd.ctaColor || "#0f7c85"}
                              onChange={e => setFormAd({ ...formAd, ctaColor: e.target.value })}
                              className="w-9 h-9 p-0.5 border rounded-lg cursor-pointer dark:bg-slate-900"
                            />
                            <input
                              type="text"
                              placeholder="#0f7c85"
                              value={formAd.ctaColor || ""}
                              onChange={e => setFormAd({ ...formAd, ctaColor: e.target.value })}
                              className="flex-1 p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Ad Code / HTML Snippet *</label>
                      <textarea
                        rows={4} required={formAd.type === "adsense"} placeholder={"Paste the HTML or script code provided by the advertiser here..."}
                        value={formAd.code}
                        onChange={e => setFormAd({ ...formAd, code: e.target.value })}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none font-mono"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">Your advertiser will send you this code snippet. Just paste it in as-is.</p>
                    </div>
                  )}
                </div>

                {/* Targeting and delivery checks */}
                <div className="space-y-3 pt-3 border-t dark:border-slate-800">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Target size={12} /> Target Context</h3>
                  <div>
                    {(() => {
                      const isTargetingAll = !formAd.targetRoutes || formAd.targetRoutes.trim() === "" || formAd.targetRoutes.trim() === "all";
                      return (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1.5">Route Page Targeting</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormAd({ ...formAd, targetRoutes: "" })}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${isTargetingAll
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20"
                                  : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:border-slate-700"
                                  }`}
                              >
                                All Pages (Site-wide)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTargetingAll) {
                                    setFormAd({ ...formAd, targetRoutes: "/" });
                                  }
                                }}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${!isTargetingAll
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20"
                                  : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:border-slate-700"
                                  }`}
                              >
                                Selected Pages Only
                              </button>
                            </div>
                          </div>

                          {!isTargetingAll && (
                            <div className="space-y-3 animation-fade-in">
                              <div className="bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-150/80">
                                <span className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 pl-0.5">Select target pages:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 pr-1.5 scrollbar-thin">
                                  {combinedRoutes.map(routeObj => {
                                    const isChecked = formAd.targetRoutes.split(",").map(r => r.trim()).includes(routeObj.slug);
                                    return (
                                      <label
                                        key={routeObj.slug}
                                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-[11px] font-bold cursor-pointer select-none transition-all ${isChecked
                                          ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-850"
                                          : "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:border-slate-850"
                                          }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                                          onChange={() => {
                                            const currentList = formAd.targetRoutes.split(",").map(r => r.trim()).filter(Boolean);
                                            let newList;
                                            if (currentList.includes(routeObj.slug)) {
                                              newList = currentList.filter(s => s !== routeObj.slug);
                                            } else {
                                              newList = [...currentList, routeObj.slug];
                                            }
                                            setFormAd({ ...formAd, targetRoutes: newList.join(", ") });
                                          }}
                                        />
                                        <div className="leading-tight min-w-0">
                                          <span className="block truncate">{routeObj.title}</span>
                                          <code className="block text-[9px] text-slate-450 font-mono font-normal mt-0.5 truncate">{routeObj.slug}</code>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="text-[9.5px] font-bold text-slate-450 block mb-1">Or type custom route rule paths (comma separated)</label>
                                <input
                                  type="text"
                                  placeholder="Ex: /quizzes/results/*, /legal/*"
                                  value={formAd.targetRoutes}
                                  onChange={e => setFormAd({ ...formAd, targetRoutes: e.target.value })}
                                  className="w-full p-2.5 border rounded-lg text-xs dark:bg-slate-900 outline-none font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Day/Time Scheduling details */}
                <div className="space-y-3 pt-3 border-t dark:border-slate-800">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock size={12} /> Scheduling Limits</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-450 block mb-1">Start Hour</label>
                      <input
                        type="text" placeholder="09:00"
                        value={formAd.schedTimeStart}
                        onChange={e => setFormAd({ ...formAd, schedTimeStart: e.target.value })}
                        className="w-full p-1.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-450 block mb-1">End Hour</label>
                      <input
                        type="text" placeholder="17:00"
                        value={formAd.schedTimeEnd}
                        onChange={e => setFormAd({ ...formAd, schedTimeEnd: e.target.value })}
                        className="w-full p-1.5 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-450 block mb-1">Limit Days of Week</label>
                    <div className="flex justify-between gap-1 mt-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => {
                        const isSelected = formAd.schedDays.includes(idx);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const days = [...formAd.schedDays];
                              const dIdx = days.indexOf(idx);
                              if (dIdx >= 0) days.splice(dIdx, 1);
                              else days.push(idx);
                              setFormAd({ ...formAd, schedDays: days });
                            }}
                            className={`w-7 h-7 text-[10px] font-black rounded-full border transition ${isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-600 dark:border-slate-700"
                              }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[9.5px] font-bold text-slate-450 uppercase block mb-1">Max Click Limit (Auto Turn-Off) <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                    <input
                      type="number" min="1" placeholder="e.g. 50 (Leave blank for unlimited clicks)"
                      value={formAd.maxClicks || ""}
                      onChange={e => setFormAd({ ...formAd, maxClicks: e.target.value })}
                      className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">
                      ⚡ <strong>Auto-Deactivate:</strong> The ad will automatically turn off and stop appearing on the website once it receives this number of clicks.
                    </p>
                  </div>
                </div>
              </form>

              {/* Preview mock mockup */}
              <div className="hidden lg:flex flex-col bg-slate-50 dark:bg-slate-950 p-6 space-y-4 overflow-y-auto">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Eye size={12} /> Real-time Preview</h3>

                {formAd.type === "banner" ? (
                  <div className="border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Banner Preview Mock</span>
                    {formAd.imageUrl ? (
                      <div className="w-full border rounded overflow-hidden shadow-sm bg-slate-100 min-h-30 flex items-center justify-center relative">
                        <img
                          src={proxyUrl(formAd.imageUrl)}
                          alt="creative ad view"
                          className="w-full h-auto object-cover"
                          onError={e => {
                            e.target.style.display = "none";
                            if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center p-4 text-center text-[10px] text-amber-700 bg-amber-50/90 w-full h-32">
                          <ImageIcon size={20} className="mb-1 text-amber-500" />
                          <span className="font-bold">Image URL Could Not Be Loaded</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Check image link or use &quot;Choose from Media Library&quot;</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded border border-dashed flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50/50">
                        <ImageIcon size={20} className="mb-1" /> No Creative Image Provided
                      </div>
                    )}
                    {formAd.targetUrl && (
                      <div className="flex justify-between items-center text-[10px] text-indigo-600 underline truncate">
                        <span>{formAd.targetUrl}</span>
                        <ExternalLink size={10} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">HTML script code mockup</span>
                    <div className="bg-slate-900 text-slate-350 p-3 rounded font-mono text-[9px] overflow-hidden whitespace-pre-wrap break-all min-h-25">
                      {formAd.code || "<!-- ad creative code display -->"}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 space-y-2 text-[10px]">
                  <span className="font-bold text-[9px] uppercase block mb-1 text-slate-400">Target Settings Config</span>
                  <div className="flex justify-between border-b dark:border-slate-800 pb-1.5"><span className="text-slate-450">Allowed Routes:</span> <span className="font-bold truncate max-w-[120px]">{formAd.targetRoutes || "All Pages"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-450">Schedules:</span> <span className="font-bold">{formAd.schedTimeStart && formAd.schedTimeEnd ? `${formAd.schedTimeStart}-${formAd.schedTimeEnd}` : "All Day"}</span></div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <button
                type="button" onClick={() => setPanelOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-850 transition"
              >
                Cancel
              </button>
              <button
                form="ad-campaign-form"
                type="submit"
                disabled={actionLoading.adform}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
              >
                {actionLoading.adform ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {editingAdId ? "Save Changes" : "Publish Ad"}
              </button>
            </div>
          </div>
        </>
      )}
      {mediaPickerOpen && (
        <MediaPickerModal
          siteId={siteId}
          filter="images"
          onSelect={handleMediaSelect}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
    </div>
  );
}
