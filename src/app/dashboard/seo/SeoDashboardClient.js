"use client";

import { useState, useCallback } from "react";
import {
  Search,
  ExternalLink,
  Edit3,
  X,
  Check,
  AlertCircle,
  Globe,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  BookOpen,
  Briefcase,
  HelpCircle,
  Utensils,
  Shield,
  Layers,
} from "lucide-react";

function getSeoStatus(item) {
  let score = 0;
  if (item.seoTitle) score++;
  if (item.seoDescription) score++;
  if (item.ogImage) score++;
  if (item.canonicalUrl) score++;
  if (score === 0) return { label: "Not Set", color: "text-gray-400 dark:text-slate-400", bg: "bg-gray-100 dark:bg-slate-700" };
  if (score <= 2) return { label: "Partial", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" };
  return { label: "Complete", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" };
}

function SeoStatusBadge({ item }) {
  const status = getSeoStatus(item);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.color} ${status.bg}`}>
      {status.label}
    </span>
  );
}

function getItemPublicUrl(tab, item, domain) {
  const cleanDomain = (domain || "").replace(/\/+$/, "");
  let path = "/";
  switch (tab) {
    case "pages":
      path = item.slug ? (item.slug.startsWith("/") ? item.slug : `/${item.slug}`) : "/";
      break;
    case "posts":
      path = `/blogs/${item.slug}`;
      break;
    case "services":
      path = `/services/${item.slug}`;
      break;
    case "magazines":
      path = `/magazine/${item.slug}`;
      break;
    case "quizzes":
      path = `/quizzes/${item.slug}`;
      break;
    case "recipes":
      path = `/recipes/${item.id}`;
      break;
    case "legalPages":
      path = `/legal/${item.type}`;
      break;
    default:
      path = "/";
  }
  return { path, fullUrl: `${cleanDomain}${path}` };
}

function getItemOwnerType(tab) {
  switch (tab) {
    case "pages": return "page";
    case "posts": return "post";
    case "services": return "service";
    case "magazines": return "magazine";
    case "quizzes": return "quizType";
    case "recipes": return "recipe";
    case "legalPages": return "legalPage";
    default: return "page";
  }
}

export default function SeoDashboardClient({
  siteId,
  domain,
  initialPages = [],
  initialPosts = [],
  initialServices = [],
  initialMagazines = [],
  initialQuizTypes = [],
  initialRecipes = [],
  initialLegalPages = [],
}) {
  const [activeTab, setActiveTab] = useState("pages");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Form state
  const [seoTitle, setSeoTitle] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [jsonLd, setJsonLd] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Local entities state
  const [pages, setPages] = useState(initialPages);
  const [posts, setPosts] = useState(initialPosts);
  const [services, setServices] = useState(initialServices);
  const [magazines, setMagazines] = useState(initialMagazines);
  const [quizTypes, setQuizTypes] = useState(initialQuizTypes);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [legalPages, setLegalPages] = useState(initialLegalPages);

  // Technical Review State
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResults, setReviewResults] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  const runTechnicalReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/dashboard/seo/review", {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (res.ok) {
        setReviewResults(data.data || data);
      } else {
        throw new Error(data.error || "Failed to execute technical auditor scan");
      }
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const getActiveItems = () => {
    switch (activeTab) {
      case "pages": return pages;
      case "posts": return posts;
      case "services": return services;
      case "magazines": return magazines;
      case "quizzes": return quizTypes;
      case "recipes": return recipes;
      case "legalPages": return legalPages;
      default: return pages;
    }
  };

  const items = getActiveItems();
  const filtered = items.filter((item) => {
    const name = item.title || item.type || "";
    const slug = item.slug || item.id || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
  });

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setSeoTitle(item.seoTitle || "");
    setSeoKeywords(item.seoKeywords || "");
    setSeoDescription(item.seoDescription || "");
    setCanonicalUrl(item.canonicalUrl || "");
    setOgImage(item.ogImage || "");
    setJsonLd(item.jsonLd ? JSON.stringify(item.jsonLd, null, 2) : "");
    setError(null);
    setSuccess(null);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedItem(null);
  };

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    let parsedJsonLd = null;
    if (jsonLd.trim()) {
      try {
        parsedJsonLd = JSON.parse(jsonLd);
      } catch (err) {
        setError("Invalid JSON-LD format. Please check JSON syntax.");
        setIsSubmitting(false);
        return;
      }
    }

    const ownerType = getItemOwnerType(activeTab);
    const payload = {
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      canonicalUrl: canonicalUrl || null,
      ogImage: ogImage || null,
      jsonLd: parsedJsonLd,
    };

    if (ownerType === "page") {
      payload.seoKeywords = seoKeywords || null;
    }

    try {
      const res = await fetch(`/api/dashboard/seo/entity/${ownerType}/${selectedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save SEO data");
      }

      const result = await res.json();
      const updatedEntity = result.data?.entity || result.entity;

      const updater = (prev) =>
        prev.map((p) => (p.id === selectedItem.id ? { ...p, ...updatedEntity } : p));

      switch (activeTab) {
        case "pages": setPages(updater); break;
        case "posts": setPosts(updater); break;
        case "services": setServices(updater); break;
        case "magazines": setMagazines(updater); break;
        case "quizzes": setQuizTypes(updater); break;
        case "recipes": setRecipes(updater); break;
        case "legalPages": setLegalPages(updater); break;
      }

      setSelectedItem((prev) => ({ ...prev, ...updatedEntity }));
      setSuccess("SEO data saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, activeTab, seoTitle, seoKeywords, seoDescription, canonicalUrl, ogImage, jsonLd, siteId]);

  const jsonPreview = (item) => {
    const title = seoTitle || item.seoTitle || item.title || "Page Title";
    const desc = seoDescription || item.seoDescription || "No description set.";
    const { fullUrl } = getItemPublicUrl(activeTab, item, domain);
    return { title, desc, image: ogImage || item.ogImage || "", url: canonicalUrl || item.canonicalUrl || fullUrl };
  };

  const tabs = [
    { id: "pages", label: "Pages", count: pages.length, icon: Layers },
    { id: "posts", label: "Blog Posts", count: posts.length, icon: FileText },
    { id: "services", label: "Services", count: services.length, icon: Briefcase },
    { id: "magazines", label: "Magazines", count: magazines.length, icon: BookOpen },
    { id: "quizzes", label: "Quizzes", count: quizTypes.length, icon: HelpCircle },
    { id: "recipes", label: "Recipes", count: recipes.length, icon: Utensils },
    { id: "legalPages", label: "Legal Pages", count: legalPages.length, icon: Shield },
    { id: "auditor", label: "Technical Review", count: null, icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab !== "auditor" && (
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter by title or URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        )}
      </div>

      {/* Main Content View */}
      {activeTab === "auditor" ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe size={18} className="text-indigo-600" />
                Technical SEO Audit &amp; Indexability Scan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scan public metadata, robots.txt directives, and canonical tags across your site.
              </p>
            </div>
            <button
              onClick={runTechnicalReview}
              disabled={reviewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={reviewLoading ? "animate-spin" : ""} />
              {reviewLoading ? "Scanning Site..." : "Run Audit Scan"}
            </button>
          </div>

          {reviewError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              {reviewError}
            </div>
          )}

          {reviewResults ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Scanned Items</span>
                  <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{reviewResults.totalScanned || filtered.length}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Complete Metadata</span>
                  <span className="text-xl font-extrabold text-green-600">{reviewResults.completeCount || 0}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Warnings / Missing</span>
                  <span className="text-xl font-extrabold text-amber-600">{reviewResults.missingCount || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Click &quot;Run Audit Scan&quot; to perform an automated indexability inspection.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Title / Record Name</th>
                  <th className="px-4 py-3">Public Route Path</th>
                  <th className="px-4 py-3">SEO Title</th>
                  <th className="px-4 py-3">SEO Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No indexable items found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const { path, fullUrl } = getItemPublicUrl(activeTab, item, domain);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                          {item.title || item.type || "Untitled Record"}
                          {item.pageType === "CODE_TEMPLATE" && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase whitespace-nowrap">
                              Code Template
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {path}
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate text-slate-700 dark:text-slate-300">
                          {item.seoTitle || <span className="text-slate-300 dark:text-slate-600 italic">Fallback to default</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <SeoStatusBadge item={item} />
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 p-1.5 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded text-xs font-semibold transition-colors"
                          >
                            <Edit3 size={13} />
                            Edit SEO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEO Edit Modal */}
      {isEditorOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <Edit3 size={16} className="text-indigo-600" />
                  Edit SEO Metadata
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {getItemPublicUrl(activeTab, selectedItem, domain).path}
                </p>
              </div>
              <button
                onClick={handleEditorClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 text-green-700 rounded-lg">
                  {success}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Optimized search engine title"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none"
                />
              </div>

              {activeTab === "pages" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                    Meta Keywords / Tags
                  </label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="e.g. health, wellness, nutrition"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Summary snippet for search results..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                    Canonical URL
                  </label>
                  <input
                    type="text"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://ahealthplace.com/..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                    Open Graph (OG) Image URL
                  </label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://ahealthplace.com/og-image.jpg"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                  JSON-LD Structured Data Schema
                </label>
                <textarea
                  value={jsonLd}
                  onChange={(e) => setJsonLd(e.target.value)}
                  placeholder='{ "@context": "https://schema.org", "@type": "Article", ... }'
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none font-mono h-28 resize-none"
                />
              </div>

              {/* SERP Search Preview */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">
                  Google Search SERP Preview
                </span>
                {(() => {
                  const preview = jsonPreview(selectedItem);
                  return (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-3">
                    {preview.image && (
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <img
                          src={preview.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-slate-500 font-mono truncate block">{preview.url}</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline block truncate mt-0.5">{preview.title}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{preview.desc}</span>
                    </div>
                  </div>
                </div>
                  );
                })()}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleEditorClose}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSubmitting ? "Saving..." : "Save SEO Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
