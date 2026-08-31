"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import DynamicBlockEditor from "@/components/DynamicBlockEditor";
import {
  Image as ImageIcon,
  Tag,
  User,
  CalendarClock,
  CheckCircle,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  Eye,
  Search,
  X,
  Plus,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";

export default function PostEditor({
  siteId,
  post,
  categories = [],
  tags = [],
  authors = [],
}) {
  const router = useRouter();
  const isEditMode = !!post;

  /* ─────────────── Core form state ─────────────── */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [contentJson, setContentJson] = useState(""); // Holds BlockNote JSON
  const [status, setStatus] = useState("DRAFT");
  const [authorId, setAuthorId] = useState("");

  /* ─────────────── Categories ─────────────── */
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [localCategories, setLocalCategories] = useState(categories);
  const [newCatName, setNewCatName] = useState("");
  const [catCreating, setCatCreating] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  /* ─────────────── Tags ─────────────── */
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [localTags, setLocalTags] = useState(tags);
  const [newTagName, setNewTagName] = useState("");
  const [tagCreating, setTagCreating] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  /* ─────────────── Scheduling ─────────────── */
  const [customPublishDate, setCustomPublishDate] = useState(false);
  const [publishDate, setPublishDate] = useState("");

  /* ─────────────── Featured image ─────────────── */
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [featuredImageId, setFeaturedImageId] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");

  /* ─────────────── SEO ─────────────── */
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [mediaPickerTarget, setMediaPickerTarget] = useState("featuredImage"); // "featuredImage" or "ogImage"

  /* ─────────────── Submit state ─────────────── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /* ─────────────── Publisher Social Links ─────────────── */
  const [publisherSocials, setPublisherSocials] = useState({
    youtube: "",
    instagram: "",
    facebook: "",
    pinterest: "",
    linkedin: "",
    twitter: "",
  });

  /* ─────────────── Autosave state ─────────────── */
  const [autosaveStatus, setAutosaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimer = useRef(null);
  const initialLoadDone = useRef(false);

  /* ─────────────── Helpers ─────────────── */
  function slugify(text = "") {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  }

  function formatForDateTimeLocal(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // Strip HTML tags for an accurate word count from the generated HTML
  const strippedContent = content.replace(/<[^>]+>/g, "");
  const wordCount = strippedContent.trim()
    ? strippedContent.trim().split(/\s+/).length
    : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const isScheduled =
    customPublishDate && publishDate && new Date(publishDate) > new Date();

  /* ─────────────── Load existing post data ─────────────── */
  useEffect(() => {
    if (isEditMode && post) {
      const rawHtml = post.contentJson || (typeof post.content === "string" ? post.content : "");
      let excerptVal = post.excerpt || "";
      if (!excerptVal && rawHtml) {
        const plain = rawHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (plain) excerptVal = plain.length > 200 ? plain.slice(0, 197) + "..." : plain;
      }

      setTitle(post.title || "");
      setSlug(post.slug || "");
      setExcerpt(excerptVal);
      setContent(rawHtml);
      setContentJson(post.contentJson || rawHtml);
      setStatus(post.status || "DRAFT");
      setAuthorId(post.authorId || "");
      setSeoTitle(post.seoTitle || "");
      setSeoDescription(post.seoDescription || "");
      setCanonicalUrl(post.canonicalUrl || "");
      setOgImage(post.ogImage || "");

      if (post.publisherSocials) {
        setPublisherSocials({
          youtube: post.publisherSocials.youtube || "",
          instagram: post.publisherSocials.instagram || "",
          facebook: post.publisherSocials.facebook || "",
          pinterest: post.publisherSocials.pinterest || "",
          linkedin: post.publisherSocials.linkedin || "",
          twitter: post.publisherSocials.twitter || "",
        });
      }

      if (post.categories) {
        setSelectedCategoryIds(post.categories.map((c) => c.id));
      }

      if (post.tags) {
        setSelectedTagIds(post.tags.map((t) => t.id));
      }

      if (post.featuredImage) {
        setFeaturedImageId(post.featuredImage.id);
        setFeaturedImageUrl(
          post.featuredImage.secureUrl || post.featuredImage.url || "",
        );
        setFeaturedImageAlt(post.featuredImage.altText || "");
      } else if (post.featuredImageId) {
        setFeaturedImageId(post.featuredImageId);
      }

      if (post.publishedAt) {
        setCustomPublishDate(true);
        setPublishDate(formatForDateTimeLocal(post.publishedAt));
      }
    }
  }, [post, isEditMode]);

  /* ─────────────── Autosave ─────────────── */
  // Mark dirty whenever content fields change (after initial load)
  useEffect(() => {
    if (initialLoadDone.current) {
      setIsDirty(true);
      setAutosaveStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    slug,
    excerpt,
    content,
    contentJson,
    seoTitle,
    seoDescription,
    canonicalUrl,
    ogImage,
    selectedCategoryIds,
    selectedTagIds,
    featuredImageId,
    publishDate,
    status,
  ]);

  // Mark initial load done after mount
  useEffect(() => {
    const t = setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Autosave timer — fires every 30s if dirty and in edit mode
  useEffect(() => {
    if (!isEditMode || !isDirty) return;
    autosaveTimer.current = setTimeout(() => {
      autosaveDraft();
    }, 30000);
    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDirty,
    title,
    content,
    contentJson,
    seoTitle,
    seoDescription,
    selectedCategoryIds,
    selectedTagIds,
    publisherSocials,
  ]);

  async function autosaveDraft() {
    if (!isEditMode || !post?.id) return;
    setAutosaveStatus("saving");
    try {
      const res = await fetch(`/api/dashboard/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          contentJson,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          canonicalUrl: canonicalUrl || null,
          ogImage: ogImage || null,
          featuredImageId: featuredImageId || null,
          categoryIds: selectedCategoryIds,
          tagIds: selectedTagIds,
          authorId: authorId || null,
          publisherSocials,
          // Never auto-publish — only save as current status
        }),
      });
      if (res.ok) {
        setAutosaveStatus("saved");
        setLastSavedAt(new Date());
        setIsDirty(false);
        setTimeout(() => setAutosaveStatus("idle"), 5000);
      } else {
        setAutosaveStatus("error");
      }
    } catch {
      setAutosaveStatus("error");
    }
  }

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function formatSavedTime(date) {
    if (!date) return "";
    const secs = Math.floor((new Date() - date) / 1000);
    if (secs < 10) return "just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  /* ─────────────── Event handlers ─────────────── */
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (!isEditMode) setSlug(slugify(val));
  };

  const handleCategoryToggle = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatCreating(true);
    try {
      const res = await fetch("/api/dashboard/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ name: newCatName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");
      const cat = data.data?.category ?? data.category;
      setLocalCategories((prev) =>
        [...prev, { ...cat, _count: { posts: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setSelectedCategoryIds((prev) => [...prev, cat.id]);
      setNewCatName("");
    } catch (err) {
      alert(err.message);
    } finally {
      setCatCreating(false);
    }
  };

  const handleTagToggle = (id) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagCreating(true);
    try {
      const res = await fetch("/api/dashboard/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ name: newTagName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tag");
      const tagObj = data.data?.tag ?? data.tag;
      setLocalTags((prev) =>
        [...prev, { ...tagObj, _count: { posts: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setSelectedTagIds((prev) => [...prev, tagObj.id]);
      setNewTagName("");
    } catch (err) {
      alert(err.message);
    } finally {
      setTagCreating(false);
    }
  };

  const handleSelectMedia = (media) => {
    if (mediaPickerTarget === "ogImage") {
      setOgImage(media.secureUrl || media.url);
    } else {
      setFeaturedImageId(media.id);
      setFeaturedImageUrl(media.secureUrl || media.url);
      setFeaturedImageAlt(media.altText || "");
    }
    setShowMediaPicker(false);
  };

  const removeFeaturedImage = () => {
    setFeaturedImageId(null);
    setFeaturedImageUrl("");
    setFeaturedImageAlt("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // If a future publish date is set, save as DRAFT so the cron job
    // picks it up and publishes it when the time comes.
    const hasFutureDate =
      customPublishDate && publishDate && new Date(publishDate) > new Date();
    const effectiveStatus = hasFutureDate ? "DRAFT" : status;

    const postData = {
      siteId,
      title,
      slug,
      excerpt,
      content,
      contentJson, // Included BlockNote JSON
      status: effectiveStatus,
      authorId: authorId || null,
      featuredImageId: featuredImageId || null,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      canonicalUrl: canonicalUrl || null,
      ogImage: ogImage || null,
      publishedAt:
        customPublishDate && publishDate
          ? new Date(publishDate).toISOString()
          : null,
      publisherSocials,
    };

    const url = isEditMode ? `/api/dashboard/posts/${post.id}` : "/api/dashboard/posts";
    const method = isEditMode ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(postData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save post");
      toast.success(
        isEditMode
          ? "Blog post updated successfully!"
          : "Blog post created successfully!",
      );
      router.push("/dashboard/blogs");
      router.refresh();
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─────────────── Filtered categories ─────────────── */
  const filteredCategories = localCategories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const selectedCategories = localCategories.filter((c) =>
    selectedCategoryIds.includes(c.id),
  );

  /* ─────────────── Filtered tags ─────────────── */
  const filteredTags = localTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  const selectedTags = localTags.filter((t) =>
    selectedTagIds.includes(t.id),
  );

  /* ─────────────── Author display ─────────────── */
  const selectedAuthor =
    authors.find((a) => a.id === authorId) ||
    (isEditMode && post?.author ? post.author : null);
  const authorEmail = selectedAuthor?.email || "Logged-in User";
  const authorInitials = authorEmail.slice(0, 2).toUpperCase();

  /* ─────────────── SEO preview ─────────────── */
  const previewTitle = seoTitle || title || "Page Title";
  const previewDesc =
    seoDescription || excerpt || "No description set for this page yet.";
  const previewSlug = slug || "your-post-slug";

  return (
    <div className="space-y-6">
      {/* Autosave indicator */}
      {isEditMode && (
        <div
          className={`flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border ${autosaveStatus === "saving"
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : autosaveStatus === "saved"
                ? "bg-green-50 text-green-600 border-green-200"
                : autosaveStatus === "error"
                  ? "bg-red-50 text-red-600 border-red-200"
                  : isDirty
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-50 text-gray-400 border-transparent"
            }`}
        >
          {autosaveStatus === "saving" && (
            <>
              <Loader2 size={10} className="animate-spin" /> Autosaving...
            </>
          )}
          {autosaveStatus === "saved" && (
            <>
              <CheckCircle size={10} /> Autosaved {formatSavedTime(lastSavedAt)}
            </>
          )}
          {autosaveStatus === "error" && <>⚠ Autosave failed</>}
          {autosaveStatus === "idle" && isDirty && <>● Unsaved changes</>}
          {autosaveStatus === "idle" && !isDirty && lastSavedAt && (
            <>Saved {formatSavedTime(lastSavedAt)}</>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          <AlertCircle size={15} className="shrink-0 text-rose-50 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        {/* ── Left: Content Area ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title & Slug */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              Post Content
            </h2>

            <div>
              <label
                htmlFor="title"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder="Enter a compelling blog title..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                URL Slug <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono select-none">
                  /
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="url-slug-here"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-6 pr-3.5 py-2.5 text-xs font-mono text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="excerpt"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Excerpt / Summary
              </label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary shown in post cards and search results..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 resize-y"
              />
            </div>

            <div className="z-10 relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Content Body
                </label>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>{wordCount.toLocaleString("en-US")} words</span>
                  <span className="text-slate-200">|</span>
                  <span>~{readTime} min read</span>
                </div>
              </div>
              <DynamicBlockEditor
                initialContent={post?.contentJson}
                fallbackHtml={post?.content}
                onChangeHtml={(html) => setContent(html)}
                onChangeJson={(json) => setContentJson(json)}
              />
            </div>
          </div>

          {/* SEO Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-500" />
                SEO & Search Metadata
              </h2>
              <button
                type="button"
                onClick={() => setShowSeoPreview((p) => !p)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition"
              >
                <Eye size={11} />
                {showSeoPreview ? "Hide" : "Preview"}
              </button>
            </div>

            {/* Google SERP Preview */}
            {showSeoPreview && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  Google Search Preview
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  example.com › blog › {previewSlug}
                </p>
                <p className="text-sm font-semibold text-blue-700 leading-snug hover:underline cursor-pointer truncate">
                  {previewTitle.slice(0, 120)}
                  {previewTitle.length > 120 ? "…" : ""}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {previewDesc.slice(0, 320)}
                  {previewDesc.length > 320 ? "…" : ""}
                </p>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="seoTitle"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  Meta Title
                </label>
                <span
                  className={`text-[10px] font-semibold ${seoTitle.length > 120 ? "text-rose-500" : "text-slate-400"}`}
                >
                  {seoTitle.length}/120
                </span>
              </div>
              <input
                type="text"
                id="seoTitle"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Google search listing title (defaults to post title)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
              />
              {/* Progress bar */}
              <div className="mt-1.5 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${seoTitle.length > 120 ? "bg-rose-400" : "bg-indigo-400"}`}
                  style={{
                    width: `${Math.min(100, (seoTitle.length / 120) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="seoDescription"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  Meta Description
                </label>
                <span
                  className={`text-[10px] font-semibold ${seoDescription.length > 320 ? "text-rose-500" : "text-slate-400"}`}
                >
                  {seoDescription.length}/320
                </span>
              </div>
              <textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Google search preview description..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 resize-y"
              />
              <div className="mt-1.5 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${seoDescription.length > 320 ? "bg-rose-400" : "bg-indigo-400"}`}
                  style={{
                    width: `${Math.min(100, (seoDescription.length / 320) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="canonicalUrl"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Canonical URL
              </label>
              <input
                type="text"
                id="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="e.g. https://yourcompany.com/blog/my-post"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
              />
              <div className="mt-1.5 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${canonicalUrl ? "bg-emerald-400" : "bg-slate-200"}`}
                  style={{
                    width: canonicalUrl ? "100%" : "0%",
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span
                  className={
                    canonicalUrl
                      ? "text-emerald-600 font-semibold"
                      : "text-slate-400"
                  }
                >
                  {canonicalUrl
                    ? "✓ Canonical URL set"
                    : "Using default page URL"}
                </span>
                <span className="text-slate-400 font-mono">
                  {canonicalUrl.length} chars
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="ogImage"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                OG Image URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  id="ogImage"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="e.g. https://yourcompany.com/og-image.jpg"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-sm font-mono text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setMediaPickerTarget("ogImage");
                    setShowMediaPicker(true);
                  }}
                  className="px-3.5 py-2 border rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-600 border-slate-200 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer w-full sm:w-auto"
                >
                  <ImageIcon size={12} />
                  Library
                </button>
              </div>
            </div>
          </div>

          {/* ── Publisher Social Links ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5 mb-4">
              <LinkIcon size={11} />
              Publisher Social Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">YouTube</label>
                <input
                  type="url"
                  value={publisherSocials.youtube}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, youtube: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Instagram</label>
                <input
                  type="url"
                  value={publisherSocials.instagram}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, instagram: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Facebook</label>
                <input
                  type="url"
                  value={publisherSocials.facebook}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pinterest</label>
                <input
                  type="url"
                  value={publisherSocials.pinterest}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, pinterest: e.target.value })}
                  placeholder="https://pinterest.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">LinkedIn</label>
                <input
                  type="url"
                  value={publisherSocials.linkedin}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Twitter</label>
                <input
                  type="url"
                  value={publisherSocials.twitter}
                  onChange={(e) => setPublisherSocials({ ...publisherSocials, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
          {/* Featured Image */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              Featured Image
            </h2>

            {featuredImageUrl ? (
              <div className="space-y-2">
                <div className="group relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img
                    src={featuredImageUrl}
                    alt={featuredImageAlt || "Featured image"}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerTarget("featuredImage");
                        setShowMediaPicker(true);
                      }}
                      className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 rounded-lg text-[10px] font-bold shadow-sm transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeFeaturedImage}
                      className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-[10px] font-bold shadow-sm transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Image Alt Text
                  </label>
                  <input
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Describe the image for accessibility..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMediaPickerTarget("featuredImage");
                  setShowMediaPicker(true);
                }}
                className="w-full aspect-video border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/5 rounded-xl flex flex-col items-center justify-center gap-2 text-center p-4 transition-all duration-200 cursor-pointer group"
              >
                <div className="p-3 bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-400 rounded-full transition">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Select Featured Image
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    JPEG, PNG or WebP
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Tag size={11} />
              Categories
            </h2>

            {/* Selected chips */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors group"
                    title="Click to remove"
                  >
                    {cat.name}
                    <X
                      size={9}
                      className="opacity-60 group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Category search */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-8 pr-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
              />
            </div>

            {/* Category list */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {filteredCategories.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic p-2">
                  No categories match.
                </p>
              ) : (
                filteredCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-3.5 w-3.5"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {cat._count?.posts ?? 0}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Quick add */}
            <div className="pt-1 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory(e);
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={catCreating || !newCatName.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {catCreating ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Plus size={10} />
                  )}
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Tag size={11} />
              Tags
            </h2>

            {/* Selected chips */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTagToggle(t.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e8f4ff] text-[#0f7c85] border border-indigo-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors group"
                    title="Click to remove"
                  >
                    {t.name}
                    <X
                      size={9}
                      className="opacity-60 group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Tag search */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-8 pr-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
              />
            </div>

            {/* Tag list */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {filteredTags.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic p-2">
                  No tags match.
                </p>
              ) : (
                filteredTags.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(t.id)}
                        onChange={() => handleTagToggle(t.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-3.5 w-3.5"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        {t.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {t._count?.posts ?? 0}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Quick add */}
            <div className="pt-1 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag(e);
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={tagCreating || !newTagName.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {tagCreating ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Plus size={10} />
                  )}
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Publish Console */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              Publishing Console
            </h2>

            {/* Status selector */}
            <div>
              <label
                htmlFor="status"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Status
              </label>
              <div className="relative">
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
                <ChevronRight
                  size={13}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90"
                />
              </div>
            </div>

            {/* Status pill summary */}
            <div className="rounded-xl p-3 bg-slate-50 border border-slate-100 flex items-center gap-2">
              {isScheduled ? (
                <>
                  <CalendarClock
                    size={14}
                    className="text-amber-500 shrink-0"
                  />
                  <div>
                    <p className="text-[10px] font-bold text-amber-700">
                      Scheduled Post
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Will publish on{" "}
                      {new Date(publishDate).toLocaleString("en-US")}
                    </p>
                  </div>
                </>
              ) : status === "PUBLISHED" ? (
                <>
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-green-700">
                      Publish Immediately
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Post will go live on save.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-600">
                      Draft Mode
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Not visible to the public.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Schedule toggle */}
            <>
              <>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${customPublishDate ? "bg-[var(--admin-accent,#0f7c85)]" : "bg-slate-200"}`}
                  >
                    <input
                      type="checkbox"
                      checked={customPublishDate}
                      onChange={(e) => setCustomPublishDate(e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${customPublishDate ? "translate-x-3.5" : "translate-x-0"}`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 transition">
                    Schedule / Custom Date
                  </span>
                </label>

                {customPublishDate && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Publish Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all duration-200"
                      required={customPublishDate}
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      A future date will schedule the post; a past date
                      publishes immediately.
                    </p>
                  </div>
                )}
              </>
            </>

            {/* Author */}
            <div>
              <label
                htmlFor="authorId"
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Author
              </label>
              {selectedAuthor ? (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {authorInitials}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {authorEmail}
                  </span>
                </div>
              ) : null}
              <div className="relative">
                <select
                  id="authorId"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="">Logged-in User (Default)</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ? `${a.name} (${a.email})` : a.email}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  size={13}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push("/dashboard/blogs")}
                disabled={isSubmitting}
                className="flex-1 py-2.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "var(--admin-accent, #0f7c85)" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={12} />
                    {isEditMode
                      ? "Save Changes"
                      : isScheduled
                        ? "Schedule Post"
                        : status === "PUBLISHED"
                          ? "Publish Post"
                          : "Save Draft"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Full-width action bar (mobile supplement) */}
        <div className="lg:hidden flex gap-2 pt-2 border-t border-slate-100 col-span-1">
          <button
            type="button"
            onClick={() => router.push("/dashboard/blogs")}
            disabled={isSubmitting}
            className="flex-1 py-3 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="admin-btn admin-btn-primary flex-1 shadow-md disabled:opacity-50 !py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={12} /> {isEditMode ? "Save" : "Publish"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          title={
            mediaPickerTarget === "ogImage"
              ? "Select OG Image"
              : "Select Featured Image"
          }
          filter="images"
          onSelect={handleSelectMedia}
          onClose={() => setShowMediaPicker(false)}
          siteId={siteId}
        />
      )}
    </div>
  );
}

