"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Megaphone, Mail, Send, Trash2, Plus, RefreshCw,
  Copy, ChevronRight, ChevronLeft, Clock, CheckCircle,
  XCircle, AlertCircle, BarChart2, Calendar, Users,
  FileText, Heart, X, TrendingUp, Radio, Pause,
  LayoutGrid, Search, Filter, ExternalLink, Zap, Check
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CAMPAIGN_TYPES = [
  { value: "newsletter", label: "Newsletter" },
  { value: "promotional", label: "Promotional" },
  { value: "educational", label: "Educational" },
  { value: "product_launch", label: "Product Launch" },
  { value: "event", label: "Event" },
  { value: "webinar", label: "Webinar" },
  { value: "magazine", label: "Magazine" },
  { value: "survey", label: "Survey" },
  { value: "healthcare", label: "Healthcare" },
  { value: "drip", label: "Drip Campaign" },
  { value: "automation", label: "Automation" },
];

const STATUS_CONFIG = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  queued: { label: "Queued", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Radio },
  sending: { label: "Sending", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Send },
  sent: { label: "Sent", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  paused: { label: "Paused", cls: "bg-amber-50 text-amber-600 border-amber-200", icon: Pause },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle },
  failed: { label: "Failed", cls: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
};

const TIMEZONES = [
  "Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "Europe/London", "Europe/Paris", "Asia/Dubai",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

const WIZARD_STEPS = ["Campaign Info", "Audience", "Content", "Schedule", "Review & Launch"];

const DEFAULT_WIZARD = {
  name: "", type: "newsletter", description: "",
  subject: "", previewText: "", senderName: "A Health Place", replyTo: "",
  listId: "", body: "", templateId: "",
  scheduleMode: "now",
  scheduledDate: "", scheduledTime: "09:00", timezone: "Asia/Kolkata",
};

// ─── Shared UI Helpers ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.cls}`}>
      <Icon size={9} />{cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const t = CAMPAIGN_TYPES.find(c => c.value === type);
  if (!t) return null;
  return (
    <span className="text-[10px] text-slate-500 dark:text-slate-400">
      {t.label}
    </span>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1`}>
        <Icon size={11} className={color} />{label}
      </div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function RateBar({ label, pct, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
        <span className="font-bold text-slate-900 dark:text-white">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ campaignId, siteId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!campaignId) return;
    if (!silent && !data) setLoading(true);
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}?t=${Date.now()}`, {
        headers: { "x-site-id": siteId },
        cache: "no-store",
      });
      const d = await res.json();
      if (d.success) setData(d.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [campaignId, siteId]);



  const campaign = data?.campaign;
  const stats = data?.stats;
  const logs = data?.recentLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <BarChart2 size={14} className="text-indigo-600" />
              Campaign Report
            </h2>
            {campaign && <p className="text-xs text-slate-500 mt-0.5">{campaign.name}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchData} title="Refresh Report Data" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
              <X size={16} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-indigo-600" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No data available</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Campaign info */}
            {campaign && (
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{campaign.name}</h3>
                  <StatusBadge status={campaign.status} />
                </div>
                <p className="text-[11px] text-slate-500 italic">"{campaign.subject}"</p>
                {campaign.list && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Users size={10} /> {campaign.list.name}
                  </p>
                )}
                {campaign.sentAt && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar size={10} /> Sent {new Date(campaign.sentAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Delivered", value: stats.sent, color: "text-emerald-600" },
                    { label: "Opened", value: stats.opened, color: "text-blue-600" },
                    { label: "Clicked", value: stats.clicked, color: "text-indigo-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                      <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                {stats.failed > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle size={13} className="shrink-0" />
                    {stats.failed} email{stats.failed !== 1 ? "s" : ""} failed to deliver.
                  </div>
                )}
                <div className="space-y-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</h3>
                  <RateBar label="Delivery Rate" pct={stats.deliveryRate} color="bg-emerald-500" />
                </div>
              </>
            )}

            {/* Recent logs */}
            {logs.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Recipients</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{log.subscriber?.name || log.subscriber?.email}</div>
                        {log.subscriber?.name && <div className="text-slate-400 truncate">{log.subscriber.email}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={log.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats?.totalLogs === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">
                <BarChart2 size={28} className="mx-auto mb-2 text-slate-200" />
                No delivery data yet. Send the campaign to see analytics.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 5-Step Campaign Wizard ───────────────────────────────────────────────────
function CampaignWizard({ onClose, onSaved, lists, templates, siteId, editData }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(editData ? { ...DEFAULT_WIZARD, ...editData } : { ...DEFAULT_WIZARD });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMsg, setTestMsg] = useState(null);
  const [launching, setLaunching] = useState(false);

  // Debounced campaign body preview state
  const [debouncedBody, setDebouncedBody] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    setIsPreviewLoading(true);
    const timer = setTimeout(() => {
      setDebouncedBody(data.body);
      setIsPreviewLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [data.body]);

  const isEdit = !!editData?.id;
  const up = (field, val) => setData(d => ({ ...d, [field]: val }));

  // Validate before advancing
  const canAdvance = () => {
    if (step === 1) return data.name.trim() && data.subject.trim();
    if (step === 2) return true; // audience optional
    if (step === 3) return data.body.trim();
    if (step === 4) return data.scheduleMode === "now" || (data.scheduleMode === "later" && data.scheduledDate && data.scheduledTime);
    return true;
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      let scheduledAt = null;
      if (data.scheduleMode === "later" && data.scheduledDate) {
        scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`).toISOString();
      }
      const payload = {
        name: data.name, subject: data.subject, body: data.body,
        listId: data.listId || null,
        scheduledAt,
        status: data.scheduleMode === "later" ? "scheduled" : "draft",
      };
      let res;
      if (isEdit) {
        res = await fetch(`/api/crm/campaigns/${editData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/crm/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(payload),
        });
      }
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Failed to save");
      onSaved(d.data?.campaign || d.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async (campaignId) => {
    if (!confirm("This will send emails to all active subscribers in the selected list. Continue?")) return;
    setLaunching(true);
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}/send`, {
        method: "POST", headers: { "x-site-id": siteId },
      });
      const d = await res.json();
      if (d.success) {
        onSaved(null); // trigger refresh
        onClose();
      } else {
        setError(d.error || "Send failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleSendTest = async (campaignId) => {
    if (!testEmail) return;
    setTestSending(true); setTestMsg(null);
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ email: testEmail }),
      });
      const d = await res.json();
      setTestMsg(d.success ? { ok: true, msg: `Test sent to ${testEmail}` } : { ok: false, msg: d.error || "Failed" });
    } catch (err) {
      setTestMsg({ ok: false, msg: err.message });
    } finally {
      setTestSending(false);
    }
  };

  const audience = lists.find(l => l.id === data.listId);
  const subscriberCount = audience?._count?.subscribers ?? audience?.subscribers?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[90vh] md:h-175">

        {/* Wizard header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">
              {isEdit ? "Edit Campaign" : "New Campaign"} — Step {step} of {WIZARD_STEPS.length}
            </h2>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">{WIZARD_STEPS[step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800 shrink-0">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(step / WIZARD_STEPS.length) * 100}%` }} />
        </div>

        {/* Step pills */}
        <div className="flex items-center justify-start sm:justify-center gap-1 px-4 sm:px-6 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {WIZARD_STEPS.map((label, i) => (
            <div key={i} className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors shrink-0 whitespace-nowrap ${i + 1 === step ? "bg-indigo-600 text-white" : i + 1 < step ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-400"}`}>
              {i + 1 < step ? <Check size={9} /> : null}
              {i + 1 < step ? null : <span className="opacity-70">{i + 1}.</span>}
              {label}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: Campaign Info ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Campaign Name *</label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={e => up("name", e.target.value)}
                    placeholder="e.g. July Health Tips Newsletter"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Subject Line *</label>
                  <input
                    type="text"
                    value={data.subject}
                    onChange={e => up("subject", e.target.value)}
                    placeholder="The subject your subscribers will see"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Preview Text</label>
                  <input
                    type="text"
                    value={data.previewText}
                    onChange={e => up("previewText", e.target.value)}
                    placeholder="Brief preview shown in inbox"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sender Name</label>
                  <input
                    type="text"
                    value={data.senderName}
                    onChange={e => up("senderName", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Campaign Type</label>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => up("type", t.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all text-[10px] font-bold ${data.type === t.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 hover:bg-indigo-50/40"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Audience ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Select the contact list to send this campaign to. Only <strong>active</strong> subscribers in the list will receive the email.</p>
              {lists.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ No contact lists found. <Link href="/crm/lists" className="underline font-semibold">Create a list first</Link> to target an audience. You can save as draft without selecting a list.
                </div>
              ) : (
                <div className="space-y-2">
                  {[{ id: "", name: "No list (draft only)", _count: { subscribers: 0 } }, ...lists].map(list => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => up("listId", list.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${data.listId === list.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-400" : "border-slate-200 dark:border-slate-700 hover:border-indigo-200"}`}
                    >
                      <div>
                        <div className={`text-sm font-semibold ${data.listId === list.id ? "text-indigo-700 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>{list.name}</div>
                        {list.description && <div className="text-xs text-slate-400 mt-0.5">{list.description}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {list.id && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Users size={11} /> {list._count?.subscribers ?? 0}
                          </span>
                        )}
                        {data.listId === list.id && <CheckCircle size={16} className="text-indigo-600" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {data.listId && subscriberCount > 0 && (
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <Users size={14} className="shrink-0" />
                  This campaign will be sent to <strong>{subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}</strong>.
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Content ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Apply a Template</label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { up("body", t.htmlContent); up("templateId", t.id); }}
                        className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${data.templateId === t.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700" : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 text-slate-700 dark:text-slate-300"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>📄 {t.name}</span>
                          {data.templateId === t.id && <CheckCircle size={12} className="text-indigo-600 shrink-0" />}
                        </div>
                        {t.subject && <div className="text-[10px] text-slate-400 mt-0.5 truncate">"{t.subject}"</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Compose Message Body</span>
                  <div className="flex gap-1.5 text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">{"{{first_name}}"}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">{"{{email}}"}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">{"{{unsubscribe_link}}"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Body (HTML) *</label>
                    <textarea
                      value={data.body}
                      onChange={e => { up("body", e.target.value); up("templateId", ""); }}
                      rows={16}
                      placeholder={"<h1>Hello {{first_name}},</h1>\n<p>Your email content here...</p>"}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Visual Preview</label>
                      {isPreviewLoading && <span className="text-[9px] text-indigo-500 font-bold animate-pulse">Syncing preview...</span>}
                    </div>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white overflow-hidden shadow-xs h-100">
                      <iframe
                        srcDoc={debouncedBody || "<div style='font-family: sans-serif; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;'>Write some HTML markup or select a template above to see the campaign body live.</div>"}
                        title="Visual Preview"
                        className={`w-full h-full transition-opacity duration-200 ${isPreviewLoading ? "opacity-60" : "opacity-100"}`}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Schedule ───────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "now", label: "Send Now", icon: Send, desc: "Dispatch immediately after launching" },
                  { key: "later", label: "Schedule Later", icon: Calendar, desc: "Pick a date & time to send" },
                  { key: "recurring", label: "Recurring", icon: RefreshCw, desc: "Send on a repeating schedule" },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => up("scheduleMode", opt.key)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all ${data.scheduleMode === opt.key ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-400" : "border-slate-200 dark:border-slate-700 hover:border-indigo-200"}`}
                    >
                      <Icon className="text-indigo-600 dark:text-indigo-400" size={18} />
                      <div>
                        <div className={`text-xs font-bold ${data.scheduleMode === opt.key ? "text-indigo-700 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>{opt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {data.scheduleMode === "later" && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Date *</label>
                      <input
                        type="date"
                        value={data.scheduledDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e => up("scheduledDate", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Time *</label>
                      <input
                        type="time"
                        value={data.scheduledTime}
                        onChange={e => up("scheduledTime", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Timezone</label>
                    <select
                      value={data.timezone}
                      onChange={e => up("timezone", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  {data.scheduledDate && data.scheduledTime && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      📅 Scheduled for {new Date(`${data.scheduledDate}T${data.scheduledTime}`).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} ({data.timezone})
                    </p>
                  )}
                </div>
              )}

              {data.scheduleMode === "recurring" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-2 font-bold mb-1"><Zap size={14} /> Recurring Campaigns</div>
                  <p className="text-xs">Recurring automation is available in the campaign automation module. For now, schedule this as a one-time send and duplicate it for recurrence.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Review & Launch ────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 space-y-2.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Campaign Summary</h3>
                {[
                  ["Name", data.name],
                  ["Type", CAMPAIGN_TYPES.find(t => t.value === data.type)?.label || data.type],
                  ["Subject", data.subject],
                  ["Audience", audience ? `${audience.name} (${subscriberCount} subscribers)` : "No list selected (draft)"],
                  ["Schedule", data.scheduleMode === "now" ? "Send immediately" : data.scheduleMode === "later" ? `${data.scheduledDate} at ${data.scheduledTime} (${data.timezone})` : "Recurring"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-20 shrink-0 mt-0.5">{label}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Test email */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Send Test Email</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={async () => {
                      if (!isEdit) {
                        // Save draft first, then test
                        setSaving(true);
                        try {
                          const res = await fetch("/api/crm/campaigns", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-site-id": siteId },
                            body: JSON.stringify({ name: data.name, subject: data.subject, body: data.body, listId: data.listId || null, status: "draft" }),
                          });
                          const d = await res.json();
                          if (d.success) {
                            const newId = d.data?.campaign?.id || d.data?.id;
                            if (newId) await handleSendTest(newId);
                          }
                        } finally { setSaving(false); }
                      } else {
                        handleSendTest(editData.id);
                      }
                    }}
                    disabled={testSending || !testEmail}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 w-full sm:w-auto bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {testSending ? <RefreshCw size={11} className="animate-spin" /> : <Mail size={11} />}
                    Test
                  </button>
                </div>
                {testMsg && (
                  <p className={`text-xs font-semibold ${testMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{testMsg.msg}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={14} /> {step > 1 ? "Back" : "Cancel"}
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <FileText size={11} />}
                Save as {data.scheduleMode === "later" ? "Scheduled" : "Draft"}
              </button>
              {data.scheduleMode === "now" && data.listId && (
                <button
                  onClick={async () => {
                    // Save then send
                    setSaving(true); setError(null);
                    try {
                      const res = await fetch(isEdit ? `/api/crm/campaigns/${editData.id}` : "/api/crm/campaigns", {
                        method: isEdit ? "PUT" : "POST",
                        headers: { "Content-Type": "application/json", "x-site-id": siteId },
                        body: JSON.stringify({ name: data.name, subject: data.subject, body: data.body, listId: data.listId, status: "draft" }),
                      });
                      const d = await res.json();
                      if (!d.success) throw new Error(d.error);
                      const id = d.data?.campaign?.id || d.data?.id || (isEdit && editData.id);
                      await handleSendNow(id);
                    } catch (err) {
                      setError(err.message);
                      setSaving(false);
                    }
                  }}
                  disabled={saving || launching}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {launching ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                  {launching ? "Launching..." : "Launch Campaign"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");

  // UI state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [analyticsId, setAnalyticsId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  useEffect(() => {
    if (siteId) { fetchAll(); }
  }, [siteId]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCampaigns(), fetchLists(), fetchTemplates()]);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/crm/campaigns", { headers: { "x-site-id": siteId } });
      const d = await res.json().catch(() => ({}));
      if (d.success) setCampaigns(d.data?.campaigns || []);
    } catch (err) { console.error(err); }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/crm/lists", { headers: { "x-site-id": siteId } });
      const d = await res.json().catch(() => ({}));
      if (d.success) setLists(d.data?.lists || []);
    } catch (err) { console.error(err); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/crm/templates", { headers: { "x-site-id": siteId } });
      const d = await res.json().catch(() => ({}));
      if (d.success) setTemplates(d.data?.templates || []);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/crm/campaigns/${id}`, { method: "DELETE", headers: { "x-site-id": siteId } });
      const d = await res.json();
      if (d.success) setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await fetch(`/api/crm/campaigns/${id}/duplicate`, { method: "POST", headers: { "x-site-id": siteId } });
      const d = await res.json();
      if (d.success) { await fetchCampaigns(); }
    } catch (err) { console.error(err); }
  };

  const handleSendNow = async (id) => {
    if (!confirm("Send this campaign to all active subscribers now?")) return;
    try {
      const res = await fetch(`/api/crm/campaigns/${id}/send`, { method: "POST", headers: { "x-site-id": siteId } });
      const d = await res.json();
      if (d.success) {
        alert(`📤 Campaign queued — ${d.data?.queued || 0} emails being sent.`);
        await fetchCampaigns();

        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const checkRes = await fetch("/api/crm/campaigns", { headers: { "x-site-id": siteId } });
            const checkData = await checkRes.json().catch(() => ({}));
            if (checkData.success) {
              setCampaigns(checkData.data?.campaigns || []);
              const updatedCampaign = checkData.data?.campaigns?.find(c => c.id === id);
              if (updatedCampaign && updatedCampaign.status !== "sending") {
                clearInterval(pollInterval);
              }
            }
          } catch (e) { }
          if (pollCount >= 24) clearInterval(pollInterval);
        }, 5000);
      } else {
        alert(`Error: ${d.error}`);
      }
    } catch (err) { alert(err.message); }
  };

  // Stats
  const stats = useMemo(() => {
    const sent = campaigns.filter(c => ["sent", "completed"].includes(c.status)).length;
    const scheduled = campaigns.filter(c => c.status === "scheduled").length;
    const draft = campaigns.filter(c => c.status === "draft").length;
    return { total: campaigns.length, sent, scheduled, draft };
  }, [campaigns]);

  const filtered = useMemo(() => campaigns.filter(c => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [campaigns, filterStatus, search]);

  const handleWizardSaved = (campaign) => {
    if (campaign) {
      setCampaigns(prev => {
        const idx = prev.findIndex(c => c.id === campaign.id);
        return idx >= 0 ? prev.map(c => c.id === campaign.id ? campaign : c) : [campaign, ...prev];
      });
    }
    fetchCampaigns();
  };

  return (
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title flex items-center gap-2">
            <Megaphone size={22} style={{ color: "var(--admin-crm-accent)" }} /> Email Campaigns
          </h1>
          <p className="admin-caption mt-1">Create, schedule, and broadcast email campaigns to your subscriber lists</p>
        </div>
        <div className="admin-page-header-actions">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => { setEditData(null); setWizardOpen(true); }}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px", background: "var(--admin-crm-accent)", color: "#fff" }}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total Campaigns" value={stats.total} icon={Megaphone} color="text-indigo-600" />
        <MetricCard label="Sent" value={stats.sent} icon={CheckCircle} color="text-emerald-600" />
        <MetricCard label="Scheduled" value={stats.scheduled} icon={Calendar} color="text-blue-600" />
        <MetricCard label="Draft" value={stats.draft} icon={FileText} color="text-slate-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        {(search || filterStatus !== "all") && (
          <button onClick={() => { setSearch(""); setFilterStatus("all"); }} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} campaign{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Campaign Table */}
      <div className="admin-card-noPad">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 admin-caption">
            <RefreshCw size={16} className="animate-spin text-indigo-600" /> Loading campaigns...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center w-full">
            <Megaphone size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="admin-body-text font-semibold text-center">{search || filterStatus !== "all" ? "No campaigns match your filters." : "No campaigns yet."}</p>
            <p className="admin-caption mt-1 text-center">Click "New Campaign" to create your first email campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  {["Campaign", "Subject", "Audience", "Status", "Date", ""].map(h => (
                    <th key={h} className={h === "" ? "text-right" : ""}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{c.name}</div>
                      <TypeBadge type={c.type} />
                    </td>
                    <td>
                      <span className="italic truncate block max-w-50" style={{ color: "var(--admin-text-muted)" }}>"{c.subject}"</span>
                    </td>
                    <td>
                      {c.list ? (
                        <span className="flex items-center gap-1 admin-caption"><Users size={10} />{c.list.name}</span>
                      ) : (
                        <span className="admin-caption">—</span>
                      )}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="admin-caption">
                      {c.sentAt ? (
                        <><div className="font-semibold" style={{ color: "var(--admin-text)" }}>Sent</div>{new Date(c.sentAt).toLocaleDateString()}</>
                      ) : c.scheduledAt ? (
                        <><div className="font-semibold" style={{ color: "var(--admin-info)" }}>Scheduled</div>{new Date(c.scheduledAt).toLocaleDateString()}</>
                      ) : (
                        new Date(c.createdAt).toLocaleDateString()
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex items-center gap-1 justify-end">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditData({ ...c, listId: c.listId || "" }); setWizardOpen(true); }}
                          title="Edit"
                          className="admin-btn"
                          style={{ padding: "4px" }}
                        >
                          <FileText size={13} />
                        </button>
                        {/* Send Now (draft only) */}
                        {c.status === "draft" && (
                          <button
                            onClick={() => handleSendNow(c.id)}
                            title="Send Now"
                            className="admin-btn"
                            style={{ padding: "4px" }}
                          >
                            <Send size={13} />
                          </button>
                        )}
                        {/* Analytics */}
                        {["sent", "completed"].includes(c.status) && (
                          <button
                            onClick={() => setAnalyticsId(c.id)}
                            title="View Analytics"
                            className="admin-btn"
                            style={{ padding: "4px" }}
                          >
                            <BarChart2 size={13} />
                          </button>
                        )}
                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(c.id)}
                          title="Duplicate"
                          className="admin-btn"
                          style={{ padding: "4px" }}
                        >
                          <Copy size={13} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Delete"
                          className="admin-btn"
                          style={{ padding: "4px", color: "var(--admin-error)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/crm/templates", label: "Email Templates", icon: FileText, desc: "Manage reusable HTML templates" },
          { href: "/crm/subscribers", label: "Subscribers", icon: Users, desc: "View and import subscriber contacts" },
          { href: "/crm/lists", label: "Contact Lists", icon: LayoutGrid, desc: "Organize subscribers into lists" },
        ].map(link => (
          <a key={link.href} href={link.href} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group">
            <link.icon size={18} className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{link.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{link.desc}</div>
            </div>
            <ExternalLink size={12} className="text-slate-300 ml-auto shrink-0" />
          </a>
        ))}
      </div>

      {/* Wizard Modal */}
      {wizardOpen && (
        <CampaignWizard
          onClose={() => { setWizardOpen(false); setEditData(null); }}
          onSaved={handleWizardSaved}
          lists={lists}
          templates={templates}
          siteId={siteId}
          editData={editData}
        />
      )}

      {/* Analytics Panel */}
      {analyticsId && (
        <AnalyticsPanel
          campaignId={analyticsId}
          siteId={siteId}
          onClose={() => setAnalyticsId(null)}
        />
      )}
    </div>
  );
}
