/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Upload, Calendar, Link as LinkIcon, Tag, Layers, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { compressImage } from "@/utils/clientImageCompression";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import DynamicBlockEditor from "@/components/DynamicBlockEditor";

export default function MagazineEditor({ initialData = null, siteId = null }) {
  const router = useRouter();
  const effectiveSiteId = siteId || initialData?.siteId || (typeof window !== "undefined" ? localStorage.getItem("x-site-id") : "") || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverPreview, setCoverPreview] = useState(initialData?.coverImage || null);
  const [backPreview, setBackPreview] = useState(initialData?.backImage || null);
  const [spinePreview, setSpinePreview] = useState(initialData?.spineImage || null);

  const [pickerTarget, setPickerTarget] = useState(null);
  const [coverUrl, setCoverUrl] = useState(initialData?.coverImage || null);
  const [backUrl, setBackUrl] = useState(initialData?.backImage || null);
  const [spineUrl, setSpineUrl] = useState(initialData?.spineImage || null);

  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef(null);
  
  const [insideIssue, setInsideIssue] = useState(initialData?.insideIssue || []);

  const [values, setValues] = useState({
    magazine_id: initialData?.magazineId || "",
    magazine_title: initialData?.title || "",
    magazine_description: initialData?.description || "",
    magazine_introduction: initialData?.introduction || "",
    magazine_tags: initialData?.tags || "",
    magazine_link: initialData?.link || "",
    magazine_date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : "",
    magazine_category: initialData?.category || "",
    MagCloudLink: initialData?.magCloudLink || "",
    magazine_slug: initialData?.slug || "",
    status: initialData ? initialData.status : 1, // Default to Published
    youtube: initialData?.publisherSocials?.youtube || "",
    instagram: initialData?.publisherSocials?.instagram || "",
    facebook: initialData?.publisherSocials?.facebook || "",
    pinterest: initialData?.publisherSocials?.pinterest || "",
    linkedin: initialData?.publisherSocials?.linkedin || "",
    twitter: initialData?.publisherSocials?.twitter || "",
  });

  const handleMediaSelect = (mediaObj) => {
    const url = mediaObj.secureUrl || mediaObj.url;
    if (pickerTarget === "cover") {
      setCoverPreview(url);
      setCoverUrl(url);
    } else if (pickerTarget === "back") {
      setBackPreview(url);
      setBackUrl(url);
    } else if (pickerTarget === "spine") {
      setSpinePreview(url);
      setSpineUrl(url);
    } else if (pickerTarget === "pdf") {
      setValues((prev) => ({ ...prev, magazine_link: url }));
    }
    setPickerTarget(null);
  };

  const handlePdfFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please select a valid PDF file.");
      return;
    }

    const MAX_SIZE_MB = 100;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`PDF file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${MAX_SIZE_MB}MB limit.`);
      return;
    }

    setIsUploadingPdf(true);
    try {
      // 1. Primary required step: Upload PDF to our S3 Media Library (/api/media/upload)
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to upload PDF file to storage.");
      }

      const mediaObj = data.data?.media || data.media;
      const uploadedUrl = mediaObj?.secureUrl || mediaObj?.url;

      if (!uploadedUrl) {
        throw new Error("No URL returned from media upload server.");
      }

      // magazine_link is ALWAYS set to our own S3 URL (powering the in-app DearFlip reader)
      setValues((prev) => ({
        ...prev,
        magazine_link: uploadedUrl,
      }));

      toast.success("Magazine PDF uploaded to S3 successfully!");
    } catch (err) {
      console.error("PDF upload error:", err);
      toast.error(err.message || "Failed to upload PDF file.");
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const generateSlug = (title) => {
    return String(title || "")
      .toLowerCase()
      .replace(/'/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const addInsideIssueItem = () => {
    setInsideIssue([...insideIssue, { title: "", desc: "", color: "bg-[#e8f5f6]" }]);
  };

  const updateInsideIssueItem = (index, field, value) => {
    const newItems = [...insideIssue];
    newItems[index][field] = value;
    setInsideIssue(newItems);
  };

  const removeInsideIssueItem = (index) => {
    const newItems = [...insideIssue];
    newItems.splice(index, 1);
    setInsideIssue(newItems);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setValues((prev) => {
      const updated = { ...prev, magazine_title: title };
      // Only auto-generate slug if we are creating new magazine
      if (!initialData) {
        updated.magazine_slug = generateSlug(title);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.magazine_title || !values.magazine_slug || !values.magazine_date) {
      toast.error("Please fill in the title, slug, and date.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("magazine_id", values.magazine_id);
    formData.append("magazine_title", values.magazine_title);
    formData.append("magazine_description", values.magazine_description);
    formData.append("magazine_introduction", values.magazine_introduction);
    formData.append("magazine_tags", values.magazine_tags);
    formData.append("magazine_link", values.magazine_link);
    formData.append("magazine_date", values.magazine_date);
    formData.append("magazine_category", values.magazine_category);
    formData.append("MagCloudLink", values.MagCloudLink);
    formData.append("magazine_slug", values.magazine_slug);
    formData.append("status", values.status.toString());
    formData.append("publisherSocials", JSON.stringify({
      youtube: values.youtube || "",
      instagram: values.instagram || "",
      facebook: values.facebook || "",
      pinterest: values.pinterest || "",
      linkedin: values.linkedin || "",
      twitter: values.twitter || ""
    }));
    formData.append("insideIssue", JSON.stringify(insideIssue));

    if (coverUrl) {
      formData.append("magazine_cover_image", coverUrl);
    }
    if (backUrl) {
      formData.append("magazine_back_image", backUrl);
    }
    if (spineUrl) {
      formData.append("magazine_spine_image", spineUrl);
    }

    try {
      const url = initialData
        ? `/api/dashboard/magazines/${initialData.slug}`
        : "/api/dashboard/magazines";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(initialData ? "Magazine updated successfully!" : "Magazine created successfully!");
        router.push("/dashboard/magazines");
        router.refresh();
      } else {
        toast.error(data.error || "Something went wrong!");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/magazines"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {initialData ? "Edit Magazine" : "Create New Magazine"}
          </h1>
          <p className="text-xs text-slate-500">
            {initialData ? "Modify magazine issue configurations." : "Publish a new magazine issue on your site."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Form inputs */}
        <div className="md:col-span-2 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          {/* Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Magazine ID
              </label>
              <input
                type="text"
                value={values.magazine_id}
                onChange={(e) => setValues({ ...values, magazine_id: e.target.value })}
                placeholder="e.g. EBH-JULY-2026"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Category
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={values.magazine_category}
                  onChange={(e) => setValues({ ...values, magazine_category: e.target.value })}
                  placeholder="e.g. Nature, Travel"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 pl-8 pr-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Layers className="absolute left-2.5 top-3 text-slate-400" size={14} />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Magazine Title
            </label>
            <input
              type="text"
              value={values.magazine_title}
              onChange={handleTitleChange}
              placeholder="e.g. Exploring the Earth Issue #12"
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Slug (URL slug)
            </label>
            <input
              type="text"
              value={values.magazine_slug}
              onChange={(e) => setValues({ ...values, magazine_slug: e.target.value })}
              placeholder="e.g. exploring-the-earth-issue-12"
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-slate-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Short Description (Summary for Archive Card)
            </label>
            <textarea
              value={values.magazine_description}
              onChange={(e) => setValues({ ...values, magazine_description: e.target.value })}
              placeholder="Enter a brief summary of this issue..."
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-100"
            />
          </div>

          {/* Introduction */}
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Introduction (Letter to Readers shown inside the reader)
            </label>
            <div className="w-full">
              <DynamicBlockEditor
                initialContent={values.magazine_introduction}
                fallbackHtml={values.magazine_introduction}
                placeholder="Write the introduction / letter to readers..."
                onChangeHtml={(val) => setValues((prev) => ({ ...prev, magazine_introduction: val }))}
              />
            </div>
          </div>

          {/* Inside This Issue Section */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Inside This Issue</h3>
                <p className="text-[11px] text-slate-500">Add key articles featured in this magazine.</p>
              </div>
              <button
                type="button"
                onClick={addInsideIssueItem}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
              >
                <Plus size={14} /> Add Article
              </button>
            </div>
            
            <div className="space-y-4">
              {insideIssue.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  No articles added yet. Click &quot;Add Article&quot; to create one.
                </div>
              ) : (
                insideIssue.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-col sm:flex-row gap-3 relative group">
                    <button 
                      type="button"
                      onClick={() => removeInsideIssueItem(idx)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                    

                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Title</label>
                      <input 
                        type="text" 
                        value={item.title} 
                        onChange={(e) => updateInsideIssueItem(idx, 'title', e.target.value)}
                        className="w-full text-xs rounded border border-slate-200 py-1.5 px-2 bg-transparent font-medium"
                        placeholder="Article Title..."
                      />
                    </div>
                    
                    <div className="flex-[2] flex flex-col gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Description</label>
                      <input 
                        type="text" 
                        value={item.desc} 
                        onChange={(e) => updateInsideIssueItem(idx, 'desc', e.target.value)}
                        className="w-full text-xs rounded border border-slate-200 py-1.5 px-2 bg-transparent text-slate-600"
                        placeholder="A short summary..."
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2 w-full sm:w-24 shrink-0">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Color Class</label>
                      <select
                        value={item.color}
                        onChange={(e) => updateInsideIssueItem(idx, 'color', e.target.value)}
                        className="w-full text-[11px] rounded border border-slate-200 py-1.5 px-1 bg-transparent"
                      >
                        <option value="bg-[#e8f5f6]">Teal</option>
                        <option value="bg-[#eef8ef]">Green</option>
                        <option value="bg-[#eff4fe]">Blue</option>
                        <option value="bg-[#fcf1f1]">Pink</option>
                        <option value="bg-[#fff9ed]">Orange</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Publisher Social Links */}
          <div className="w-full space-y-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Publisher Social Links
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">YouTube</label>
                <input
                  type="url"
                  value={values.youtube}
                  onChange={(e) => setValues({ ...values, youtube: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Instagram</label>
                <input
                  type="url"
                  value={values.instagram}
                  onChange={(e) => setValues({ ...values, instagram: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Facebook</label>
                <input
                  type="url"
                  value={values.facebook}
                  onChange={(e) => setValues({ ...values, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Pinterest</label>
                <input
                  type="url"
                  value={values.pinterest}
                  onChange={(e) => setValues({ ...values, pinterest: e.target.value })}
                  placeholder="https://pinterest.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">LinkedIn</label>
                <input
                  type="url"
                  value={values.linkedin}
                  onChange={(e) => setValues({ ...values, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Twitter</label>
                <input
                  type="url"
                  value={values.twitter}
                  onChange={(e) => setValues({ ...values, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Media, links, status */}
        <div className="space-y-6">
          {/* Status and Action */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={values.status}
                onChange={(e) => setValues({ ...values, status: parseInt(e.target.value) })}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 px-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={1}>Published</option>
                <option value={0}>Draft</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              style={{ background: "var(--admin-accent, #0f7c85)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Issue"
              )}
            </button>
          </div>

          {/* Cover image */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cover Image (Front Cover)
            </label>
            {coverPreview ? (
              <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                <img src={coverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview(null);
                    setCoverUrl(null);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => setPickerTarget("cover")}
                className="aspect-[3/4] max-w-[200px] mx-auto bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer transition"
              >
                <Upload size={24} />
                <span className="text-[10px] font-semibold text-center px-2">Select or Upload Cover</span>
              </div>
            )}
          </div>

          {/* Back Cover image */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Back Cover Image
            </label>
            {backPreview ? (
              <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                <img src={backPreview} alt="Back Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setBackPreview(null);
                    setBackUrl(null);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => setPickerTarget("back")}
                className="aspect-[3/4] max-w-[200px] mx-auto bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer transition"
              >
                <Upload size={24} />
                <span className="text-[10px] font-semibold text-center px-2">Select or Upload Back Cover</span>
              </div>
            )}
          </div>

          {/* Spine Image */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Spine Image
            </label>
            {spinePreview ? (
              <div className="relative aspect-[1/5] max-w-[80px] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                <img src={spinePreview} alt="Spine Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSpinePreview(null);
                    setSpineUrl(null);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer text-center"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => setPickerTarget("spine")}
                className="aspect-[1/5] max-w-[80px] h-[150px] mx-auto bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer transition"
              >
                <Upload size={20} />
                <span className="text-[9px] font-semibold text-center px-1">Select Media</span>
              </div>
            )}
          </div>

          {/* Links and Metadata */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Publication Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={values.magazine_date}
                  onChange={(e) => setValues({ ...values, magazine_date: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 pl-8 pr-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <Calendar className="absolute left-2.5 top-3 text-slate-400" size={14} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  PDF / Read Link
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploadingPdf}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {isUploadingPdf ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isUploadingPdf ? "Uploading PDF..." : "Upload PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTarget("pdf")}
                    className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md transition-colors"
                  >
                    Media Library
                  </button>
                </div>
              </div>

              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfFileUpload}
                className="hidden"
              />

              <div className="relative">
                <input
                  type="text"
                  value={values.magazine_link}
                  onChange={(e) => setValues({ ...values, magazine_link: e.target.value })}
                  placeholder="https://... or click Upload PDF above"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 pl-8 pr-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <LinkIcon className="absolute left-2.5 top-3 text-slate-400" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                MagCloud Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={values.MagCloudLink}
                  onChange={(e) => setValues({ ...values, MagCloudLink: e.target.value })}
                  placeholder="https://magcloud.com/..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 pl-8 pr-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <LinkIcon className="absolute left-2.5 top-3 text-slate-400" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Magazine Tags
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={values.magazine_tags}
                  onChange={(e) => setValues({ ...values, magazine_tags: e.target.value })}
                  placeholder="ecology, travel, nature"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 pl-8 pr-3 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Tag className="absolute left-2.5 top-3 text-slate-400" size={14} />
              </div>
            </div>
          </div>
        </div>
      </form>

      {pickerTarget && (
        <MediaPickerModal
          onClose={() => setPickerTarget(null)}
          onSelect={handleMediaSelect}
          siteId={effectiveSiteId}
        />
      )}
    </div>
  );
}
