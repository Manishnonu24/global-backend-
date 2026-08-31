"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Code, CheckSquare, Square, AlertTriangle, Eye, Zap, Check, X } from "lucide-react";
import { EMAIL_TRIGGERS } from "@/lib/emailTriggers";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    triggerKey: "",
    subject: "",
    htmlContent: "",
    isActive: true,
  });
  const [siteId, setSiteId] = useState("");
  const [saveError, setSaveError] = useState(null);

  // Editor view states
  const [formTab, setFormTab] = useState("editor"); // "editor" | "preview"
  const [previewTemplate, setPreviewTemplate] = useState(null); // Template model to preview

  // Debounced html preview state
  const [debouncedHtml, setDebouncedHtml] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    setIsPreviewLoading(true);
    const timer = setTimeout(() => {
      setDebouncedHtml(newTemplate.htmlContent);
      setIsPreviewLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [newTemplate.htmlContent]);

  // Bulk select state
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/templates", { headers: { "x-site-id": siteId } });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data?.templates || []);
        setSelected(new Set());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setTimeout(() => setSiteId(id), 0);
  }, []);

  useEffect(() => {
    if (siteId) fetchTemplates();
  }, [siteId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);
    if (!siteId) return setSaveError("Site ID not loaded yet. Please wait.");
    try {
      const url = editingId ? `/api/crm/templates/${editingId}` : "/api/crm/templates";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(newTemplate)
      });
      const data = await res.json();
      if (data.success) {
        setNewTemplate({ name: "", triggerKey: "", subject: "", htmlContent: "", isActive: true });
        setEditingId(null);
        setShowAddForm(false);
        fetchTemplates();
      } else {
        setSaveError(data.error || "Failed to save template.");
      }
    } catch (err) {
      setSaveError("Network error: " + err.message);
    }
  };

  const handleToggleActive = async (tpl) => {
    try {
      await fetch(`/api/crm/templates/${tpl.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ isActive: !tpl.isActive }),
      });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/crm/templates/${id}`, { method: "DELETE", headers: { "x-site-id": siteId } });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (tpl) => {
    setEditingId(tpl.id);
    setNewTemplate({
      name: tpl.name,
      triggerKey: tpl.triggerKey || "",
      subject: tpl.subject || "",
      htmlContent: tpl.htmlContent || "",
      isActive: tpl.isActive !== false,
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Bulk select helpers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === templates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(templates.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected template(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selected].map(id =>
          fetch(`/api/crm/templates/${id}`, { method: "DELETE", headers: { "x-site-id": siteId } })
        )
      );
      await fetchTemplates();
    } catch (err) {
      console.error(err);
    }
    setBulkDeleting(false);
  };

  const handleApplyPreset = (presetName) => {
    let presetHtml = "";
    if (presetName === "newsletter") {
      presetHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
    .header { background: #4f46e5; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; }
    .footer { font-size: 11px; text-align: center; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Weekly Insights</h2></div>
    <div class="content">
      <p>Hello Subscriber,</p>
      <p>Welcome to our weekly newsletter!</p>
      <p>Best regards,<br/>The Editorial Team</p>
    </div>
    <div class="footer">You are receiving this because you subscribed. <a href="#">Unsubscribe</a></div>
  </div>
</body>
</html>`;
    } else if (presetName === "promotion") {
      presetHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 20px; }
    .card { background: #fff; max-width: 500px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; }
    .banner { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; text-align: center; padding: 40px 20px; }
    .body { padding: 30px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 9999px; font-weight: bold; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner"><h1 style="margin:0;font-size:28px;">Special Promotion!</h1></div>
    <div class="body">
      <p>Get exclusive access for 50% off this month only.</p>
      <a href="#" class="btn">Get Discount Now</a>
    </div>
  </div>
</body>
</html>`;
    } else if (presetName === "otp") {
      presetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f7c85, #0a565c); padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">{siteName}</h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13px;">Security & Account Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px; color: #334155;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Verify Your Account</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>{name}</strong>,<br>
                Thank you for joining <strong>{siteName}</strong>. Please use the 6-digit verification code below to verify your email address and activate your account:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #0f7c85; padding: 18px 42px; border-radius: 14px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0f7c85; display: block;">{otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; text-align: center; line-height: 1.5;">
                ⏱️ This verification code will expire in <strong>10 minutes</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                If you did not initiate this account setup, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © {siteName} • All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      setNewTemplate({
        ...newTemplate,
        name: newTemplate.name || "User OTP Account Verification",
        triggerKey: "user_verification",
        subject: newTemplate.subject || "Your Account Verification Code: {otpCode}",
        htmlContent: presetHtml,
      });
      return;
    }
    setNewTemplate({ ...newTemplate, htmlContent: presetHtml });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Email Layout Templates</h1>
          <p className="text-slate-500 text-xs mt-1">Store pre-built HTML newsletter structures to apply instantly to campaigns</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setNewTemplate({ name: "", subject: "", htmlContent: "" }); setShowAddForm(!showAddForm); }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSave} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{editingId ? "Edit Template" : "Compose Layout Template"}</h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newTemplate.isActive}
                onChange={(e) => setNewTemplate({ ...newTemplate, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Active / Enable Auto-Sync
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Template Name"
              required
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
            <select
              value={newTemplate.triggerKey}
              onChange={(e) => setNewTemplate({ ...newTemplate, triggerKey: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full font-semibold text-indigo-600 dark:text-indigo-400"
            >
              <option value="">-- Select Auto-Sync Trigger Event --</option>
              {Object.entries(EMAIL_TRIGGERS).map(([key, config]) => (
                <option key={key} value={key}>
                  ⚡ {config.label} ({key})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Default Subject Line (optional)"
              value={newTemplate.subject}
              onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
          </div>

          {/* Trigger Info & Dynamic Variable Chips */}
          {newTemplate.triggerKey && EMAIL_TRIGGERS[newTemplate.triggerKey] && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-lg space-y-1.5">
              <p className="text-[11px] text-indigo-900 dark:text-indigo-200 font-medium flex items-center gap-1.5">
                <Zap size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                {EMAIL_TRIGGERS[newTemplate.triggerKey].description}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Available Variables (click to insert):</span>
                {EMAIL_TRIGGERS[newTemplate.triggerKey].variables.map((varName) => (
                  <button
                    key={varName}
                    type="button"
                    onClick={() => setNewTemplate((prev) => ({ ...prev, htmlContent: prev.htmlContent + " " + varName }))}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold rounded-md hover:bg-indigo-100 transition cursor-pointer"
                    title={`Click to add ${varName} to HTML`}
                  >
                    + {varName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
            <button type="button" onClick={() => handleApplyPreset("otp")} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold rounded text-[10px] hover:bg-indigo-100 transition cursor-pointer">⚡ OTP Verification Code</button>
            <button type="button" onClick={() => handleApplyPreset("newsletter")} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] hover:bg-slate-200 cursor-pointer">Weekly Newsletter</button>
            <button type="button" onClick={() => handleApplyPreset("promotion")} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] hover:bg-slate-200 cursor-pointer">Promo Event Card</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Template HTML Markup *</label>
              <textarea placeholder="Template HTML Markup" rows={18} required value={newTemplate.htmlContent}
                onChange={(e) => setNewTemplate({ ...newTemplate, htmlContent: e.target.value })}
                className="p-3 border rounded-xl text-xs dark:bg-slate-900 w-full font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-105" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Live Visual Preview</label>
                {isPreviewLoading && <span className="text-[10px] text-indigo-500 font-bold animate-pulse">Syncing preview...</span>}
              </div>
              <div className="border rounded-xl bg-white dark:bg-white overflow-hidden shadow-xs h-105 relative">
                <iframe
                  srcDoc={debouncedHtml || "<div style='font-family: sans-serif; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;'>Write some HTML markup or apply a preset template above to see the live preview.</div>"}
                  title="Template Preview"
                  className={`w-full h-full transition-opacity duration-200 ${isPreviewLoading ? "opacity-60" : "opacity-100"}`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition">Save Template</button>
            <button type="button" onClick={() => { setShowAddForm(false); setSaveError(null); }} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded text-xs font-semibold">Cancel</button>
            {saveError && <p className="text-red-500 text-xs font-semibold">{saveError}</p>}
          </div>
        </form>
      )}

      {/* Bulk Actions Bar — shown when templates exist */}
      {!loading && templates.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-semibold transition"
          >
            {selected.size === templates.length
              ? <CheckSquare size={14} className="text-indigo-600" />
              : <Square size={14} />}
            {selected.size === templates.length ? "Deselect All" : "Select All"}
          </button>
          <span className="text-xs text-slate-400">{selected.size > 0 ? `${selected.size} selected` : `${templates.length} total`}</span>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-60"
            >
              <Trash2 size={12} />
              {bulkDeleting ? "Deleting..." : `Delete ${selected.size} Selected`}
            </button>
          )}
          {templates.length > 1 && selected.size === 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} /> Select templates to bulk-delete duplicates
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 col-span-full">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 col-span-full">No layout templates configured. Click &quot;New Template&quot; to save one.</div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => toggleSelect(tpl.id)}
              className={`p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl flex flex-col justify-between hover:shadow-sm transition cursor-pointer ${selected.has(tpl.id) ? "ring-2 ring-indigo-500 border-indigo-400" : ""}`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selected.has(tpl.id)
                      ? <CheckSquare size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                      : <Square size={13} className="text-slate-300 shrink-0 mt-0.5" />}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{tpl.name}</h3>
                      {tpl.triggerKey && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Zap size={10} /> {EMAIL_TRIGGERS[tpl.triggerKey]?.label || tpl.triggerKey}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(tpl); }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition cursor-pointer ${
                      tpl.isActive !== false
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                    title="Click to toggle active status"
                  >
                    {tpl.isActive !== false ? "Active" : "Inactive"}
                  </button>
                </div>
                {tpl.subject && <p className="text-[10px] text-slate-400 mb-2">Subject: &quot;{tpl.subject}&quot;</p>}
                <div className="p-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded text-[9px] text-slate-400 font-mono line-clamp-4 h-16 overflow-hidden">
                  {tpl.htmlContent}
                </div>
              </div>
              <div className="flex gap-1 justify-end items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewTemplate(tpl); }}
                  className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition"
                  title="Visual Preview"
                >
                  <Eye size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                  className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition"
                  title="Edit"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                  className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Visual Preview Modal Dialog */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Preview: {previewTemplate.name}</h3>
                {previewTemplate.subject && (
                  <p className="text-[10px] text-slate-400 mt-0.5">Subject: &quot;{previewTemplate.subject}&quot;</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-900 flex-1 flex flex-col min-h-0">
              <iframe
                srcDoc={previewTemplate.htmlContent || "<p class='p-4 text-xs text-center text-slate-400'>This template has no layout HTML content.</p>"}
                title="Visual Preview"
                className="w-full flex-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white min-h-100"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>

            <div className="px-5 py-3.5 border-t border-slate-150 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-650 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
