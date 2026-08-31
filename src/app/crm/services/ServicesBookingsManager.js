"use client";

import { useState, useMemo } from "react";
import {
  Search, Mail, Eye, Trash2, X,
  CheckCircle, Clock, AlertCircle, XCircle, DollarSign,
  Phone, Globe, MapPin, Calendar, FileText, Send,
  Download, Star, User, Briefcase, MessageSquare, RefreshCw,
  Package, CreditCard, Bell, Activity,
  LayoutGrid, List, Check, Plus, Grip, Sparkles,
} from "lucide-react";
import ServicesBannerEditorModal from "@/components/ServicesBannerEditorModal";

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "closed", "lost"];

const STATUS_CONFIG = {
  new:       { color: "bg-blue-50 text-blue-700 border-blue-200",       icon: Clock,         label: "New" },
  contacted: { color: "bg-amber-50 text-amber-700 border-amber-200",    icon: MessageSquare, label: "Contacted" },
  qualified: { color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Star,          label: "Qualified" },
  won:       { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle, label: "Won / Paid" },
  closed:    { color: "bg-slate-100 text-slate-600 border-slate-200",   icon: XCircle,       label: "Closed" },
  lost:      { color: "bg-red-50 text-red-700 border-red-200",          icon: AlertCircle,   label: "Lost" },
};

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

const TODAY = getTodayString();

// ─── Notes Helpers ────────────────────────────────────────────────────────────
function parseNotes(rawNotes) {
  const empty = { booking: "", notes: "", meta: { payment: {}, reminders: [], activityLog: [] } };
  if (!rawNotes) return empty;
  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed.__booking !== undefined || parsed.__notes !== undefined) {
      return {
        booking: parsed.__booking || "",
        notes: parsed.__notes || "",
        meta: {
          payment: parsed.__meta?.payment || {},
          reminders: parsed.__meta?.reminders || [],
          activityLog: parsed.__meta?.activityLog || [],
        },
      };
    }
  } catch {}
  // Legacy plain-text booking format
  return { ...empty, booking: rawNotes };
}

function serializeNotes(booking, notes, meta) {
  return JSON.stringify({ __booking: booking, __notes: notes, __meta: meta });
}

function addActivity(meta, action) {
  return {
    ...meta,
    activityLog: [
      { at: new Date().toISOString(), action },
      ...(meta.activityLog || []),
    ].slice(0, 50),
  };
}

function parseBookingDetails(text) {
  if (!text) return {};
  const details = {};
  const fields = [
    ["professionalTitle", /Professional Title:\s*(.+)/i],
    ["website",           /Company\/Practice Website:\s*(.+)/i],
    ["phone",             /Phone:\s*(.+)/i],
    ["location",          /State & Country:\s*(.+)/i],
    ["mediaPackage",      /Requested Media Package:\s*(.+)/i],
    ["timeline",          /Desired Timeline:\s*(.+)/i],
    ["story",             /About Story \/ Brand Mission:\s*([\s\S]+?)(?:\n[A-Z]|$)/i],
  ];
  for (const [key, regex] of fields) {
    const m = text.match(regex);
    if (m) details[key] = m[1].trim();
  }
  return details;
}

// ─── Shared UI Pieces ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function PriceBadge({ interest }) {
  if (!interest) return null;
  const m = interest.match(/\$(\d+)/);
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
      <DollarSign size={10} />{m[1]}
    </span>
  );
}

function PaymentBadge({ payment }) {
  if (!payment?.paymentStatus || payment.paymentStatus === "pending") return null;
  const cls = payment.paymentStatus === "paid"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${cls}`}>
      <CreditCard size={9} />
      {payment.paymentStatus === "paid" ? "Paid" : "Partial"}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={12} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{label}</span>
        <div className="text-xs text-slate-700 break-words">{value}</div>
      </div>
    </div>
  );
}

// ─── Won Confirmation Email Builder ───────────────────────────────────────────
function buildWonEmailHtml(lead) {
  return `
    <div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
      <div style="background:white;border-radius:10px;padding:32px;border:1px solid #e5e7eb">
        <h2 style="color:#065f46;margin:0 0 8px">🎉 Congratulations, ${lead.name.split(" ")[0]}!</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Your media partnership has been confirmed.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px"/>
        <p>Dear <strong>${lead.name}</strong>,</p>
        <p>We are thrilled to confirm your partnership with <strong>A Health Place</strong>! Your application for the <strong>${lead.serviceInterest || "media package"}</strong> has been approved and we are excited to begin working with you.</p>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin:24px 0">
          <p style="margin:0;color:#065f46;font-weight:600">📋 Package Confirmed: ${lead.serviceInterest || "Media Package"}</p>
        </div>
        <p>Our team will be in touch shortly to begin the onboarding process and get you started on your journey with A Health Place.</p>
        <p>If you have any questions in the meantime, please do not hesitate to reply to this email.</p>
        <p style="margin-top:32px">Warm regards,<br/><strong>The A Health Place Team</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:11px;color:#9ca3af;margin:0">A Health Place · ahealthplace.com</p>
      </div>
    </div>
  `;
}

async function sendWonConfirmation(lead, siteId) {
  try {
    await fetch("/api/dashboard/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-site-id": siteId },
      body: JSON.stringify({
        to: lead.email,
        subject: `🎉 You're Confirmed! – ${lead.serviceInterest || "Media Package"} | A Health Place`,
        html: buildWonEmailHtml(lead),
      }),
    });
  } catch (err) {
    console.error("Won confirmation email failed:", err);
  }
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────
function LeadDetailPanel({ lead, siteId, onClose, onUpdate }) {
  const parsed = parseNotes(lead.notes);
  const booking = parseBookingDetails(parsed.booking);

  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(parsed.notes);
  const [meta, setMeta] = useState(parsed.meta);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [tab, setTab] = useState("details");

  // Email
  const [emailTo, setEmailTo] = useState(lead.email);
  const [emailSubject, setEmailSubject] = useState(`Re: Your Media Package Inquiry – ${lead.name}`);
  const [emailBody, setEmailBody] = useState(
    `Hi ${lead.name.split(" ")[0]},\n\nThank you for your interest in our media partnership services at A Health Place.\n\nWe have reviewed your submission and would like to move forward with your request.\n\n[Add your message here]\n\nBest regards,\nA Health Place Team`
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  // Payment
  const [payment, setPayment] = useState({
    invoiceNumber: meta.payment?.invoiceNumber || "",
    paidAmount:    meta.payment?.paidAmount    || "",
    paidAt:        meta.payment?.paidAt        || "",
    paymentStatus: meta.payment?.paymentStatus || "pending",
  });

  // Reminders
  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  const activeReminders = (meta.reminders || []).filter(r => !r.done);

  const showSaveMsg = (type, message) => {
    setSaveMsg({ type, message });
    setTimeout(() => setSaveMsg(null), 4000);
  };

  // ── Save Status / Notes ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const prevStatus = lead.status;
      let newMeta = { ...meta };

      if (prevStatus !== status) newMeta = addActivity(newMeta, `Status: ${STATUS_CONFIG[prevStatus]?.label || prevStatus} → ${STATUS_CONFIG[status]?.label || status}`);
      if (notes !== parsed.notes) newMeta = addActivity(newMeta, "Internal notes updated");

      const serialized = serializeNotes(parsed.booking, notes, newMeta);
      const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status, notes: serialized }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");

      setMeta(newMeta);
      const updatedLead = { ...lead, status, notes: serialized };
      onUpdate(updatedLead);

      if (prevStatus !== "won" && status === "won") {
        sendWonConfirmation(lead, siteId);
        showSaveMsg("success", "Saved! A confirmation email was automatically sent to the client.");
      } else {
        showSaveMsg("success", "Changes saved successfully.");
      }
    } catch (err) {
      showSaveMsg("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Send Manual Email ────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/dashboard/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          html: `<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:auto;padding:24px">
            ${emailBody.replace(/\n/g, "<br/>")}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:12px;color:#888">A Health Place · ahealthplace.com</p>
          </div>`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email failed");

      // Log activity
      const newMeta = addActivity(meta, `Email sent to ${emailTo}: "${emailSubject}"`);
      const serialized = serializeNotes(parsed.booking, notes, newMeta);
      await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status, notes: serialized }),
      });
      setMeta(newMeta);
      onUpdate({ ...lead, status, notes: serialized });
      setEmailStatus({ type: "success", message: `Email sent to ${emailTo}` });
    } catch (err) {
      setEmailStatus({ type: "error", message: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Save Payment ─────────────────────────────────────────────────────────
  const handleSavePayment = async () => {
    setSaving(true);
    try {
      let newMeta = { ...meta, payment };
      newMeta = addActivity(newMeta, `Payment updated: ${payment.paymentStatus}${payment.invoiceNumber ? ` (${payment.invoiceNumber})` : ""}${payment.paidAmount ? ` $${payment.paidAmount}` : ""}`);
      const serialized = serializeNotes(parsed.booking, notes, newMeta);
      const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status, notes: serialized }),
      });
      if (!res.ok) throw new Error("Failed to save payment info");
      setMeta(newMeta);
      onUpdate({ ...lead, status, notes: serialized });
      showSaveMsg("success", "Payment info saved.");
    } catch (err) {
      showSaveMsg("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Reminder Actions ─────────────────────────────────────────────────────
  const persistMeta = async (newMeta) => {
    const serialized = serializeNotes(parsed.booking, notes, newMeta);
    await fetch(`/api/dashboard/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-site-id": siteId },
      body: JSON.stringify({ status, notes: serialized }),
    });
    setMeta(newMeta);
    onUpdate({ ...lead, status, notes: serialized });
  };

  const handleAddReminder = async () => {
    if (!reminderDate) return;
    const reminder = { id: `rem_${(meta.reminders || []).length + 1}_${reminderDate}`, date: reminderDate, note: reminderNote, done: false };
    const newMeta = addActivity(
      { ...meta, reminders: [...(meta.reminders || []), reminder] },
      `Reminder set for ${reminderDate}${reminderNote ? `: ${reminderNote}` : ""}`
    );
    await persistMeta(newMeta);
    setReminderDate(""); setReminderNote("");
  };

  const handleToggleReminder = async (id) => {
    const newMeta = {
      ...meta,
      reminders: (meta.reminders || []).map(r => r.id === id ? { ...r, done: !r.done } : r),
    };
    await persistMeta(newMeta);
  };

  const handleDeleteReminder = async (id) => {
    const newMeta = { ...meta, reminders: (meta.reminders || []).filter(r => r.id !== id) };
    await persistMeta(newMeta);
  };

  const TABS = [
    ["details", "Details", FileText],
    ["email",   "Send Email", Mail],
    ["payment", "Payment", CreditCard],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">{lead.name}</h2>
            <p className="text-xs text-slate-500">{lead.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {activeReminders.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                <Bell size={9} /> {activeReminders.length}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                tab === key ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {saveMsg && (
          <div className={`mx-5 mt-3 p-2.5 rounded-lg text-xs font-semibold border ${saveMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {saveMsg.message}
          </div>
        )}

        {/* ═══════════════ DETAILS TAB ═══════════════════════════ */}
        {tab === "details" && (
          <div className="flex-1 p-5 space-y-5">

            {/* Contact */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h3>
              <DetailRow icon={User}     label="Name"     value={lead.name} />
              <DetailRow icon={Mail}     label="Email"    value={lead.email} />
              {lead.phone && <DetailRow icon={Phone} label="Phone" value={lead.phone} />}
              {booking.professionalTitle && <DetailRow icon={Briefcase} label="Title" value={booking.professionalTitle} />}
              {booking.website && (
                <DetailRow icon={Globe} label="Website" value={
                  <a href={booking.website.startsWith("http") ? booking.website : `https://${booking.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block">{booking.website}</a>
                } />
              )}
              {booking.location && <DetailRow icon={MapPin} label="Location" value={booking.location} />}
            </div>

            {/* Package */}
            {(lead.serviceInterest || booking.mediaPackage || booking.timeline) && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Service Request</h3>
                {lead.serviceInterest && (
                  <DetailRow icon={Package} label="Package" value={
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-700">{lead.serviceInterest}</span>
                      <PriceBadge interest={lead.serviceInterest} />
                    </div>
                  } />
                )}
                {booking.timeline && <DetailRow icon={Calendar} label="Timeline" value={booking.timeline} />}
                {lead.sourcePage && <DetailRow icon={Globe} label="Source" value={lead.sourcePage} />}
              </div>
            )}

            {/* Brand story */}
            {booking.story && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Brand Story / Mission</h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{booking.story}</p>
              </div>
            )}

            {/* CRM controls */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CRM Management</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {LEAD_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                  ))}
                </select>
                {status === "won" && lead.status !== "won" && (
                  <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Mail size={9} /> A confirmation email will be sent to the client automatically on save.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add internal notes about this client..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* ── Follow-up Reminders ─────────────────────────────── */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Bell size={10} /> Follow-up Reminders
              </h3>

              {/* Add reminder row */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={reminderDate}
                  min={TODAY}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="shrink-0 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <input
                  type="text"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Reminder note..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddReminder()}
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <button
                  onClick={handleAddReminder}
                  disabled={!reminderDate}
                  className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Reminder list */}
              {(meta.reminders || []).length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-1">No reminders set</p>
              ) : (
                <div className="space-y-1.5">
                  {[...(meta.reminders || [])].sort((a, b) => a.date.localeCompare(b.date)).map(r => {
                    const todayStr = getTodayString();
                    const overdue = !r.done && r.date < todayStr;
                    const isToday = !r.done && r.date === todayStr;
                    return (
                      <div key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${r.done ? "bg-slate-50 border-slate-100 opacity-60" : overdue ? "bg-red-50 border-red-200" : isToday ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
                        <button
                          onClick={() => handleToggleReminder(r.id)}
                          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${r.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-400"}`}
                        >
                          {r.done && <Check size={9} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`font-semibold ${r.done ? "line-through text-slate-400" : overdue ? "text-red-700" : "text-slate-700"}`}>
                            {r.date}
                            {overdue  && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">Overdue</span>}
                            {isToday  && <span className="ml-1 text-[9px] bg-amber-100 text-amber-600 px-1 rounded">Today</span>}
                          </span>
                          {r.note && <span className="text-slate-500 ml-1.5">{r.note}</span>}
                        </div>
                        <button onClick={() => handleDeleteReminder(r.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Activity Log ────────────────────────────────────── */}
            {(meta.activityLog || []).length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Activity size={10} /> Activity Log
                </h3>
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {(meta.activityLog || []).map((entry, i) => (
                    <div key={i} className="flex gap-3 text-[10px]">
                      <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {i < (meta.activityLog.length - 1) && <div className="w-px flex-1 bg-indigo-100" />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="text-slate-700 font-medium">{entry.action}</div>
                        <div className="text-slate-400 mt-0.5">{new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-xs text-slate-400">
              Submitted {new Date(lead.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        )}

        {/* ═══════════════ EMAIL TAB ══════════════════════════════ */}
        {tab === "email" && (
          <div className="flex-1 p-5 space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-start gap-2">
              <Mail size={13} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">Compose and send a direct email to this client via your configured email service (Resend).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">To</label>
              <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Quick Templates</label>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Follow Up",  `Hi ${lead.name.split(" ")[0]},\n\nJust following up on your media package inquiry. We'd love to discuss your feature further.\n\nWhen would be a good time to connect?\n\nBest regards,\nA Health Place Team`],
                  ["Approval",   `Hi ${lead.name.split(" ")[0]},\n\nGreat news! Your application has been approved. We're excited to feature you in the next issue of A Health Place.\n\nPlease reply to confirm your package selection and we'll begin the onboarding process.\n\nBest regards,\nA Health Place Team`],
                  ["Invoice",    `Hi ${lead.name.split(" ")[0]},\n\nThank you for confirming your interest! Your invoice for the ${lead.serviceInterest || "selected package"} will be sent shortly.\n\nPlease let us know if you have any questions.\n\nBest regards,\nA Health Place Team`],
                ].map(([label, body]) => (
                  <button key={label} onClick={() => setEmailBody(body)} className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {emailStatus && (
              <div className={`p-3 rounded-lg text-xs font-semibold border ${emailStatus.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                {emailStatus.message}
              </div>
            )}

            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {sendingEmail ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              {sendingEmail ? "Sending..." : "Send Email"}
            </button>
          </div>
        )}

        {/* ═══════════════ PAYMENT TAB ════════════════════════════ */}
        {tab === "payment" && (
          <div className="flex-1 p-5 space-y-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 flex items-start gap-2">
              <CreditCard size={13} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700">Track payment status, invoice number, and paid amounts for this booking.</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Details</h3>

              {/* Status toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Status</label>
                <div className="flex gap-2">
                  {[["pending", "Pending"], ["partial", "Partial"], ["paid", "Paid"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setPayment(p => ({ ...p, paymentStatus: val }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                        payment.paymentStatus === val
                          ? val === "paid"    ? "bg-emerald-500 text-white border-emerald-500"
                            : val === "partial" ? "bg-amber-500 text-white border-amber-500"
                            : "bg-slate-500 text-white border-slate-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Invoice Number</label>
                <input
                  type="text"
                  value={payment.invoiceNumber}
                  onChange={(e) => setPayment(p => ({ ...p, invoiceNumber: e.target.value }))}
                  placeholder="e.g. INV-2026-001"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount Paid ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    min="0"
                    value={payment.paidAmount}
                    onChange={(e) => setPayment(p => ({ ...p, paidAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={payment.paidAt}
                  onChange={(e) => setPayment(p => ({ ...p, paidAt: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <button
                onClick={handleSavePayment}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {saving ? <RefreshCw size={12} className="animate-spin" /> : <CreditCard size={12} />}
                {saving ? "Saving..." : "Save Payment Info"}
              </button>
            </div>

            {/* Summary card */}
            {(payment.invoiceNumber || payment.paidAmount) && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2.5">
                <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Payment Summary</h3>
                {payment.invoiceNumber && <DetailRow icon={FileText}     label="Invoice" value={payment.invoiceNumber} />}
                {payment.paidAmount    && <DetailRow icon={DollarSign}   label="Amount"  value={`$${parseFloat(payment.paidAmount).toLocaleString()}`} />}
                {payment.paidAt        && <DetailRow icon={Calendar}     label="Date"    value={payment.paidAt} />}
                <DetailRow icon={CheckCircle} label="Status" value={
                  <span className={`font-bold capitalize ${payment.paymentStatus === "paid" ? "text-emerald-600" : payment.paymentStatus === "partial" ? "text-amber-600" : "text-slate-500"}`}>
                    {payment.paymentStatus}
                  </span>
                } />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ lead, onDragStart, onClick }) {
  const parsedMeta = parseNotes(lead.notes).meta;
  const hasOverdue = (parsedMeta.reminders || []).some(r => !r.done && r.date < TODAY);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onClick(lead)}
      className="bg-white border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">{lead.name}</div>
          <div className="text-[10px] text-slate-400 truncate">{lead.email}</div>
        </div>
        <Grip size={12} className="text-slate-300 group-hover:text-slate-400 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {lead.serviceInterest && (
          <span className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 truncate max-w-[130px]">
            {lead.serviceInterest}
          </span>
        )}
        <PriceBadge interest={lead.serviceInterest} />
        <PaymentBadge payment={parsedMeta.payment} />
        {hasOverdue && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-50 text-red-600 border border-red-200">
            <Bell size={8} /> Overdue
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-400 mt-1.5">
        {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
const KANBAN_COL_STYLE = {
  new:       { bg: "bg-blue-50",    border: "border-blue-200",   header: "text-blue-700"    },
  contacted: { bg: "bg-amber-50",   border: "border-amber-200",  header: "text-amber-700"   },
  qualified: { bg: "bg-indigo-50",  border: "border-indigo-200", header: "text-indigo-700"  },
  won:       { bg: "bg-emerald-50", border: "border-emerald-200",header: "text-emerald-700" },
  closed:    { bg: "bg-slate-100",  border: "border-slate-200",  header: "text-slate-600"   },
  lost:      { bg: "bg-red-50",     border: "border-red-200",    header: "text-red-700"     },
};

function KanbanBoard({ leads, siteId, onLeadClick, onLeadUpdate }) {
  const [draggingId, setDraggingId]     = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(LEAD_STATUSES.map(s => [s, []]));
    leads.forEach(l => { if (map[l.status]) map[l.status].push(l); });
    return map;
  }, [leads]);

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    if (!draggingId) return;

    const lead = leads.find(l => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    const p = parseNotes(lead.notes);
    const newMeta = addActivity(p.meta, `Status: ${STATUS_CONFIG[lead.status]?.label} → ${STATUS_CONFIG[newStatus]?.label}`);
    const serialized = serializeNotes(p.booking, p.notes, newMeta);
    onLeadUpdate({ ...lead, status: newStatus, notes: serialized });

    try {
      await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status: newStatus, notes: serialized }),
      });
      if (newStatus === "won" && lead.status !== "won") {
        sendWonConfirmation(lead, siteId);
      }
    } catch (err) {
      console.error("Kanban drop update failed:", err);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "500px" }}>
      {LEAD_STATUSES.map(status => {
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        const col = KANBAN_COL_STYLE[status];
        const isDragOver = dragOverStatus === status;
        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            onDragLeave={() => setDragOverStatus(null)}
            className={`flex-shrink-0 w-56 rounded-xl border-2 transition-all duration-150 ${isDragOver ? "border-indigo-400 scale-[1.01] shadow-lg" : `${col.border} border`} ${col.bg}`}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-black/5">
              <div className={`flex items-center gap-1.5 text-xs font-bold ${col.header}`}>
                <Icon size={12} />{cfg.label}
              </div>
              <span className="text-[10px] font-bold bg-white/70 text-slate-500 rounded-full px-1.5 py-0.5 border border-black/10">
                {grouped[status].length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[100px]">
              {grouped[status].length === 0 && (
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragOver ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200"}`}>
                  <p className="text-[10px] text-slate-400">Drop here</p>
                </div>
              )}
              {grouped[status].map(lead => (
                <div key={lead.id} className={`transition-opacity duration-150 ${draggingId === lead.id ? "opacity-40" : ""}`}>
                  <KanbanCard lead={lead} onDragStart={handleDragStart} onClick={onLeadClick} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Manager Component ───────────────────────────────────────────────────
export default function ServicesBookingsManager({ siteId, initialLeads, services, emailSettings }) {
  const [leads, setLeads]           = useState(initialLeads);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading]       = useState(false);
  const [viewMode, setViewMode]     = useState("list"); // "list" | "kanban"
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus]   = useState("contacted");
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = useMemo(() => leads.filter(l => {
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.name?.toLowerCase().includes(q)
      || l.email?.toLowerCase().includes(q)
      || l.serviceInterest?.toLowerCase().includes(q)
      || l.notes?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [leads, search, filterStatus]);

  const stats = useMemo(() => {
    const won = leads.filter(l => ["won", "converted", "approved"].includes(l.status));
    const totalValue = won.reduce((sum, l) => {
      const m = l.serviceInterest?.match(/\$(\d+)/);
      return sum + (m ? parseInt(m[1]) : 0);
    }, 0);
    return {
      total: leads.length,
      new: leads.filter(l => l.status === "new").length,
      won: won.length,
      totalValue,
      conversionRate: leads.length > 0 ? Math.round((won.length / leads.length) * 100) : 0,
    };
  }, [leads]);

  const handleUpdate = (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this service booking lead permanently?")) return;
    try {
      const res = await fetch(`/api/dashboard/leads/${id}`, { method: "DELETE", headers: { "x-site-id": siteId } });
      if (!res.ok) throw new Error("Delete failed");
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selected?.id === id) setSelected(null);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) { alert(err.message); }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/leads?siteId=${siteId}`, { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.data?.leads) {
        const SERVICE_PAGES = ["Services Booking Form", "Services Secret Portal", "Services Page"];
        setLeads(data.data.leads.filter(l => SERVICE_PAGES.includes(l.sourcePage)));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Bulk Actions ──────────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(l => n.delete(l.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(l => n.add(l.id)); return n; });
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkUpdate = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      const ids = [...selectedIds];
      // Call the bulk API endpoint
      await fetch("/api/dashboard/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ ids, status: bulkStatus }),
      });

      // Update local state with activity log per lead
      setLeads(prev => prev.map(l => {
        if (!selectedIds.has(l.id)) return l;
        const p = parseNotes(l.notes);
        const newMeta = addActivity(p.meta, `Bulk status update: ${STATUS_CONFIG[l.status]?.label} → ${STATUS_CONFIG[bulkStatus]?.label}`);
        return { ...l, status: bulkStatus, notes: serializeNotes(p.booking, p.notes, newMeta) };
      }));
      setSelectedIds(new Set());
    } catch (err) {
      alert("Bulk update failed: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            Service Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1">All media partnership and service package booking requests</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <List size={12} /> List
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "kanban" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <LayoutGrid size={12} /> Kanban
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setBannerEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f7c85] hover:bg-[#0c6b73] text-white text-xs font-extrabold rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Sparkles size={13} /> Customize PR &amp; Editorial Banner Card
          </button>
          <a
            href={`/api/dashboard/leads/export?siteId=${siteId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={12} /> Export CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.total,                                    icon: FileText,    color: "text-indigo-600" },
          { label: "New / Pending",  value: stats.new,                                      icon: Clock,       color: "text-amber-600"  },
          { label: "Won / Confirmed",value: stats.won,                                      icon: CheckCircle, color: "text-emerald-600"},
          { label: "Pipeline Value", value: `$${stats.totalValue.toLocaleString()}`, sub: `${stats.conversionRate}% win rate`, icon: DollarSign, color: "text-emerald-600" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <Icon size={11} className={color} /> {label}
            </div>
            <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-xs font-bold text-indigo-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-xs text-slate-600 font-semibold">Change status to:</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {bulkLoading ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Apply to {selectedIds.size}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Filters — list view only */}
      {viewMode === "list" && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, package..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
          </select>
          {(search || filterStatus !== "all") && (
            <button onClick={() => { setSearch(""); setFilterStatus("all"); }} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ══════════════ KANBAN VIEW ═════════════════════════════ */}
      {viewMode === "kanban" && (
        <KanbanBoard
          leads={leads}
          siteId={siteId}
          onLeadClick={(lead) => setSelected(lead)}
          onLeadUpdate={handleUpdate}
        />
      )}

      {/* ══════════════ LIST VIEW ════════════════════════════════ */}
      {viewMode === "list" && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">
                {search || filterStatus !== "all" ? "No bookings match your filters." : "No service booking requests yet."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Service booking requests will appear here after clients complete the services form.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Package</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(lead => {
                    const parsedMeta = parseNotes(lead.notes).meta;
                    const activeRem  = (parsedMeta.reminders || []).filter(r => !r.done);
                    const overdueRem = activeRem.filter(r => r.date < TODAY);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelected(lead)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selected?.id === lead.id ? "bg-indigo-50/40" : ""} ${selectedIds.has(lead.id) ? "bg-indigo-50/20" : ""}`}
                      >
                        <td className="px-4 py-3.5" onClick={(e) => { e.stopPropagation(); toggleOne(lead.id); }}>
                          <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleOne(lead.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 text-sm">{lead.name}</div>
                          <div className="text-xs text-slate-500">{lead.email}</div>
                          {lead.phone && <div className="text-xs text-slate-400">{lead.phone}</div>}
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-700 truncate">{lead.serviceInterest || "—"}</span>
                            <PriceBadge interest={lead.serviceInterest} />
                            <PaymentBadge payment={parsedMeta.payment} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{lead.sourcePage || "—"}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={lead.status} />
                            {overdueRem.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-50 text-red-600 border border-red-200">
                                <Bell size={8} /> {overdueRem.length} overdue
                              </span>
                            )}
                            {activeRem.length > 0 && overdueRem.length === 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                <Bell size={8} /> {activeRem.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelected(lead)} title="View Details" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg inline-flex transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => setSelected(lead)} title="Send Email" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex transition-colors">
                            <Mail size={14} />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <LeadDetailPanel
          lead={selected}
          siteId={siteId}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Services Banner Customizer Modal */}
      <ServicesBannerEditorModal
        siteId={siteId}
        isOpen={bannerEditorOpen}
        onClose={() => setBannerEditorOpen(false)}
      />
    </div>
  );
}
