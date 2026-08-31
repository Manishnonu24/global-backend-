"use client";

import {
  Bell,
  Trash2,
  Plus,
  Send,
  Settings,
  Copy,
  BarChart3,
  RefreshCw,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Target,
  TrendingUp,
  MousePointerClick,
  Users,
  ExternalLink,
  Image,
  Link2,
  Eye,
  Calendar,
  Repeat2,
  ChevronDown,
  Shield,
  Search,
  Filter,
  SlidersHorizontal,
  Mail,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:      { label: "Draft",     color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" },
  scheduled:  { label: "Scheduled", color: "bg-amber-50  text-amber-700  border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40" },
  sending:    { label: "Sending",   color: "bg-blue-50   text-blue-700   border-blue-200  dark:bg-blue-950/30  dark:text-blue-400  dark:border-blue-800/40" },
  sent:       { label: "Sent",      color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40" },
  failed:     { label: "Failed",    color: "bg-red-50    text-red-700    border-red-200   dark:bg-red-950/30   dark:text-red-400   dark:border-red-800/40" },
};

const SEGMENTS = [
  "Subscribed Users",
  "Active Users",
  "Inactive Users",
  "Engaged Users",
  "All",
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  const colorMap = {
    indigo: "bg-indigo-500/10 text-indigo-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    blue: "bg-blue-500/10 text-blue-500",
    red: "bg-red-500/10 text-red-500",
    violet: "bg-violet-500/10 text-violet-500",
  };
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Notification Preview ────────────────────────────────────────────────────

function NotificationPreview({ form }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-4 shadow-xl w-full max-w-xs mx-auto">
      <div className="text-[9px] text-slate-500 mb-3 uppercase tracking-widest">Browser Preview</div>
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex gap-3 items-start">
        {form.iconUrl ? (
          <img src={form.iconUrl} alt="icon" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-700" onError={(e) => e.target.style.display="none"} />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">{form.title || "Notification Title"}</p>
          <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2 leading-relaxed">
            {form.message || "Your notification message will appear here..."}
          </p>
          {form.url && (
            <p className="text-indigo-400 text-[9px] mt-1 truncate">{form.url}</p>
          )}
        </div>
      </div>
      {form.imageUrl && (
        <div className="mt-2 rounded-xl overflow-hidden bg-slate-700 h-24">
          <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => e.target.parentElement.style.display="none"} />
        </div>
      )}
    </div>
  );
}

// ─── Compose Slide-Over ──────────────────────────────────────────────────────

function ComposePanel({ open, onClose, onSaved, editingId, siteId, emailCampaigns = [], subscriberLists = [] }) {
  const [form, setForm] = useState({
    title: "",
    message: "",
    url: "",
    iconUrl: "",
    imageUrl: "",
    segment: "Subscribed Users",
    scheduledAt: "",
    isRecurring: false,
    recurringRule: { frequency: "daily" },
    emailCampaignId: "",
    filters: null,
    targetType: "segment",
    sendToWebsite: true,
    sendToDevice: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(true);



  useEffect(() => {
    if (editingId && open) {
      fetch(`/api/crm/push/${editingId}`, { headers: { "x-site-id": siteId } })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.notification) {
            const n = d.data.notification;
            setForm({
              title: n.title,
              message: n.message,
              url: n.url || "",
              iconUrl: n.iconUrl || "",
              imageUrl: n.imageUrl || "",
              segment: n.segment || "Subscribed Users",
              scheduledAt: n.scheduledAt ? new Date(n.scheduledAt).toISOString().slice(0, 16) : "",
              isRecurring: n.isRecurring || false,
              recurringRule: n.recurringRule ? JSON.parse(n.recurringRule) : { frequency: "daily" },
              emailCampaignId: n.emailCampaignId || "",
              filters: n.filters || null,
              targetType: n.filters && n.filters.includes("subscriberListId") ? "list" : "segment",
              sendToWebsite: n.sendToWebsite ?? true,
              sendToDevice: n.sendToDevice ?? true,
            });
          }
        });
    } else if (!editingId && open) {
      setForm({
        title: "",
        message: "",
        url: "",
        iconUrl: "",
        imageUrl: "",
        segment: "Subscribed Users",
        scheduledAt: "",
        isRecurring: false,
        recurringRule: { frequency: "daily" },
        emailCampaignId: "",
        filters: null,
        targetType: "segment",
        sendToWebsite: true,
        sendToDevice: true,
      });
    }
    setError(null);
  }, [editingId, open, siteId]);

  const [loadingLatestBlog, setLoadingLatestBlog] = useState(false);

  const autoFillFromLatestBlog = async () => {
    setLoadingLatestBlog(true);
    try {
      const res = await fetch("/api/posts?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.posts && data.data.posts.length > 0) {
          const post = data.data.posts[0];
          setForm(prev => ({
            ...prev,
            title: post.title ? `New Article: ${post.title}`.slice(0, 95) : "New Article Released 📖",
            message: post.excerpt || "Read our latest health insights on A Health Place!",
            url: `/blogs/${post.slug}`,
            imageUrl: post.featuredImage?.url || post.featuredImage?.secureUrl || "",
          }));
        }
      }
    } catch (e) {
      console.error("Auto-fill latest blog error:", e);
    } finally {
      setLoadingLatestBlog(false);
    }
  };

  const applyPresetTemplate = (presetType) => {
    if (presetType === 'blog') {
      setForm(prev => ({
        ...prev,
        title: "New Health Article Released 📖",
        message: "Discover trusted health advice and expert wellness tips on A Health Place.",
        url: "/blogs",
      }));
    } else if (presetType === 'tip') {
      setForm(prev => ({
        ...prev,
        title: "Daily Wellness Tip 🌅",
        message: "A 10-minute walk after meals improves digestion and boosts energy levels!",
        url: "/blogs",
      }));
    } else if (presetType === 'quiz') {
      setForm(prev => ({
        ...prev,
        title: "Test Your Health IQ 📋",
        message: "Take our 2-minute assessment to discover personalized insights about your sleep, stress & gut health.",
        url: "/quizzes",
      }));
    } else if (presetType === 'announcement') {
      setForm(prev => ({
        ...prev,
        title: "New Features & Guides Live 🎉",
        message: "Explore our updated health guides, interactive quizzes, and community recipes today!",
        url: "/",
      }));
    }
  };

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async (e, sendNow = false) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt || null,
        recurringRule: form.isRecurring ? form.recurringRule : null,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/crm/push?id=${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/crm/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save notification");

      const savedNotif = data.data.notification;

      if (sendNow && savedNotif?.id) {
        const sendRes = await fetch(`/api/crm/push/${savedNotif.id}/send`, {
          method: "POST",
          headers: { "x-site-id": siteId },
        });
        const sendData = await sendRes.json();
        onSaved(sendData.data?.notification || savedNotif, !!editingId, true);
      } else {
        onSaved(savedNotif, !!editingId, false);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingId ? "Edit Notification" : "Compose Push Notification"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fill in the details below to create a campaign
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition"
            >
              <Eye size={13} /> {showPreview ? "Hide" : "Preview"}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} h-full`}>
            {/* Form */}
            <form id="compose-form" onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-400">
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </div>
              )}

              {/* Quick Fill Templates Bar */}
              <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-500" /> Fast 1-Click Templates
                  </span>
                  <button
                    type="button"
                    onClick={autoFillFromLatestBlog}
                    disabled={loadingLatestBlog}
                    className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Zap size={11} className="text-amber-500 fill-amber-500" />
                    {loadingLatestBlog ? "Auto-Filling..." : "✨ Auto-Fill Latest Blog Post"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('blog')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 transition text-center shadow-xs cursor-pointer"
                  >
                    📖 Article Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('tip')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 transition text-center shadow-xs cursor-pointer"
                  >
                    🌅 Daily Tip
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('quiz')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 transition text-center shadow-xs cursor-pointer"
                  >
                    📋 Health Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('announcement')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 transition text-center shadow-xs cursor-pointer"
                  >
                    🎉 Site Update
                  </button>
                </div>
              </div>

              {/* Content Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Bell size={12} /> Notification Content
                </h3>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Link with Email Campaign</label>
                  <select
                    value={form.emailCampaignId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      set("emailCampaignId", selectedId);
                      const selectedCampaign = emailCampaigns.find(c => c.id === selectedId);
                      if (selectedCampaign) {
                        set("title", selectedCampaign.name || "");
                        set("message", selectedCampaign.subject || "");
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                  >
                    <option value="">-- Do Not Link Campaign --</option>
                    {emailCampaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 mt-1">Link to an existing email campaign to import its title and subject.</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Title *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Breaking: Your headline here..."
                    value={form.title}
                    onChange={e => set("title", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 text-right">{form.title.length}/100</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Message *</label>
                  <textarea
                    required
                    maxLength={250}
                    rows={3}
                    placeholder="Short, engaging notification text..."
                    value={form.message}
                    onChange={e => set("message", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition resize-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 text-right">{form.message.length}/250</p>
                </div>

                {/* Delivery Channels */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Delivery Channels
                  </label>
                  <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border dark:border-slate-800">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sendToWebsite}
                        onChange={e => set("sendToWebsite", e.target.checked)}
                        className="rounded text-indigo-650 h-4 w-4 border-slate-300 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold block">Publish to Website</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Show in the notification bell on the frontend site</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={form.sendToDevice}
                        onChange={e => set("sendToDevice", e.target.checked)}
                        className="rounded text-indigo-650 h-4 w-4 border-slate-300 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold block">Send Device Push</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Broadcast push notification to user devices (OneSignal)</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Media Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Image size={12} /> Rich Media
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1"><Bell size={9} /> Icon URL</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.iconUrl}
                      onChange={e => set("iconUrl", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1"><Image size={9} /> Hero Image URL</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.imageUrl}
                      onChange={e => set("imageUrl", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1"><Link2 size={9} /> Target URL (on click)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com/article/..."
                    value={form.url}
                    onChange={e => set("url", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                  />
                </div>
              </div>

              {/* Audience Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Target size={12} /> Audience Targeting
                </h3>

                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-full mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      set("targetType", "segment");
                      set("segment", "Subscribed Users");
                      set("filters", null);
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition ${
                      (form.targetType || "segment") === "segment"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    OneSignal Segment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      set("targetType", "list");
                      const defaultList = subscriberLists[0];
                      if (defaultList) {
                        set("segment", `List: ${defaultList.name}`);
                        set("filters", JSON.stringify([{ field: "tag", key: "subscriberListId", relation: "=", value: defaultList.id }]));
                      } else {
                        set("segment", "List: None");
                        set("filters", "[]");
                      }
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition ${
                      form.targetType === "list"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    CRM Subscriber List
                  </button>
                </div>

                {(form.targetType || "segment") === "segment" ? (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Segment</label>
                    <select
                      value={form.segment}
                      onChange={e => set("segment", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                    >
                      {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">Novu audience topic or segment to target.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">CRM Subscriber List</label>
                    <select
                      value={(() => {
                        try {
                          const parsed = JSON.parse(form.filters || "[]");
                          const f = parsed.find(item => item.key === "subscriberListId");
                          return f ? f.value : "";
                        } catch {
                          return "";
                        }
                      })()}
                      onChange={e => {
                        const listId = e.target.value;
                        const selectedList = subscriberLists.find(l => l.id === listId);
                        const listName = selectedList ? selectedList.name : "Unknown List";
                        set("segment", `List: ${listName}`);
                        set("filters", JSON.stringify([{ field: "tag", key: "subscriberListId", relation: "=", value: listId }]));
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                    >
                      <option value="">-- Select Subscriber List --</option>
                      {subscriberLists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Targets users matching tag <code>subscriberListId = [Selected ID]</code>. Ensure your frontend registers this tag!
                    </p>
                  </div>
                )}
              </div>

              {/* Scheduling Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} /> Delivery Schedule
                </h3>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Schedule At (leave blank for immediate)</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => set("scheduledAt", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                  />
                </div>

                {/* Recurring Toggle */}
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Repeat2 size={14} className="text-indigo-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Recurring Campaign</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("isRecurring", !form.isRecurring)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${form.isRecurring ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isRecurring ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                  {form.isRecurring && (
                    <div className="mt-3">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">Frequency</label>
                      <select
                        value={form.recurringRule?.frequency || "daily"}
                        onChange={e => set("recurringRule", { ...form.recurringRule, frequency: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                      >
                        <option value="hourly">Every Hour</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1">Recurrence config is stored for reference; automate delivery via your preferred scheduler.</p>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Preview Panel */}
            {showPreview && (
              <div className="hidden lg:flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700 p-6 gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Eye size={12} /> Live Preview
                </h3>
                <NotificationPreview form={form} />
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-wider">Campaign Summary</p>
                  <div className="flex justify-between"><span className="text-slate-500">Segment</span><span className="font-semibold text-slate-800 dark:text-slate-200">{form.segment}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="font-semibold text-slate-800 dark:text-slate-200">{form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : "Immediate"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Recurring</span><span className={`font-semibold ${form.isRecurring ? "text-indigo-600" : "text-slate-500"}`}>{form.isRecurring ? `Yes (${form.recurringRule?.frequency})` : "No"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Has Icon</span><span className="font-semibold text-slate-800 dark:text-slate-200">{form.iconUrl ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Has Image</span><span className="font-semibold text-slate-800 dark:text-slate-200">{form.imageUrl ? "Yes" : "No"}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              form="compose-form"
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition cursor-pointer"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="text-amber-300 fill-amber-300" />}
              {saving ? "Publishing..." : "⚡ Send & Publish Now"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PushPage() {
  const [tab, setTab] = useState("campaigns");
  const [siteId, setSiteId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Settings
  const [novuWorkflowId, setNovuWorkflowId] = useState("");
  const [novuApiKey, setNovuApiKey] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [emailCampaigns, setEmailCampaigns] = useState([]);
  const [subscriberLists, setSubscriberLists] = useState([]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  useEffect(() => {
    if (siteId) {
      fetchNotifications();
      fetchConfig();
      fetchEmailCampaigns();
      fetchSubscriberLists();
    }
  }, [siteId]);

  useEffect(() => {
    if (siteId && tab === "analytics") {
      fetchAnalytics();
    }
  }, [siteId, tab]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/push", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success) setNotifications(data.data?.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmailCampaigns() {
    try {
      const res = await fetch("/api/crm/campaigns", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success) setEmailCampaigns(data.data?.campaigns || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubscriberLists() {
    try {
      const res = await fetch("/api/crm/lists", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success) setSubscriberLists(data.data?.lists || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAnalytics() {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/crm/push/analytics", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch("/api/dashboard/email/smtp", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success && data.data?.emailSettings) {
        setNovuWorkflowId(data.data.emailSettings.novuWorkflowId || "");
        setNovuApiKey(data.data.emailSettings.novuApiKey || "");
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await fetch("/api/dashboard/email/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ novuWorkflowId, novuApiKey }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Novu credentials saved successfully!");
      } else {
        showToast(data.error || "Failed to save credentials", "error");
      }
    } catch (err) {
      showToast("Error saving credentials", "error");
    } finally {
      setConfigSaving(false);
    }
  };

  const setLoaderFor = (id, state) => setActionLoading(prev => ({ ...prev, [id]: state }));

  const handleSend = async (id) => {
    if (!confirm("Send this push notification to all subscribers in the selected segment?")) return;
    setLoaderFor(id, "sending");
    try {
      const res = await fetch(`/api/crm/push/${id}/send`, {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.warning) {
          showToast(data.data.warning, "warning");
        } else {
          showToast(`✅ Sent to ${data.data.recipients} subscribers!`);
        }
        fetchNotifications();
      } else {
        showToast(data.error || "Failed to send", "error");
      }
    } catch (err) {
      showToast("Network error sending notification", "error");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this notification permanently?")) return;
    setLoaderFor(id, "deleting");
    try {
      const res = await fetch(`/api/crm/push/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        showToast("Notification deleted.");
      }
    } catch (err) {
      showToast("Failed to delete notification", "error");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handleDuplicate = async (id) => {
    setLoaderFor(id, "duplicating");
    try {
      const res = await fetch(`/api/crm/push/${id}/duplicate`, {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => [data.data.notification, ...prev]);
        showToast("Notification duplicated as draft.");
      }
    } catch (err) {
      showToast("Failed to duplicate notification", "error");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handleRefreshStats = async (id) => {
    setLoaderFor(id, "refreshing");
    try {
      const res = await fetch(`/api/crm/push/${id}/stats`, { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success && data.data?.stats) {
        const stats = data.data.stats;
        setNotifications(prev => prev.map(n =>
          n.id === id ? { ...n, ...stats } : n
        ));
        fetchAnalytics();
        showToast("Stats refreshed from Novu.");
      }
    } catch (err) {
      showToast("Failed to refresh stats", "error");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handlePanelSaved = (notification, isEdit, wasSentNow = false) => {
    if (wasSentNow) {
      setNotifications(prev => [notification, ...prev.filter(n => n.id !== notification.id)]);
      showToast("⚡ Push notification published & sent successfully!");
    } else if (isEdit) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? notification : n));
      showToast("Notification updated.");
    } else {
      setNotifications(prev => [notification, ...prev]);
      showToast("Notification saved as draft.");
    }
  };

  const openEdit = (id) => {
    setEditingId(id);
    setPanelOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setPanelOpen(true);
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter(n => {
    const matchStatus = statusFilter === "all" || n.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const configured = !!novuWorkflowId;

  const TABS = [
    { id: "campaigns", label: "Campaigns", icon: Bell },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6 w-full relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-100 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold text-white transition-all ${
          toast.type === "error" ? "bg-red-600" :
          toast.type === "warning" ? "bg-amber-500" :
          "bg-emerald-600"
        }`}>
          {toast.type === "error" ? <AlertCircle size={16} /> :
           toast.type === "warning" ? <AlertCircle size={16} /> :
           <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: "var(--admin-crm-accent-soft)" }}>
              <Bell size={20} style={{ color: "var(--admin-crm-accent)" }} />
            </div>
            <div>
              <h1 className="admin-page-title">
                Push Notifications
              </h1>
              <p className="admin-caption mt-0.5">
                Novu-powered browser & mobile push campaigns
              </p>
            </div>
          </div>
        </div>

        <div className="admin-page-header-actions">
          {!configured && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
              <Shield size={11} /> Novu not configured
            </div>
          )}
          <button
            onClick={() => setTab("settings")}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            <Settings size={14} /> Novu Settings
          </button>
          <button
            onClick={openNew}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px", background: "var(--admin-success, #16a34a)", color: "#fff" }}
          >
            <Plus size={14} /> Compose Push
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`admin-tab ${tab === t.id ? "is-active" : ""}`}
          >
            <t.icon size={13} className="shrink-0 hidden sm:block" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ── */}
      {tab === "campaigns" && (
        <div className="space-y-4">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Bell} label="Total Campaigns" value={notifications.length} color="indigo" />
            <StatCard
              icon={Send}
              label="Sent"
              value={notifications.filter(n => n.status === "sent").length}
              color="emerald"
            />
            <StatCard
              icon={Clock}
              label="Scheduled"
              value={notifications.filter(n => n.status === "scheduled").length}
              color="amber"
            />
            <StatCard
              icon={Users}
              label="Total Reaches"
              value={notifications.reduce((s, n) => s + (n.sentCount || 0), 0).toLocaleString()}
              color="blue"
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-45">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-200 outline-none w-full focus:border-indigo-500 transition"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={12} className="text-slate-400" />
                {["all", "draft", "scheduled", "sent", "failed"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full border transition capitalize ${
                      statusFilter === s
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
                <button
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw size={24} className="animate-spin text-indigo-400" />
                <p className="text-xs">Loading campaigns...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-2xl">
                  <Bell size={28} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {notifications.length === 0 ? "No campaigns yet" : "No matching campaigns"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {notifications.length === 0 ? 'Click "Compose Push" to create your first campaign' : "Try adjusting your search or filter"}
                  </p>
                </div>
                {notifications.length === 0 && (
                  <button
                    onClick={openNew}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition mt-2"
                  >
                    <Plus size={13} /> Create First Campaign
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-card-noPad">
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {["Campaign", "Segment", "Status", "Sent", "Clicked", "CTR", "Date", "Actions"].map(h => (
                          <th key={h} className={h === "Actions" ? "text-right" : ""}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNotifications.map(item => {
                        const loader = actionLoading[item.id];
                        const ctr = item.sentCount > 0 ? ((item.clickedCount / item.sentCount) * 100).toFixed(1) : "—";
                        return (
                          <tr key={item.id}>
                            <td className="max-w-55">
                              <div className="flex items-center gap-2.5">
                                {item.iconUrl ? (
                                  <img src={item.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100" onError={e => e.target.style.display="none"} />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40 flex items-center justify-center shrink-0">
                                    <Bell size={13} className="text-indigo-500" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs truncate max-w-37.5" style={{ color: "var(--admin-text)" }}>{item.title}</p>
                                  <p className="admin-caption truncate max-w-37.5">{item.message}</p>
                                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    {item.sendToWebsite !== false && (
                                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Website</span>
                                    )}
                                    {item.sendToDevice !== false && (
                                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">Device Push</span>
                                    )}
                                  </div>
                                  {item.emailCampaign && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                                      <Mail size={10} />
                                      <span>Campaign: {item.emailCampaign.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-neutral">
                                {item.segment}
                              </span>
                            </td>
                            <td><StatusBadge status={item.status} /></td>
                            <td className="font-semibold">{item.sentCount?.toLocaleString() || 0}</td>
                            <td className="font-semibold">{item.clickedCount?.toLocaleString() || 0}</td>
                            <td className="font-bold text-indigo-600 dark:text-indigo-400">{ctr}{ctr !== "—" ? "%" : ""}</td>
                            <td className="admin-caption">
                              {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="flex items-center gap-1 justify-end">
                                {(item.status === "draft" || item.status === "scheduled") && (
                                  <button
                                    onClick={() => handleSend(item.id)}
                                    disabled={!!loader}
                                    title="Send Now"
                                    className="admin-btn admin-btn-primary"
                                    style={{ padding: "4px" }}
                                  >
                                    {loader === "sending" ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                  </button>
                                )}
                                {item.status === "sent" && (
                                  <>
                                    <a
                                      href={`/api/crm/track/click?pushId=${item.id}&url=${encodeURIComponent(item.url || '/')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Test Link (Simulate User Click)"
                                      className="admin-btn"
                                      style={{ padding: "4px", color: "var(--admin-info)" }}
                                    >
                                      <MousePointerClick size={12} />
                                    </a>
                                    <button
                                      onClick={() => handleRefreshStats(item.id)}
                                      disabled={!!loader}
                                      title="Refresh Stats from Novu"
                                      className="admin-btn"
                                      style={{ padding: "4px", color: "var(--admin-success)" }}
                                    >
                                      {loader === "refreshing" ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    </button>
                                  </>
                                )}
                                {item.status !== "sent" && (
                                  <button
                                    onClick={() => openEdit(item.id)}
                                    title="Edit Draft"
                                    className="admin-btn"
                                    style={{ padding: "4px" }}
                                  >
                                    <Eye size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDuplicate(item.id)}
                                  disabled={!!loader}
                                  title="Duplicate"
                                  className="admin-btn"
                                  style={{ padding: "4px" }}
                                >
                                  {loader === "duplicating" ? <RefreshCw size={12} className="animate-spin" /> : <Copy size={12} />}
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  disabled={!!loader}
                                  title="Delete"
                                  className="admin-btn"
                                  style={{ padding: "4px", color: "var(--admin-error)" }}
                                >
                                  {loader === "deleting" ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          {analyticsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
              <p className="text-xs">Loading analytics...</p>
            </div>
          ) : analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={Send} label="Total Sent" value={analytics.totals.totalSent.toLocaleString()} color="indigo" />
                <StatCard icon={CheckCircle2} label="Delivered" value={analytics.totals.totalDelivered.toLocaleString()} color="emerald" />
                <StatCard icon={MousePointerClick} label="Total Clicked" value={analytics.totals.totalClicked.toLocaleString()} color="blue" />
                <StatCard icon={TrendingUp} label="Avg. CTR" value={`${analytics.totals.ctr}%`} color="violet" />
                <StatCard icon={AlertCircle} label="Failed" value={analytics.totals.totalFailed.toLocaleString()} color="red" />
              </div>

              {/* Top Campaigns */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-indigo-500" /> Top Performing Campaigns
                  </h3>
                  <button
                    onClick={fetchAnalytics}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
                {analytics.topCampaigns.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic">No sent campaigns yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {analytics.topCampaigns.map((c, i) => {
                      const ctr = c.sentCount > 0 ? ((c.clickedCount / c.sentCount) * 100).toFixed(1) : 0;
                      const width = analytics.topCampaigns[0]?.clickedCount > 0
                        ? (c.clickedCount / analytics.topCampaigns[0].clickedCount) * 100
                        : 0;
                      return (
                        <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                          <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-400"}`}>
                            #{i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.title}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{ctr}%</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{c.clickedCount} clicks</p>
                            <p className="text-[10px] text-slate-400">{c.sentCount?.toLocaleString()} sent</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={15} className="text-indigo-500" /> Recent Campaign Activity
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics.recent.map(n => (
                    <div key={n.id} className="px-5 py-3 flex items-center gap-4">
                      <StatusBadge status={n.status} />
                      <p className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{n.title}</p>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Send size={10} />{n.sentCount?.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MousePointerClick size={10} />{n.clickedCount?.toLocaleString()}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <BarChart3 size={28} />
              <p className="text-xs">No analytics data available yet.</p>
              <button onClick={fetchAnalytics} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                <RefreshCw size={12} /> Load Analytics
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div className="max-w-2xl space-y-5">
          {/* Connection Status */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            configured
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400"
          }`}>
            {configured ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div>
              <p className="text-sm font-bold">{configured ? "Novu Connected" : "Novu Not Configured"}</p>
              <p className="text-xs mt-0.5 opacity-80">
                {configured ? "Your Novu Workflow ID and Secret API key are saved. Notifications are ready to send." : "Enter your Workflow ID and Secret API key below to enable notifications."}
              </p>
            </div>
          </div>

          {/* Link to Email Settings */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg shrink-0">
              <Mail size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                Credentials are shared with Email Settings
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 leading-relaxed">
                Novu Workflow ID and Secret API Key are stored alongside your SMTP/email configuration. You can also manage them from the <strong>Email Settings</strong> page under the <strong>Push Notifications</strong> tab — changes sync automatically.
              </p>
              <Link
                href="/crm/email"
                className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition"
              >
                <ExternalLink size={10} /> Open Email Settings → Push Notifications tab
              </Link>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings size={15} className="text-indigo-500" /> Novu API Credentials
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Find these in your Novu dashboard under Settings → API Keys</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Novu Workflow ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. push-notificatuion"
                  value={novuWorkflowId}
                  onChange={e => setNovuWorkflowId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter your Novu Workflow Trigger identifier (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">push-notificatuion</code>). Do NOT paste your API key here.
                </p>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Secret API Key
                </label>
                <input
                  type="password"
                  placeholder="Your Novu Secret API Key"
                  value={novuApiKey}
                  onChange={e => setNovuApiKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">This key is stored securely in your site settings and never exposed to the browser.</p>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="submit"
                disabled={configSaving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {configSaving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {configSaving ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </form>

          {/* Setup Guide */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={15} className="text-amber-500" /> Quick Setup Guide
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { step: 1, title: "Create a Novu account", desc: "Sign up at dashboard.novu.co to manage workflows and subscriber notifications.", link: "https://dashboard.novu.co" },
                { step: 2, title: "Configure your push workflow", desc: "Set up your push notification workflow (e.g. push-notificatuion) in the Novu dashboard.", link: null },
                { step: 3, title: "Copy your credentials", desc: "Navigate to Settings → API Keys in Novu and copy your Secret Key and Workflow ID.", link: null },
                { step: 4, title: "Connect Novu SDK / Triggers", desc: "Use Novu workflow triggers or AHP CRM dashboard to send push messages.", link: "https://docs.novu.co" },
                { step: 5, title: "Paste credentials above & save", desc: "Enter your Novu Workflow ID and Secret API Key in the form above and click Save.", link: null },
              ].map(({ step, title, desc, link }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {title}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supported Features */}
          <div className="bg-linear-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-5">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-3 uppercase tracking-wider">Supported Features</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Custom notification titles",
                "Rich notification images",
                "Custom icon URLs",
                "Audience segmentation",
                "Scheduled delivery",
                "Recurring campaigns",
                "Click-through URLs",
                "Real-time delivery stats",
                "Campaign duplication",
                "CTR analytics",
              ].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-[10px] text-indigo-700 dark:text-indigo-300">
                  <CheckCircle2 size={10} className="shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compose Panel */}
      <ComposePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={handlePanelSaved}
        editingId={editingId}
        siteId={siteId}
        emailCampaigns={emailCampaigns}
        subscriberLists={subscriberLists}
      />
    </div>
  );
}
