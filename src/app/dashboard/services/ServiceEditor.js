"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  HelpCircle,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function ServiceEditor({ siteId, service }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    ctaButtonText: "",
    ctaButtonLink: "",
    sortOrder: 0,
    status: "ACTIVE",
    visible: true,
    featuredImageId: null,
    visibility: "PUBLIC",
    slug: "",
  });

  const [accessToken, setAccessToken] = useState(null);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [showVisibilityWarning, setShowVisibilityWarning] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState(null);

  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Media Picker states
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // FAQs state (stored as JSON array on the Service model)
  const [faqs, setFaqs] = useState([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqError, setFaqError] = useState(null);

  // Includes state — bullet list of features shown on the service card
  const [includes, setIncludes] = useState([]);
  const [newInclude, setNewInclude] = useState("");
  const [editingIncludeIndex, setEditingIncludeIndex] = useState(null);
  const [editingIncludeText, setEditingIncludeText] = useState("");

  const isEditMode = !!service;

  // Load service data
  useEffect(() => {
    if (isEditMode) {
      setFormData({
        title: service.title || "",
        description: service.description || "",
        price: service.price || "",
        ctaButtonText: service.ctaButtonText || "",
        ctaButtonLink: service.ctaButtonLink || "",
        sortOrder: service.sortOrder || 0,
        status: service.status || "DRAFT",
        visible: service.visible !== false,
        featuredImageId: service.featuredImageId || null,
        visibility: service.visibility || "PUBLIC",
        slug: service.slug || "",
      });

      setAccessToken(service.accessToken || null);

      if (service.featuredImage) {
        setFeaturedImageUrl(
          service.featuredImage.secureUrl || service.featuredImage.url || "",
        );
      }

      let parsedFaqs = [];
      let parsedIncludes = [];
      if (service.faqs) {
        try {
          const parsed = typeof service.faqs === "string" ? JSON.parse(service.faqs) : service.faqs;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            parsedFaqs = parsed.faqs || [];
            parsedIncludes = parsed.includes || [];
          } else if (Array.isArray(parsed)) {
            parsedFaqs = parsed;
          }
        } catch (e) {
          console.error("Failed to parse faqs:", e);
        }
      }
      setFaqs(parsedFaqs);

      if (service.includes && Array.isArray(service.includes)) {
        setIncludes(service.includes);
      } else if (parsedIncludes.length > 0) {
        setIncludes(parsedIncludes);
      }
    }
  }, [service, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "visibility" && isEditMode && value !== service.visibility) {
      setPendingVisibility(value);
      setShowVisibilityWarning(true);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseInt(value, 10) || 0
            : value,
    }));
  };

  const confirmVisibilityChange = () => {
    setFormData((prev) => ({ ...prev, visibility: pendingVisibility }));
    setShowVisibilityWarning(false);
    setPendingVisibility(null);
  };

  const cancelVisibilityChange = () => {
    setShowVisibilityWarning(false);
    setPendingVisibility(null);
  };

  const regenerateToken = async () => {
    if (!confirm("Are you sure? The old private link will immediately stop working.")) return;
    setIsRegeneratingToken(true);
    try {
      const res = await fetch(`/api/dashboard/services/${service.id}/regenerate-token`, {
        method: "POST",
        headers: { "x-site-id": siteId },
      });
      if (!res.ok) throw new Error("Failed to regenerate token");
      const data = await res.json();
      setAccessToken(data.data.service.accessToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Submit main service data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const serviceData = { ...formData, siteId, faqs, includes };

    const url = isEditMode
      ? `/api/dashboard/services/${service.id}`
      : "/api/dashboard/services";

    const method = isEditMode ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(serviceData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save service");
      }

      router.push("/dashboard/services");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Media picker helpers
  const openMediaPicker = () => setShowMediaPicker(true);

  const attachImage = (media) => {
    setFormData((prev) => ({ ...prev, featuredImageId: media.id }));
    setFeaturedImageUrl(media.secureUrl || media.url);
    setShowMediaPicker(false);
  };

  // FAQ helpers (inline JSON array editing)
  const openAddFaq = () => {
    setEditingFaqIndex(null);
    setFaqQuestion("");
    setFaqAnswer("");
    setFaqError(null);
    setShowFaqModal(true);
  };

  const openEditFaq = (index) => {
    const faq = faqs[index];
    setEditingFaqIndex(index);
    setFaqQuestion(faq.question || faq.q || "");
    setFaqAnswer(faq.answer || faq.a || "");
    setFaqError(null);
    setShowFaqModal(true);
  };

  const handleSaveFaq = (e) => {
    e.preventDefault();
    setFaqError(null);

    if (!faqQuestion.trim()) {
      setFaqError("Question is required.");
      return;
    }
    if (!faqAnswer.trim()) {
      setFaqError("Answer is required.");
      return;
    }

    const newFaq = { question: faqQuestion.trim(), answer: faqAnswer.trim() };

    if (editingFaqIndex !== null) {
      setFaqs((prev) =>
        prev.map((f, i) => (i === editingFaqIndex ? newFaq : f)),
      );
    } else {
      setFaqs((prev) => [...prev, newFaq]);
    }

    setShowFaqModal(false);
    setEditingFaqIndex(null);
    setFaqQuestion("");
    setFaqAnswer("");
  };

  const handleDeleteFaq = (index) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold shadow-xs animate-fade-in">
          <AlertCircle className="shrink-0 text-rose-500" size={16} />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        {/* Left Core Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Attributes Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase mb-4 pb-2 border-b border-slate-100">
                Service Description
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Service Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Premium Consulting Pack"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Detailed Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter detailed description of what is included in this service..."
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 resize-none"
                />
              </div>
            </div>
          </div>

          {/* CTA Integration Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase mb-1">
                Call to Action Setup
              </h2>
              <p className="text-[10px] text-slate-400">
                Configure CTA redirection buttons linked directly to this
                service card.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ctaButtonText"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  CTA Button Label
                </label>
                <input
                  type="text"
                  name="ctaButtonText"
                  id="ctaButtonText"
                  value={formData.ctaButtonText}
                  onChange={handleChange}
                  placeholder="e.g., Get Started"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>

              <div>
                <label
                  htmlFor="ctaButtonLink"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  CTA Button Path/Link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="ctaButtonLink"
                    id="ctaButtonLink"
                    value={formData.ctaButtonLink}
                    onChange={handleChange}
                    placeholder="e.g., /contact"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-3.5 pr-10 py-2.5 text-xs font-mono text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <ExternalLink size={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  What&apos;s Included
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Bullet points shown on the public service card.
                </p>
              </div>
            </div>

            {/* Add new include */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newInclude}
                onChange={(e) => setNewInclude(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = newInclude.trim();
                    if (val) { setIncludes(prev => [...prev, val]); setNewInclude(''); }
                  }
                }}
                placeholder="e.g., Full-page magazine placement"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => {
                  const val = newInclude.trim();
                  if (val) { setIncludes(prev => [...prev, val]); setNewInclude(''); }
                }}
                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition w-full sm:w-auto shrink-0"
              >
                <Plus size={13} />
                Add
              </button>
            </div>

            {/* Includes list */}
            {includes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                <CheckCircle className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-xs font-bold text-slate-500">No feature bullets added yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Type a bullet point above and press Add or Enter.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {includes.map((item, index) => (
                  <div key={index} className="group flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white hover:shadow-xs transition">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                      <CheckCircle size={12} />
                    </span>
                    {editingIncludeIndex === index ? (
                      <input
                        type="text"
                        value={editingIncludeText}
                        onChange={(e) => setEditingIncludeText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); setIncludes(prev => prev.map((it, i) => i === index ? editingIncludeText.trim() || it : it)); setEditingIncludeIndex(null); }
                          if (e.key === 'Escape') { setEditingIncludeIndex(null); }
                        }}
                        onBlur={() => { setIncludes(prev => prev.map((it, i) => i === index ? editingIncludeText.trim() || it : it)); setEditingIncludeIndex(null); }}
                        autoFocus
                        className="flex-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                      />
                    ) : (
                      <span className="flex-1 text-xs font-medium text-slate-700">{item}</span>
                    )}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" onClick={() => { setEditingIncludeIndex(index); setEditingIncludeText(item); }} className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition">
                        <Edit size={11} />
                      </button>
                      <button type="button" onClick={() => setIncludes(prev => prev.filter((_, i) => i !== index))} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAQs Panel - inline JSON array editing */}
          {isEditMode && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle size={18} className="text-indigo-600" />
                    FAQs
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Frequently asked questions stored as JSON on this service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddFaq}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition duration-200 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  Add FAQ
                </button>
              </div>

              {faqs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                  <HelpCircle className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-600">
                    No FAQs for this service yet.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Click the Add FAQ button above to create one.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="group border border-slate-100 hover:border-slate-200 rounded-2xl p-5 bg-slate-50/20 hover:bg-white hover:shadow-xs transition duration-200 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {faq.question || faq.q}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                            {faq.answer || faq.a}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 self-end md:self-start opacity-90 md:opacity-0 group-hover:opacity-100 transition duration-200">
                        <button
                          type="button"
                          onClick={() => openEditFaq(index)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold shadow-xs transition"
                        >
                          <Edit size={10} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(index)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold shadow-xs transition"
                        >
                          <Trash2 size={10} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Settings Sidebar */}
        <div className="space-y-6">
          {/* Settings Console Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase mb-4 pb-2 border-b border-slate-100">
                Publishing Console
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Publish Status
                </label>
                <div className="relative">
                  <select
                    name="status"
                    id="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active (Published)</option>
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Visibility Toggle */}
              <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">
                    Visible on Site
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Show this service on the public site
                  </span>
                </div>
                <input
                  type="checkbox"
                  name="visible"
                  checked={formData.visible}
                  onChange={handleChange}
                  className="rounded text-indigo-600 h-4.5 w-4.5 border-slate-300 focus:ring-indigo-500/20"
                />
              </label>

              {/* Service Access Type (Visibility) */}
              <div className="space-y-3 pt-3 border-t border-slate-100 mt-2">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access Type</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition ${formData.visibility === 'PUBLIC' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="visibility"
                          value="PUBLIC"
                          checked={formData.visibility === 'PUBLIC'}
                          onChange={handleChange}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-800">Public (Indexable & Searchable)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 pl-6">Available to anyone, indexed by Google, appears in sitemap.</p>
                    </label>

                    <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition ${formData.visibility === 'PRIVATE' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="visibility"
                          value="PRIVATE"
                          checked={formData.visibility === 'PRIVATE'}
                          onChange={handleChange}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-800">Private (Token-Only Access)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 pl-6">Accessible only via secure link, hidden from search & SEO.</p>
                    </label>
                  </div>
                </div>

                {formData.visibility === 'PUBLIC' ? (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      URL Slug
                    </label>
                    <div className="flex items-center">
                      <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-2 py-2.5 whitespace-nowrap">
                        /services/
                      </span>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        placeholder="auto-generated-if-empty"
                        className="w-full rounded-r-xl border border-slate-200 bg-slate-50/30 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Secure Access Link
                    </label>
                    {accessToken ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/services/private/${accessToken}`}
                            className="w-full rounded-l-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-mono text-slate-600 outline-none"
                            onClick={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const success = await copyToClipboard(`${window.location.origin}/services/private/${accessToken}`);
                              if (success) {
                                alert("Link copied!");
                              }
                            }}
                            className="shrink-0 bg-indigo-600 text-white px-3 py-2.5 text-[10px] font-bold rounded-r-xl hover:bg-indigo-700 transition"
                          >
                            Copy
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={regenerateToken}
                          disabled={isRegeneratingToken}
                          className="w-full text-center text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg py-1.5 transition disabled:opacity-50"
                        >
                          {isRegeneratingToken ? "Regenerating..." : "Regenerate Link (Revokes old link)"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        A secure token link will be generated after you save this service.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Pricing Label
                </label>
                <input
                  type="text"
                  name="price"
                  id="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g., $499 or Call for Quote"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>

              <div>
                <label
                  htmlFor="sortOrder"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Order Priority Weight
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  id="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Featured Image upload preview card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase mb-1">
                Featured Cover Image
              </h2>
              <p className="text-[10px] text-slate-400">
                Visual presentation card cover image.
              </p>
            </div>

            <div className="space-y-4">
              {featuredImageUrl ? (
                <div className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
                  <img
                    src={featuredImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={openMediaPicker}
                      className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 rounded-lg text-[10px] font-bold shadow-sm transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImageUrl("");
                        setFormData((prev) => ({
                          ...prev,
                          featuredImageId: null,
                        }));
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-[10px] font-bold shadow-sm transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openMediaPicker}
                  className="w-full aspect-video border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/5 rounded-xl flex flex-col items-center justify-center gap-2 text-center p-4 transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-3 bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-400 rounded-full transition">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Select Cover Image
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      JPEG, PNG or WebP up to 5MB
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Floating action bar styling for form */}
        <div className="lg:col-span-3 flex justify-end items-center gap-3 pt-4 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/services")}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 active:bg-slate-100 transition-all duration-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "var(--admin-accent, #0f7c85)" }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save size={14} />
                {isEditMode ? "Save Changes" : "Create Service"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          title="Select Featured Image"
          filter="images"
          onSelect={attachImage}
          onClose={() => setShowMediaPicker(false)}
          siteId={siteId}
        />
      )}

      {/* Visibility Warning Modal */}
      {showVisibilityWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={cancelVisibilityChange} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 border border-slate-100 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-amber-600">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Change Visibility?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {pendingVisibility === 'PRIVATE' 
                ? "Switching to Private will immediately break the public URL for this service. Anyone with the old link will see a 404 Not Found. A new private link will be generated."
                : "Switching to Public will immediately invalidate the current private secure token. A new public slug will be created and this page will be indexed by search engines."}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancelVisibilityChange} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
                Cancel
              </button>
              <button type="button" onClick={confirmVisibilityChange} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow-md transition">
                Yes, Change It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Edit/Create Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowFaqModal(false)}
          />
          <form
            onSubmit={handleSaveFaq}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10 border border-slate-100 transform transition-all duration-300 scale-100 flex flex-col gap-4 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <HelpCircle size={18} className="text-indigo-600" />
                {editingFaqIndex !== null ? "Edit FAQ" : "Add FAQ"}
              </h3>
              <button
                type="button"
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                onClick={() => setShowFaqModal(false)}
              >
                Cancel
              </button>
            </div>

            {faqError && (
              <div className="flex gap-2.5 p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-xs font-semibold">
                <AlertCircle className="shrink-0 text-rose-500" size={15} />
                <p>{faqError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Question
                </label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g., What is included in this bundle?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Answer
                </label>
                <textarea
                  required
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Provide a clear, detailed answer..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                onClick={() => setShowFaqModal(false)}
              >
                Discard
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/10"
              >
                <Save size={12} />
                Save FAQ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

