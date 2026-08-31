"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Webhook,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Shield,
} from "lucide-react";

const ALL_EVENTS = [
  { value: "page.created",         label: "Page Created",          group: "Pages" },
  { value: "page.updated",         label: "Page Updated",          group: "Pages" },
  { value: "page.deleted",         label: "Page Deleted",          group: "Pages" },
  { value: "post.created",         label: "Post Created",          group: "Blog" },
  { value: "post.updated",         label: "Post Updated",          group: "Blog" },
  { value: "post.published",       label: "Post Published",        group: "Blog" },
  { value: "post.deleted",         label: "Post Deleted",          group: "Blog" },
  { value: "service.created",      label: "Service Created",       group: "Services" },
  { value: "service.updated",      label: "Service Updated",       group: "Services" },
  { value: "service.deleted",      label: "Service Deleted",       group: "Services" },
  { value: "global_settings.updated", label: "Settings Updated",  group: "Global" },
  { value: "navigation.updated",   label: "Navigation Updated",    group: "Global" },
  { value: "testimonial.created",  label: "Testimonial Created",   group: "Content" },
  { value: "testimonial.updated",  label: "Testimonial Updated",   group: "Content" },
  { value: "testimonial.deleted",  label: "Testimonial Deleted",   group: "Content" },
  { value: "faq.created",          label: "FAQ Created",           group: "Content" },
  { value: "faq.updated",          label: "FAQ Updated",           group: "Content" },
  { value: "faq.deleted",          label: "FAQ Deleted",           group: "Content" },
  { value: "team_member.created",  label: "Team Member Added",     group: "Content" },
  { value: "team_member.updated",  label: "Team Member Updated",   group: "Content" },
  { value: "team_member.deleted",  label: "Team Member Removed",   group: "Content" },
  { value: "legal_page.updated",   label: "Legal Page Updated",    group: "Legal" },
];

const EVENT_GROUPS = [...new Set(ALL_EVENTS.map((e) => e.group))];

export default function WebhookManager({ siteId, initialWebhooks = [] }) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newSecret, setNewSecret] = useState(null); // show once after creation

  // Form state
  const [form, setForm] = useState({ name: "", url: "", events: [] });

  const flash = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const toggleEvent = (eventValue) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(eventValue)
        ? f.events.filter((e) => e !== eventValue)
        : [...f.events, eventValue],
    }));
  };

  const selectGroup = (group) => {
    const groupEvents = ALL_EVENTS.filter((e) => e.group === group).map((e) => e.value);
    const allSelected = groupEvents.every((e) => form.events.includes(e));
    setForm((f) => ({
      ...f,
      events: allSelected
        ? f.events.filter((e) => !groupEvents.includes(e))
        : [...new Set([...f.events, ...groupEvents])],
    }));
  };

  async function createWebhook() {
    if (!form.name.trim() || !form.url.trim() || !form.events.length) {
      flash("Name, URL, and at least one event are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create webhook");
      const { subscription, message: msg } = result.data;
      setWebhooks((w) => [subscription, ...w]);
      setNewSecret(subscription.secret);
      setForm({ name: "", url: "", events: [] });
      setShowForm(false);
      flash("Webhook created successfully! Save the secret below.");
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebhook(id, currentState) {
    try {
      const res = await fetch(`/api/dashboard/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ isActive: !currentState }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setWebhooks((w) =>
        w.map((wh) => (wh.id === id ? result.data.subscription : wh))
      );
      flash(!currentState ? "Webhook enabled" : "Webhook disabled");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteWebhook(id) {
    if (!confirm("Delete this webhook subscription? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/dashboard/webhooks/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setWebhooks((w) => w.filter((wh) => wh.id !== id));
      flash("Webhook removed");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Webhook size={18} className="text-violet-600 shrink-0" />
          <h3 className="text-sm font-bold text-gray-900">Webhook Subscriptions</h3>
          <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-mono">
            {webhooks.length} registered
          </span>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setNewSecret(null); }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
        >
          <Plus size={14} />
          Add Webhook
        </button>
      </div>

      {/* Flash message */}
      {message && (
        <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
          message.type === "error"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Secret reveal (only shown once after creation) */}
      {newSecret && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <Shield size={14} />
            Save this secret now — it will never be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-xs font-mono text-amber-900 break-all">
              {newSecret}
            </code>
            <button
              onClick={async () => {
                const success = await copyToClipboard(newSecret);
                if (success) flash("Secret copied!");
              }}
              className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-800 transition"
            >
              <Copy size={14} />
            </button>
          </div>
          <p className="text-[10px] text-amber-700">
            Use this to verify webhook signatures: verify that <code>x-cms-signature</code> header matches{" "}
            <code>sha256=HMAC_SHA256(secret, rawRequestBody)</code>
          </p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
          <h4 className="text-xs font-bold text-gray-800">New Webhook Subscription</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Next.js ISR Revalidation"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                URL
              </label>
              <input
                type="url"
                placeholder="https://yoursite.com/api/revalidate"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          {/* Event selection */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Events to Subscribe ({form.events.length} selected)
            </label>
            <div className="space-y-3">
              {EVENT_GROUPS.map((group) => {
                const groupEvents = ALL_EVENTS.filter((e) => e.group === group);
                const allSelected = groupEvents.every((e) => form.events.includes(e.value));
                return (
                  <div key={group}>
                    <button
                      type="button"
                      onClick={() => selectGroup(group)}
                      className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 hover:text-violet-600 transition"
                    >
                      {allSelected ? "☑" : "☐"} {group}
                    </button>
                    <div className="flex flex-wrap gap-1.5 ml-2">
                      {groupEvents.map((ev) => (
                        <button
                          key={ev.value}
                          type="button"
                          onClick={() => toggleEvent(ev.value)}
                          className={`text-[10px] px-2 py-1 rounded font-semibold border transition ${
                            form.events.includes(ev.value)
                              ? "bg-violet-100 border-violet-300 text-violet-800"
                              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {ev.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={createWebhook}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? "Creating..." : "Create Webhook"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 space-y-2 bg-gray-50 rounded-xl border border-dashed">
          <Webhook size={28} className="mx-auto text-gray-300" />
          <p className="text-xs font-semibold">No webhook subscriptions yet</p>
          <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
            Add a webhook to automatically notify your frontend when content is published or updated.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`bg-white border rounded-xl p-4 space-y-2 ${
                !wh.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{wh.name}</span>
                    {wh.failCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-red-50 text-red-700 border border-red-200 rounded-full px-1.5 py-0.5 font-bold">
                        <AlertTriangle size={9} />
                        {wh.failCount} failures
                      </span>
                    )}
                    {wh.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-bold">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <a
                      href={wh.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-600 hover:underline font-mono truncate"
                    >
                      {wh.url}
                    </a>
                    <ExternalLink size={9} className="text-gray-400 shrink-0" />
                  </div>
                  {wh.lastError && (
                    <div className="text-[10px] text-red-600 mt-1 truncate">
                      Last error: {wh.lastError}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleWebhook(wh.id, wh.isActive)}
                    title={wh.isActive ? "Disable" : "Enable"}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"
                  >
                    {wh.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => deleteWebhook(wh.id)}
                    title="Delete"
                    className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Events badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {wh.events.map((ev) => (
                  <span
                    key={ev}
                    className="text-[9px] bg-violet-50 text-violet-700 border border-violet-100 rounded px-1.5 py-0.5 font-mono"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integration guide */}
      <details className="bg-gray-50 border rounded-xl text-xs">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-700 hover:text-gray-900 select-none">
          📖 How to use webhooks in your Next.js frontend
        </summary>
        <div className="px-4 pb-4 space-y-3 text-gray-600">
          <p>Create an API route in your frontend to receive webhook events:</p>
          <pre className="bg-white border rounded-lg p-3 overflow-auto text-[10px] font-mono whitespace-pre">{`// app/api/cms-webhook/route.js
import { revalidatePath, revalidateTag } from "next/cache";
import crypto from "crypto";

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("x-cms-signature");
  
  // Verify signature
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.CMS_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
    
  if (sig !== expected) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  // Revalidate based on event type
  if (event.event.startsWith("post.")) revalidatePath("/blog");
  if (event.event.startsWith("page.")) revalidatePath("/", "layout");
  if (event.event.startsWith("service.")) revalidatePath("/services");
  if (event.event === "global_settings.updated") revalidatePath("/", "layout");
  
  return Response.json({ ok: true });
}`}</pre>
          <p className="text-[10px] text-gray-500">
            Register <code>https://yoursite.com/api/cms-webhook</code> as the webhook URL above.
            Set <code>CMS_WEBHOOK_SECRET</code> in your frontend <code>.env</code> to the secret shown at creation.
          </p>
        </div>
      </details>
    </div>
  );
}

