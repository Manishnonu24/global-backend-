"use client";

import { useState } from "react";
import DynamicBlockEditor from "@/components/DynamicBlockEditor";
import {
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Lock,
  Scale,
  Cookie,
  ShieldAlert,
  DollarSign,
  Globe,
  EyeOff,
} from "lucide-react";

const POLICY_TYPES = [
  {
    type: "privacy",
    label: "Privacy Policy",
    icon: Lock,
    desc: "Data protection guidelines and user privacy disclosures.",
  },
  {
    type: "terms",
    label: "Terms of Service",
    icon: Scale,
    desc: "General rules, guidelines, and agreements for site visitors.",
  },
  {
    type: "cookies",
    label: "Cookie Policy",
    icon: Cookie,
    desc: "Tracker disclosures and consent compliance requirements.",
  },
  {
    type: "disclaimer",
    label: "Disclaimer",
    icon: ShieldAlert,
    desc: "Liability limitation statements and legal warranty warnings.",
  },
  {
    type: "refund",
    label: "Refund Policy",
    icon: DollarSign,
    desc: "Billing, transaction cancellations, and return conditions.",
  },
];

export default function LegalEditor({ siteId, initialPages }) {
  const [pages, setPages] = useState(initialPages || []);
  const [activeTab, setActiveTab] = useState("privacy");
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [message, setMessage] = useState(null);

  // Get active page details from local state
  const activePage = pages.find((p) => p.type === activeTab);

  // Form states
  const [title, setTitle] = useState(
    activePage?.title || POLICY_TYPES.find((p) => p.type === activeTab).label,
  );
  const [content, setContent] = useState(activePage?.content || "");
  const [contentJson, setContentJson] = useState(activePage?.contentJson || "");

  // Update form inputs when changing tabs
  const handleTabChange = (type) => {
    setActiveTab(type);
    setMessage(null);
    const page = pages.find((p) => p.type === type);
    setTitle(page?.title || POLICY_TYPES.find((p) => p.type === type).label);
    setContent(page?.content || "");
    setContentJson(page?.contentJson || "");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content || !content.trim()) {
      setMessage({ type: "error", text: "Document content cannot be empty." });
      return;
    }
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/dashboard/legal/${activeTab}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          title,
          content,
          contentJson,
          published: activePage?.published ?? false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save legal page");
      }

      const page = data.data?.legalPage ?? data.legalPage;
      // Update pages array state
      setPages((prev) => {
        const filtered = prev.filter((p) => p.type !== activeTab);
        return [...filtered, page];
      });

      setMessage({ type: "success", text: `${title} saved successfully!` });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    setIsToggling(true);
    setMessage(null);

    const currentPage = pages.find((p) => p.type === activeTab);
    const newPublished = !(currentPage?.published ?? false);

    try {
      const res = await fetch(`/api/dashboard/legal/${activeTab}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          title: currentPage?.title || title,
          content: currentPage?.content || content,
          contentJson: currentPage?.contentJson || contentJson,
          published: newPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update publish status");
      }

      const page = data.data?.legalPage ?? data.legalPage;
      setPages((prev) => {
        const filtered = prev.filter((p) => p.type !== activeTab);
        return [...filtered, page];
      });

      setMessage({
        type: "success",
        text: newPublished
          ? `${title} is now published and accessible on the site.`
          : `${title} has been unpublished and is no longer accessible.`,
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsToggling(false);
    }
  };

  // Helper to check if page type is configured
  const getPageStatus = (type) => {
    const page = pages.find((p) => p.type === type);
    if (!page)
      return {
        label: "Not Configured",
        color: "bg-gray-100 text-gray-500 border-gray-200",
        published: false,
      };
    if (page.published) {
      return {
        label: "Published",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        published: true,
        date: new Date(page.lastUpdated).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    }
    return {
      label: "Draft",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      published: false,
      date: new Date(page.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  };

  // Basic HTML preview markdown formatter wrapper (simple parser for headers and paragraphs)
  const formatPreviewHtml = (rawText) => {
    if (!rawText)
      return "<p class='text-gray-400 italic'>No content written yet.</p>";
    return rawText
      .split("\n\n")
      .map((paragraph) => {
        if (paragraph.startsWith("# ")) {
          return `<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-2 border-b pb-1 font-serif">${paragraph.substring(2)}</h1>`;
        }
        if (paragraph.startsWith("## ")) {
          return `<h2 class="text-xl font-bold text-gray-800 mt-5 mb-2 font-serif">${paragraph.substring(3)}</h2>`;
        }
        if (paragraph.startsWith("### ")) {
          return `<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2 font-serif">${paragraph.substring(4)}</h3>`;
        }
        if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
          const listItems = paragraph
            .split("\n")
            .map(
              (li) => `<li class="ml-5 list-disc mb-1">${li.substring(2)}</li>`,
            )
            .join("");
          return `<ul class="my-3 text-gray-600 leading-relaxed font-sans">${listItems}</ul>`;
        }
        return `<p class="mb-4 text-gray-600 leading-relaxed font-sans">${paragraph.replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
  };

  const activeStatus = getPageStatus(activeTab);
  const isPublished = activeStatus.published;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Sidebar Selector Panel */}
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 px-2">
          Document Types
        </h2>

        <div className="flex flex-col gap-1.5">
          {POLICY_TYPES.map((policy) => {
            const Icon = policy.icon;
            const isActive = activeTab === policy.type;
            const status = getPageStatus(policy.type);

            return (
              <button
                key={policy.type}
                type="button"
                onClick={() => handleTabChange(policy.type)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                  isActive
                    ? "bg-blue-50/80 dark:bg-blue-900/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm"
                    : "bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="font-bold text-xs">{policy.label}</span>
                </div>

                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-normal line-clamp-2">
                  {policy.desc}
                </p>

                <div className="flex items-center justify-between border-t border-dashed border-gray-200 dark:border-gray-700 pt-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${status.color}`}
                  >
                    {status.label}
                  </span>
                  {status.date && (
                    <span className="text-[9px] text-gray-400 flex items-center gap-1 font-mono">
                      <Clock size={10} /> {status.date}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Preview Pane */}
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[620px]">
        {/* Editor Toolbar */}
        <div className="bg-gray-50/60 border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base">
              Editing: {POLICY_TYPES.find((p) => p.type === activeTab).label}
            </h3>
            {/* Live published status badge */}
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${activeStatus.color}`}
            >
              {isPublished ? <Globe size={10} /> : <EyeOff size={10} />}
              {activeStatus.label}
            </span>
            {activeStatus.date && (
              <span className="text-[11px] text-gray-400 font-mono">
                (Last Saved: {activeStatus.date})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Publish / Unpublish Toggle Button */}
            {pages.find((p) => p.type === activeTab) && (
              <button
                type="button"
                onClick={handleTogglePublish}
                disabled={isToggling}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 ${
                  isPublished
                    ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {isPublished ? <EyeOff size={14} /> : <Globe size={14} />}
                {isToggling
                  ? "Updating..."
                  : isPublished
                    ? "Unpublish"
                    : "Publish"}
              </button>
            )}

            {/* Save Button */}
            <button
              type="submit"
              onClick={handleSave}
              disabled={isSaving}
              className="admin-btn admin-btn-primary disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {message && (
          <div
            className={`p-4 border-b flex items-start gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2
                size={16}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Content Panel */}
        <div className="flex-1 flex flex-col">
          <form
            onSubmit={handleSave}
            className="flex-1 flex flex-col p-6 space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm font-semibold text-gray-800 placeholder-gray-400"
                placeholder="e.g. Terms & Conditions"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Document Body (Block Editor)
                </label>
              </div>
              <div className="z-10 relative">
                <DynamicBlockEditor
                  key={activeTab}
                  initialContent={activePage?.contentJson}
                  fallbackHtml={
                    activePage?.contentJson
                      ? undefined
                      : activePage?.content
                        ? activePage.content.startsWith("<")
                          ? activePage.content
                          : formatPreviewHtml(activePage.content)
                        : undefined
                  }
                  onChangeHtml={(html) => setContent(html)}
                  onChangeJson={(json) => setContentJson(json)}
                />
              </div>
            </div>

            {/* Unpublished warning hint */}
            {!isPublished && pages.find((p) => p.type === activeTab) && (
              <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <EyeOff size={13} className="shrink-0" />
                This page is currently a <strong>Draft</strong>. Click{" "}
                <strong>Publish</strong> to make it accessible on the site.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

