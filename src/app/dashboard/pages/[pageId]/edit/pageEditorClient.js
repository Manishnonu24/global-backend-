// src/app/(dashboard)/pages/[pageId]/edit/pageEditorClient.js
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

import Image from "next/image";
import {
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpCircle,
  FileText,
  Settings,
  Sliders,
  Code,
  Smartphone,
  Monitor,
  Save,
  Image as ImageIcon,
  HelpCircle,
  AlertTriangle,
  X,
  RefreshCw, Upload,
  ShieldAlert,
} from "lucide-react";
import { TEMPLATE_REGISTRY, getTemplateSlotDefinitions } from "@/components/cms/templateRegistry";
import { getAllowedSlotFields, toCanonicalObjectList } from "@/lib/templateSlotFields";
import { readField, getContractRegion, getEditableRegionKeys } from "@/content-contracts/pageContracts";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { isDynamicRoutePattern } from "@/lib/routeClassification";
import ImageUploadField from "@/components/media/ImageUploadField";

// SafeImage helper to support Next.js Image caching or fallback <img>
function SafeImage({ src, alt, ...props }) {
  if (!src) return null;
  const isLocal =
    src.startsWith("/") || src.startsWith(".") || src.startsWith("..");
  const isCloudinary = src.includes("res.cloudinary.com");

  if (isLocal || isCloudinary) {
    return <Image src={src} alt={alt} {...props} />;
  }

  const { fill, style, ...rest } = props;
  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          position: "absolute",
          height: "100%",
          width: "100%",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          ...style,
        }}
        {...rest}
      />
    );
  }
  return <img src={src} alt={alt} style={style} {...rest} />;
}

export default function PageEditorClient({
  pageId,
  siteId,
  pageTitle,
  frontendUrl,
  mode,
}) {
  const formattedSiteName = siteId
    ? siteId
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    : "Global Backend Site";

  // Safe fetch overlay injecting site token
  const fetchWithAuth = useCallback((url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "x-site-id": siteId,
      },
    });
  }, [siteId]);

  // State Management
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [rawJsonContent, setRawJsonContent] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // Typed message state: { type: 'success'|'error'|'warning'|'info', text: string } | null
  const [message, setMessage] = useState(null);

  // Page Settings Metadata States
  const [title, setTitle] = useState(pageTitle || "");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [jsonLd, setJsonLd] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [pageType, setPageType] = useState("CMS_BUILT");
  // templateKey is always stored canonicalized (uppercase, trimmed)
  const [templateKey, setTemplateKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [showInNav, setShowInNav] = useState(true);
  const [page, setPage] = useState(null);
  const effectiveRoute = page?.slug || page?.sourceRoute || slug || "";
  const isDynamicPattern = isDynamicRoutePattern(effectiveRoute);

  // Role management (only admins can toggle publish status)
  const [userRole, setUserRole] = useState("EDITOR");

  // Visual Form state variables (syncs with currently selected section)
  const [visualFields, setVisualFields] = useState({});

  // Media library picker states
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [pickerTargetField, setPickerTargetField] = useState("");

  // Active workspace settings tab
  const [activeTab, setActiveTab] = useState("page_meta");

  // Live viewport preview toggle
  const [previewDevice, setPreviewDevice] = useState("desktop");

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimer = useRef(null);
  const initialLoadDone = useRef(false);
  const iframeRef = useRef(null);
  const [previewKey, setPreviewKey] = useState(0);

  // Drag-and-drop state
  const [dragSrcIndex, setDragSrcIndex] = useState(null);

  // Version history modal state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionData, setSelectedVersionData] = useState(null);
  const [restoringVersion, setRestoringVersion] = useState(false);

  // Derived capability based on page type
  const capabilities = getPageCapabilities(page);
  const canCurrentUserPublish =
    capabilities.canPublish &&
    (userRole === "SUPERADMIN" || userRole === "ADMIN");
  const isContentReadOnly = !capabilities.canEditContent;
  const isMetadataReadOnly = !capabilities.canEditMetadata;
  const isSlugReadOnly = !capabilities.canEditSlug;
  const isSeoReadOnly = !capabilities.canEditSeo;
  const canSavePageMeta =
    capabilities.canEditMetadata ||
    capabilities.canEditSeo ||
    capabilities.canEditSlug ||
    capabilities.canDisable;
  // Notification helpers
  const flashMessage = useCallback((msgOrText, type = "success") => {
    if (typeof msgOrText === "string") {
      const lc = msgOrText.toLowerCase();
      const autoType = lc.startsWith("error") || lc.startsWith("❌") || lc.startsWith("failed")
        ? "error"
        : lc.startsWith("⚠") || lc.startsWith("warning")
        ? "warning"
        : type;
      setMessage({ type: autoType, text: msgOrText });
    } else {
      setMessage(msgOrText);
    }
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const flashSuccess = useCallback((text) => flashMessage({ type: "success", text }), [flashMessage]);
  const flashError = useCallback((text) => flashMessage({ type: "error", text }), [flashMessage]);
  const flashWarning = useCallback((text) => flashMessage({ type: "warning", text }), [flashMessage]);
  const flashInfo = useCallback((text) => flashMessage({ type: "info", text }), [flashMessage]);

  // Session Role Lookup
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json?.user?.globalRole) {
          setUserRole(json.user.globalRole);
        }
      })
      .catch((err) => console.error("Error fetching session role:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  const buildPageMetaPayload = useCallback((overrideStatus = null) => {
    let parsedJsonLd = null;
    if (jsonLd && jsonLd.trim()) {
      try {
        parsedJsonLd = JSON.parse(jsonLd);
      } catch (e) {
        return { error: "Invalid JSON-LD format. Please verify the JSON schema syntax." };
      }
    }

    const payload = {};
    if (capabilities.canEditMetadata) {
      payload.title = title;
    }
    if (capabilities.canEditSlug) {
      payload.slug = slug;
    }
    if (capabilities.canEditSeo) {
      payload.seoTitle = seoTitle || null;
      payload.seoKeywords = seoKeywords || null;
      payload.seoDescription = seoDescription || null;
      payload.canonicalUrl = canonicalUrl || null;
      payload.ogImage = ogImage || null;
      payload.jsonLd = parsedJsonLd;
    }
    if (capabilities.canDisable) {
      payload.isEnabled = isEnabled;
      payload.showInNav = showInNav;
    }
    if (overrideStatus) {
      payload.status = overrideStatus;
    }
    return { payload };
  }, [jsonLd, capabilities, title, slug, seoTitle, seoKeywords, seoDescription, canonicalUrl, ogImage, isEnabled, showInNav]);

  const autosavePageMeta = useCallback(async () => {
    if (!canSavePageMeta) return;
    const { payload, error } = buildPageMetaPayload();
    if (error || !payload || Object.keys(payload).length === 0) return;
    setAutosaveStatus("saving");
    try {
      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setAutosaveStatus("saved");
        setLastSavedAt(new Date());
        setIsDirty(false);
        setTimeout(() => setAutosaveStatus("idle"), 5000);
      } else {
        throw new Error(json.error || json.message || "Failed to autosave metadata");
      }
    } catch (err) {
      setAutosaveStatus("error");
      flashMessage(`Autosave failed: ${err.message}`);
    }
  }, [canSavePageMeta, buildPageMetaPayload, fetchWithAuth, pageId, flashMessage]);

  // Autosave timer — triggers 30s after becoming dirty
  useEffect(() => {
    if (!isDirty || !canSavePageMeta) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosavePageMeta();
    }, 30000);
    return () => clearTimeout(autosaveTimer.current);
  }, [isDirty, canSavePageMeta, autosavePageMeta, pageType, title, slug, seoTitle, seoKeywords, seoDescription, canonicalUrl, ogImage, jsonLd]);

  // Autosave Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && canSavePageMeta) autosavePageMeta();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isDirty,
    canSavePageMeta,
    autosavePageMeta,
    showInNav,
    title,
    slug,
    seoTitle,
    seoKeywords,
    seoDescription,
    canonicalUrl,
    ogImage,
    jsonLd,
  ]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function formatSavedAgo(date) {
    if (!date) return "";
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  // Synchronize visual form fields whenever a section is selected
  const selectSectionWithContext = useCallback((sec, loadedPageType = null, loadedTemplateKey = null) => {
    if (!sec) return;
    const pType = loadedPageType || pageType;
    // Always canonicalize: uppercase + trim. This is the single canonical value.
    const tKey = String(loadedTemplateKey || templateKey || "").trim().toUpperCase();

    setSelectedSection(sec);
    setRawJsonContent(JSON.stringify(sec.content || {}, null, 2));

    // Seed visual inputs based on type
    if (pType === "CODE_TEMPLATE") {
      const allowedFields = getAllowedSlotFields(tKey, sec.regionKey) || [];
      const vf = {};
      const secContent = sec.content || {};

      allowedFields.forEach(field => {
        let val = readField(secContent, field);
        // Special case: HOME hero legacy normalization for title
        if (tKey === "HOME" && sec.regionKey === "hero" && field.key === "title") {
          if (!secContent.title && (secContent.titleLine1 || secContent.titleLine2)) {
            val = [secContent.titleLine1, secContent.titleLine2].filter(Boolean).join("\n");
          }
        }
        if (field.type === 'object-list') {
          val = toCanonicalObjectList(val, field);
        }
        vf[field.key] = structuredClone(val);
      });
      setVisualFields(vf);
    } else if (sec.type === "HERO") {
      setVisualFields({
        badge: sec.content?.badge ?? sec.content?.eyebrow ?? "",
        titleLine1: sec.content?.titleLine1 ?? sec.content?.title ?? "",
        titleLine2: sec.content?.titleLine2 ?? "",
        description: sec.content?.description ?? sec.content?.subtitle ?? "",
        backgroundImage: sec.content?.backgroundImage ?? sec.content?.backgroundUrl ?? sec.content?.bannerUrl ?? sec.content?.heroImage ?? "",
        bgImageMobile: sec.content?.bgImageMobile ?? "",
        bgImageDesktop: sec.content?.bgImageDesktop ?? "",
        bannerMediaId: sec.content?.bannerMediaId ?? "",
        alignment: sec.content?.alignment ?? "center",
        primaryButtonText: sec.content?.primaryButtonText ?? sec.content?.primaryButton?.text ?? "",
        primaryButtonUrl: sec.content?.primaryButtonUrl ?? sec.content?.primaryButton?.url ?? "",
        secondaryButtonText: sec.content?.secondaryButtonText ?? sec.content?.secondaryButton?.text ?? "",
        secondaryButtonUrl: sec.content?.secondaryButtonUrl ?? sec.content?.secondaryButton?.url ?? "",
      });
    } else if (sec.type === "TEXT_BLOCK") {
      setVisualFields({
        title: sec.content?.title ?? "",
        body: sec.content?.body ?? "",
        imageUrl: sec.content?.imageUrl ?? "",
        imageMediaId: sec.content?.imageMediaId ?? "",
        imagePosition: sec.content?.imagePosition ?? "top",
        buttonText: sec.content?.buttonText ?? sec.content?.ctaText ?? sec.content?.cta?.text ?? "",
        buttonUrl: sec.content?.buttonUrl ?? sec.content?.ctaUrl ?? sec.content?.cta?.url ?? "",
      });
    } else if (sec.type === "CTA") {
      setVisualFields({
        title: sec.content?.title ?? "",
        subtitle: sec.content?.subtitle ?? "",
        primaryButtonText: sec.content?.primaryButtonText ?? "",
        primaryButtonUrl: sec.content?.primaryButtonUrl ?? "",
      });
    } else {
      // General or custom section type visual settings
      setVisualFields(sec.content || {});
    }

    setActiveTab("section_visual");
  }, [pageType, templateKey]);

  // Fetch page configuration and sections list
  const fetchPageDetails = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      // 1. Fetch metadata
      const metaRes = await fetchWithAuth(`/api/dashboard/pages/${pageId}`);
      let json;
      try {
        json = await metaRes.json();
      } catch (err) {
        throw new Error("Invalid JSON response from metadata API");
      }

      if (!metaRes.ok) {
        const errMsg = json?.error || json?.message || "Failed to load page configuration";
        throw new Error(`[${metaRes.status}] ${errMsg}`);
      }

      const p = json?.data?.page || json?.page;
      if (p) {
        setPage(p);
        setTitle(p.title || "");
        setSlug(p.slug || "");
        setSeoTitle(p.seoTitle || "");
        setSeoKeywords(p.seoKeywords || "");
        setSeoDescription(p.seoDescription || "");
        setStatus(p.status || "DRAFT");
        setJsonLd(p.jsonLd ? JSON.stringify(p.jsonLd, null, 2) : "");
        setCanonicalUrl(p.canonicalUrl || "");
        setOgImage(p.ogImage || "");
        setPageType(p.pageType || "CMS_BUILT");
        const canonicalTemplateKey = String(p.templateKey || "").trim().toUpperCase();
        setTemplateKey(canonicalTemplateKey);
        setIsEnabled(p.isEnabled ?? true);
        setShowInNav(p.showInNav ?? true);
      } else {
        throw new Error("Page data missing from response");
      }

      // 2. Fetch sections list
      const sectionsRes = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections`
      );
      let secJson;
      try {
        secJson = await sectionsRes.json();
      } catch (err) {
        throw new Error("Invalid JSON response from sections API");
      }

      let loadedSections = [];
      if (sectionsRes.ok) {
        loadedSections = secJson?.data?.sections || secJson?.sections || [];
        setSections(loadedSections);
      } else if (sectionsRes.status !== 404) {
        const errMsg = secJson?.error || secJson?.message || "Failed to load sections";
        throw new Error(`[${sectionsRes.status}] ${errMsg}`);
      }

      // Auto-select first editable section on initial page load.
      const pType = p?.pageType || "CMS_BUILT";
      const tKey = String(p?.templateKey || "").trim().toUpperCase();

      let firstEditableSec = null;
      if (pType === "CODE_TEMPLATE") {
        const editableRegionKeys = getEditableRegionKeys(tKey);
        firstEditableSec = loadedSections.find((s) => editableRegionKeys.includes(s.regionKey)) ?? null;

        if (!firstEditableSec) {
          setActiveTab("section_visual");
          if (loadedSections.length === 0) {
            flashWarning(`Page ${pageId} (${pType}, templateKey="${tKey}") has no sections yet. Use the Repair action to initialize them.`);
          } else {
            flashInfo("No editable PAGE_SECTION found. Check the contract tree on the left and use Repair if needed.");
          }
        }
      } else {
        firstEditableSec = loadedSections.find((s) => s.isVisible !== false) || loadedSections[0] || null;
      }

      if (firstEditableSec) {
        selectSectionWithContext(firstEditableSec, pType, tKey);
        setActiveTab("section_visual");
      } else if (pType !== "CODE_TEMPLATE") {
        setActiveTab("section_visual");
      }
    } catch (err) {
      console.error(err);
      flashError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, pageId, selectSectionWithContext, flashError, flashWarning, flashInfo]);

  // Execute fetchPageDetails on mount or when pageId/siteId changes
  useEffect(() => {
    let active = true;
    const runFetch = async () => {
      if (active) {
        await fetchPageDetails();
      }
    };
    runFetch();
    return () => {
      active = false;
    };
  }, [pageId, siteId, fetchPageDetails]);

  // Dirty tracking for metadata/SEO changes after initial load completes
  useEffect(() => {
    if (initialLoadDone.current) {
      setIsDirty(true);
      setAutosaveStatus("idle");
    }
  }, [title, slug, seoTitle, seoKeywords, seoDescription, canonicalUrl, ogImage, jsonLd]);

  // Activate dirty tracking after loading finishes
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => {
        initialLoadDone.current = true;
      }, 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleSelectSection = (sec) => selectSectionWithContext(sec);

  // Add Section to Page
  const handleAddSection = async (type, regionKey = "main") => {
    if (!capabilities.canAddSections) return;
    setActionLoading(true);
    try {
      const defaultContent = {};
      if (type === "HERO") {
        defaultContent.title = "Welcome to Our Platform";
        defaultContent.subtitle =
          "Creating high-fidelity digital solutions that work.";
        defaultContent.alignment = "center";
        defaultContent.bgImageMobile = "/images/hero_img_mob.webp";
        defaultContent.bgImageDesktop = "/images/Group-2608466.webp";
      } else if (type === "TEXT_BLOCK") {
        defaultContent.title = "Our Story";
        defaultContent.body =
          "We build systems using clean principles, pure Javascript components, and high-performance databases.";
      } else if (type === "SERVICES") {
        defaultContent.title = "Our Services";
        defaultContent.description =
          "Professional services tailored to help your brand grow.";
      } else if (type === "TESTIMONIALS") {
        defaultContent.title = "Client Feedback";
        defaultContent.description = "Hear directly from our global partners.";
      } else if (type === "FAQ") {
        defaultContent.title = "Frequently Asked Questions";
        defaultContent.description = "Common questions and detailed answers.";
      } else if (type === "BLOGS") {
        defaultContent.title = "Latest Articles & News";
        defaultContent.description =
          "Read our fresh updates, guides, and corporate blog posts.";
      } else if (type === "CONTACT_FORM") {
        defaultContent.title = "Get In Touch";
        defaultContent.description =
          "Fill out the form below and we will get back to you shortly.";
        defaultContent.buttonText = "Send Message";
      } else if (type === "CTA") {
        defaultContent.title = "Ready to get started?";
        defaultContent.subtitle =
          "Contact us today for a free consultation or general inquiry.";
        defaultContent.primaryButtonText = "Contact Us";
        defaultContent.primaryButtonUrl = "/contact";
      } else if (type === "NEWSLETTER") {
        defaultContent.eyebrow = "GET INVOLVED";
        defaultContent.heading = "Get A Health Place Delivered to Your Inbox";
        defaultContent.subtext = "Join our community for weekly tips, inspiring stories, and exclusive resources delivered right to you.";
        defaultContent.placeholder = "Your email address";
        defaultContent.buttonText = "Sign Up";
        defaultContent.footnote = "By signing up you agree to our Terms of Service & Privacy Policy.";
      } else if (type === "MAGAZINE_SHOWCASE") {
        defaultContent.sectionTag = "Our Offerings";
        defaultContent.heading = "The Tools for Real Results";
        defaultContent.description = "Explore our publications designed to inspire and inform.";
        defaultContent.button1Text = "Find Health Services Near Me";
        defaultContent.button2Text = "Shop Our Curated Health Store";
        defaultContent.middleEyebrow = "Hello Health Enthusiasts";
        defaultContent.middleGreeting = "Discover Your Next Read";
        defaultContent.hintText = "Click Below to Preview";
        defaultContent.button3Text = "Check out our latest publication";
      } else if (type === "BLOG_SLIDER") {
        defaultContent.heading = "Explore Categories";
        defaultContent.description = "Browse articles by topic.";
      }

      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, regionKey, content: defaultContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add section");

      const newSection = json.data?.section || json?.section;
      if (newSection) {
        setSections((prev) => [...prev, newSection]);
        handleSelectSection(newSection);
      }

      flashSuccess(`Added ${type} section to '${regionKey}'`);
    } catch (err) {
      flashMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Repair missing slots for CODE_TEMPLATE
  const handleRepairSlots = async () => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}/sections/reconcile`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to repair slots");

      const d = json.data || {};
      const createdCount = d.createdSlots?.length || 0;
      const migratedCount = d.migratedSections?.length || 0;
      const ambiguousCount = d.ambiguousSections?.length || 0;
      const invalidCount = d.invalidSections?.length || 0;

      flashSuccess(`Slots repaired: ${createdCount} created, ${migratedCount} migrated, ${ambiguousCount} ambiguous, ${invalidCount} invalid.`);

      await fetchPageDetails();
      setActiveTab("section_visual");
    } catch (err) {
      flashError(`Error repairing slots: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Save changes to selected section
  const handleSaveSection = async (updatedContent = null) => {
    if (!selectedSection) return;
    setActionLoading(true);

    let contentToSave = updatedContent;
    if (!contentToSave) {
      if (activeTab === "section_json") {
        try {
          contentToSave = JSON.parse(rawJsonContent);
        } catch (e) {
          flashError("Invalid raw JSON format. Please correct it before saving.");
          setActionLoading(false);
          return;
        }
      } else {
        // Build payload from Visual Form Fields
        if (pageType === "CODE_TEMPLATE") {
          // Use the canonicalized templateKey state (already uppercase+trimmed)
          const allowedFields = getAllowedSlotFields(templateKey, selectedSection.regionKey) || [];
          contentToSave = {};
          for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(visualFields, field.key)) {
              contentToSave[field.key] = visualFields[field.key];
            }
          }
        } else if (selectedSection.type === "HERO") {
          contentToSave = {
            ...selectedSection.content,
            badge: visualFields.badge ?? "",
            eyebrow: visualFields.badge ?? "", // sync legacy field
            titleLine1: visualFields.titleLine1 ?? "",
            titleLine2: visualFields.titleLine2 ?? "",
            description: visualFields.description ?? "",
            alignment: visualFields.alignment ?? "center",
            backgroundImage: visualFields.backgroundImage ?? visualFields.backgroundUrl ?? "",
            bgImageMobile: visualFields.bgImageMobile ?? "",
            bgImageDesktop: visualFields.bgImageDesktop ?? "",
            bannerMediaId: visualFields.bannerMediaId ?? "",
            primaryButtonText: visualFields.primaryButtonText ?? "",
            primaryButtonUrl: visualFields.primaryButtonUrl ?? "/",
            secondaryButtonText: visualFields.secondaryButtonText ?? "",
            secondaryButtonUrl: visualFields.secondaryButtonUrl ?? "/",
          };
        } else if (selectedSection.type === "TEXT_BLOCK") {
          contentToSave = {
            ...selectedSection.content,
            title: visualFields.title ?? "",
            body: visualFields.body ?? "",
            imageUrl: visualFields.imageUrl ?? "",
            imageMediaId: visualFields.imageMediaId ?? "",
            imagePosition: visualFields.imagePosition ?? "top",
            buttonText: visualFields.buttonText ?? visualFields.ctaText ?? "",
            buttonUrl: visualFields.buttonUrl ?? visualFields.ctaUrl ?? "/",
          };
        } else if (selectedSection.type === "CTA") {
          contentToSave = {
            title: visualFields.title ?? "",
            subtitle: visualFields.subtitle ?? "",
            primaryButtonText: visualFields.primaryButtonText ?? "",
            primaryButtonUrl: visualFields.primaryButtonUrl ?? "",
          };
        } else {
          contentToSave = {
            ...selectedSection.content,
            ...visualFields
          };
        }
      }
    }

    try {
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/${selectedSection.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentToSave }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        let errorMsg = json.message || json.error || "Failed to save section";
        const unknownFields = json.unknownFields || json.details?.unknownFields;
        const invalidFields = json.invalidFields || json.details?.invalidFields;
        if (unknownFields && unknownFields.length > 0) {
          errorMsg += `\nUnknown fields: ${unknownFields.join(", ")}`;
        }
        if (invalidFields && invalidFields.length > 0) {
          const invalidDetails = invalidFields.map(f => `${f.field}: ${f.reason}`).join("; ");
          errorMsg += `\nInvalid fields: ${invalidDetails}`;
        }
        throw new Error(errorMsg);
      }

      const sec = (json.data || json).section;
      setSections((prev) => prev.map((s) => (s.id === sec.id ? sec : s)));
      selectSectionWithContext(sec, pageType, templateKey);
      setPreviewKey((k) => k + 1);
      flashSuccess("Section content saved successfully!");
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Remove Section
  const handleDeleteSection = async (sec) => {
    if (!capabilities.canDeleteSections) return;
    if (
      !confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/${sec.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete section");

      setSections((prev) => prev.filter((s) => s.id !== sec.id));
      if (selectedSection?.id === sec.id) {
        setSelectedSection(null);
        setActiveTab("page_meta");
      }
      flashSuccess("Section deleted");
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Hide or Show Section
  const handleToggleVisibility = async (sec) => {
    if (!capabilities.canHideSections) return;
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/${sec.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: !sec.isVisible }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to change visibility");

      const s = (json.data || json).section;
      setSections((prev) => prev.map((item) => (item.id === s.id ? s : item)));
      if (selectedSection?.id === sec.id) {
        setSelectedSection(s);
      }
      flashSuccess(s.isVisible ? "Section is now visible" : "Section is now hidden");
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reordering controls
  const handleMoveSection = async (sec, direction) => {
    if (!capabilities.canReorderSections) return;
    // Scope to same region for proper ordering
    const regionSections = sections
      .filter((s) => s.regionKey === sec.regionKey)
      .sort((a, b) => a.order - b.order);
    const currentIndex = regionSections.findIndex((s) => s.id === sec.id);
    if (currentIndex === -1) return;

    let targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= regionSections.length) return;

    setActionLoading(true);
    try {
      // Re-map index sequences within region
      const rearranged = [...regionSections];
      const temp = rearranged[currentIndex];
      rearranged[currentIndex] = rearranged[targetIndex];
      rearranged[targetIndex] = temp;

      const orderedIds = rearranged.map((s) => s.id);
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds, regionKey: sec.regionKey }),
        },
      );
      if (!res.ok) throw new Error("Reordering failed on the server");

      setSections((prev) => {
        const next = [...prev];
        rearranged.forEach((rs, index) => {
          const idx = next.findIndex((n) => n.id === rs.id);
          if (idx !== -1) next[idx] = { ...next[idx], order: index };
        });
        return next;
      });
      flashSuccess("Section order updated");
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveToTop = async (sec) => {
    if (!capabilities.canReorderSections) return;
    setActionLoading(true);
    try {
      const regionSections = sections
        .filter((s) => s.regionKey === sec.regionKey)
        .sort((a, b) => a.order - b.order);
      const orderedIds = [
        sec.id,
        ...regionSections.filter(Boolean).filter((s) => s.id !== sec.id).map((s) => s.id),
      ];
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds, regionKey: sec.regionKey }),
        },
      );
      if (!res.ok) throw new Error("Moving to top failed");

      // Refresh list to pull final DB order
      const sectionsRes = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections`,
      );
      if (sectionsRes.ok) {
        const json = await sectionsRes.json();
        const payload = json.data || json;
        setSections(payload.sections || []);
      }
      flashSuccess("Moved to top");
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Page Settings (Title, Slug, SEO details, JSON-LD, Status)
  const handleSavePageSettings = async (overrideStatus = null) => {
    if (!canSavePageMeta) return;
    const { payload, error } = buildPageMetaPayload(overrideStatus);
    if (error) {
      flashError(error);
      return;
    }
    if (!payload || Object.keys(payload).length === 0) {
      flashWarning("No editable fields permitted to save.");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update page settings");
      }

      if (overrideStatus) {
        setStatus(overrideStatus);
        flashSuccess(`Page status toggled to: ${overrideStatus}`);
      } else {
        flashSuccess("Page settings & SEO saved successfully!");
      }
      setPreviewKey((k) => k + 1);
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Explicitly Set Publish Status
  const handleSetPublishStatus = async (isPublishing) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: isPublishing }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update page status");
      }
      const newStatus = isPublishing ? "PUBLISHED" : "DRAFT";
      setStatus(json.page?.status ?? newStatus);
      flashSuccess(isPublishing ? "Page published successfully!" : "Page unpublished (reverted to DRAFT)");
      setPreviewKey((k) => k + 1);
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Duplicate a Section
  const handleDuplicateSection = async (sec) => {
    if (!capabilities.canDuplicateSections) return;
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: sec.type,
          regionKey: sec.regionKey || "main",
          name: sec.name ? `${sec.name} (Copy)` : undefined,
          content: sec.content,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to duplicate section");
      const dupSection = json.data?.section || json?.section;
      if (dupSection) {
        setSections((prev) => [...prev, dupSection]);
      }
      flashSuccess(`Section duplicated`);
    } catch (err) {
      flashError(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Drag-and-drop reorder handlers (native HTML5)
  const handleDragStart = (e, index) => {
    if (!capabilities.canReorderSections) return;
    setDragSrcIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    if (!capabilities.canReorderSections) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, dropIndex) => {
    if (!capabilities.canReorderSections) return;
    e.preventDefault();
    if (dragSrcIndex === null || dragSrcIndex === dropIndex) {
      setDragSrcIndex(null);
      return;
    }
    const reordered = [...sections];
    const [moved] = reordered.splice(dragSrcIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setDragSrcIndex(null);
    setSections(reordered.map((s, i) => ({ ...s, order: i })));

    // Persist new order — must pass regionKey so the API enforces reorderable constraint
    const droppedRegionKey = moved.regionKey || "main";
    try {
      const orderedIds = reordered.filter(s => s.regionKey === droppedRegionKey).map((s) => s.id);
      const res = await fetchWithAuth(
        `/api/dashboard/pages/${pageId}/sections/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds, regionKey: droppedRegionKey }),
        },
      );
      if (!res.ok) throw new Error("Reorder save failed");
      flashMessage("Section order saved");
    } catch (err) {
      console.error(err);
      flashMessage("Reorder save failed — please refresh");
    }
  };

  // Media Library Attachment — uses real siteId from props (no hardcoded "AHP")
  const handleOpenMediaPicker = (targetField) => {
    setPickerTargetField(targetField);
    setShowMediaPicker(true);
    if (mediaList.length > 0) return;

    setMediaLoading(true);
    // fetchWithAuth already injects the x-site-id header from the siteId prop
    fetchWithAuth(`/api/media`)
      .then((r) => r.json())
      .then((json) => {
        setMediaList(
          Array.isArray(json?.data?.media)
            ? json.data.media
            : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json?.media)
                ? json.media
                : Array.isArray(json)
                  ? json
                  : []
        );
      })
      .catch((err) => console.error("Error fetching media library:", err))
      .finally(() => setMediaLoading(false));
  };

  const handleSelectMedia = (media) => {
    const url = media.secureUrl || media.url;
    if (pickerTargetField === "ogImage") {
      setOgImage(url);
    } else {
      setVisualFields((prev) => ({
        ...prev,
        [pickerTargetField]: url,
      }));
    }
    setShowMediaPicker(false);
  };

  const normalizePreviewBaseUrl = (value) => {
    const fallback = "http://localhost:3001";
    const raw = (value || fallback).trim();
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    return withProtocol.replace(/\/+$/, "");
  };

  const previewBaseUrl = normalizePreviewBaseUrl(frontendUrl);
  const previewPath = slug ? `/${slug.replace(/^\/+/, "")}` : "/";
  const livePreviewUrl = `/api/dashboard/pages/${pageId}/preview?key=${previewKey}`;
  const previewDisplayHost = (() => {
    try {
      return new URL(previewBaseUrl).host;
    } catch {
      return previewBaseUrl.replace(/^https?:\/\//i, "");
    }
  })();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Save indicator / Flash alerts — typed notification system */}
      {message && (() => {
        const msgObj = typeof message === "object" ? message : { type: "success", text: message };
        const styles = {
          success: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300",
          error:   "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-300",
          warning: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300",
          info:    "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300",
        };
        const icons = {
          success: <CheckCircle size={16} />,
          error:   <X size={16} />,
          warning: <AlertTriangle size={16} />,
          info:    <HelpCircle size={16} />,
        };
        const cls = styles[msgObj.type] || styles.success;
        return (
          <div className={`fixed top-4 right-4 z-50 flex gap-2.5 p-3.5 border rounded-lg text-xs font-semibold shadow-md animate-in fade-in duration-200 max-w-sm ${cls}`}>
            {icons[msgObj.type] || icons.success}
            <span>{msgObj.text}</span>
          </div>
        );
      })()}



      {/* Editor top action strip */}
      <div className="sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 gap-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm admin-topbar-sticky">
        <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {mode === 'template' ? `Editing ${resolveTemplateConfig(templateKey)?.name || title} Template` : title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-slate-400 font-mono mt-0.5">
                <span>{slug || "/"}</span>
                {pageType === "CODE_TEMPLATE" && (
                  <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded uppercase font-bold tracking-wider" style={{ fontSize: "8px" }}>
                    TEMPLATE
                  </span>
                )}
                {pageType === "SYSTEM" && (
                  <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded uppercase font-bold tracking-wider" style={{ fontSize: "8px" }}>
                    SYSTEM
                  </span>
                )}
                {isContentReadOnly && pageType !== "SYSTEM" && (
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded uppercase font-bold tracking-wider flex items-center gap-0.5" style={{ fontSize: "8px" }}>
                    <ShieldAlert size={8} /> READ ONLY
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          {/* Autosave indicator */}
          {!isContentReadOnly && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-slate-400">
              {autosaveStatus === "saving" && (
                <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Saving…</>
              )}
              {autosaveStatus === "saved" && (
                <><CheckCircle size={10} className="text-emerald-500" /> Saved {formatSavedAgo(lastSavedAt)}</>
              )}
              {autosaveStatus === "error" && (
                <><AlertTriangle size={10} className="text-red-500" /> Save Failed</>
              )}
              {autosaveStatus === "idle" && isDirty && (
                <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unsaved (Ctrl+S)</>
              )}
              {autosaveStatus === "idle" && !isDirty && lastSavedAt && (
                <><CheckCircle size={10} className="text-emerald-500" /> Saved {formatSavedAgo(lastSavedAt)}</>
              )}
            </div>
          )}

          {canSavePageMeta && (
            <button
              type="button"
              onClick={() => handleSavePageSettings()}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg shadow-sm transition disabled:opacity-50 font-bold text-[11px]"
              style={{ background: "var(--admin-accent, #0f7c85)" }}
            >
              <Save size={12} />
              {activeTab === "page_meta" ? "Save Meta" : "Save Section"}
            </button>
          )}

          {!capabilities.canPublish ? (
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-slate-400">
              Publishing N/A
            </div>
          ) : !canCurrentUserPublish ? (
            <div className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Admin review required
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {status === "PUBLISHED" ? (
                <button
                  type="button"
                  onClick={() => handleSetPublishStatus(false)}
                  disabled={actionLoading}
                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-md transition text-[10px] font-bold"
                >
                  Unpublish
                </button>
              ) : (
                <span className="px-2 py-1 text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700">DRAFT</span>
              )}
              <button
                type="button"
                onClick={() => handleSetPublishStatus(true)}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition text-[11px] font-bold"
              >
                <CheckCircle size={12} /> Publish
              </button>
            </div>
          )}

          <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            title="Version History"
            onClick={async () => {
              setShowVersionHistory(true);
              setVersionsLoading(true);
              setSelectedVersionData(null);
              try {
                const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}/versions`);
                const json = await res.json();
                if (json.data?.versions) {
                  setVersions(json.data.versions);
                }
              } catch (err) {
                console.error("Failed to load versions:", err);
              } finally {
                setVersionsLoading(false);
              }
            }}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
          >
            <Clock size={16} />
          </button>
        </div>
      </div>

      {/* Editor Split Grid Pane */}
      <div className="p-4 md:p-6 space-y-6 flex-1 w-full min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left Side: Layout Sections Tree */}
          <div className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 rounded-xl xl:overflow-y-auto xl:sticky xl:top-[85px] xl:max-h-[calc(100vh-100px)] space-y-4 shadow-sm xl:z-20">
          {capabilities.canAddSections && (
            <select
              onChange={(e) => { if (e.target.value) handleAddSection(e.target.value, "main"); e.target.value = ""; }}
              defaultValue=""
              className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500 cursor-pointer shadow-sm font-bold text-[11px]"
            >
              <option value="" disabled>+ Add Section Component</option>
              <option value="HERO">Hero Banner</option>
              <option value="TEXT_BLOCK">Rich Text</option>
              <option value="SERVICES">Services</option>
              <option value="TEAM">Team</option>
              <option value="TESTIMONIALS">Testimonials</option>
              <option value="FAQ">FAQ</option>
              <option value="CTA">CTA Button</option>
              <option value="BLOGS">Articles &amp; Blogs</option>
              <option value="CONTACT_FORM">Contact Form</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="MAGAZINE_SHOWCASE">Magazine</option>
              <option value="BLOG_SLIDER">Blog Slider</option>
            </select>
          )}
          <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Sliders size={14} style={{ color: "var(--admin-accent, #0f7c85)" }} />
            Page Section Tree ({sections.length})
          </h3>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
              Loading elements...
            </div>
          ) : pageType === "CODE_TEMPLATE" ? (() => {
            const slotDefs = getTemplateSlotDefinitions(templateKey);
            return (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 overflow-x-hidden">
                {slotDefs.map((slot, idx) => {
                  const sec = sections.find(s => s.regionKey === slot.key && !s.isDeleted);
                  return (
                    <div key={slot.key}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-[2px]" style={{ color: "var(--admin-accent, #0f7c85)" }}>{slot.label}</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-[9px] text-gray-400 font-mono">
                          Slot
                        </span>
                      </div>
                      {sec ? (
                        <div
                          onClick={() => handleSelectSection(sec)}
                          className={`border p-3.5 rounded-lg cursor-pointer transition flex flex-col gap-2 hover:shadow-sm ${selectedSection?.id === sec.id
                            ? "border-teal-600 bg-teal-50/20 dark:bg-teal-950/20 shadow-sm"
                            : "border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900"
                            }`}
                          style={selectedSection?.id === sec.id ? { borderColor: "var(--admin-accent, #0f7c85)" } : {}}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold tracking-wider">
                              {sec.type}
                            </span>
                            <div className="flex items-center gap-1">
                              {!sec.isVisible && <EyeOff size={10} className="text-gray-400 dark:text-slate-500" />}
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                #{sec.id.slice(0, 6)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate font-semibold">
                            {sec.content?.title ||
                              sec.content?.body ||
                              sec.content?.heading ||
                              sec.content?.description ||
                              "— (No text contents)"}
                          </p>
                        </div>
                      ) : slot.source === "PAGE_SECTION" ? (
                        <div className="py-3 px-4 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 border-dashed rounded-lg">
                          <span className="flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Missing &quot;{slot.label}&quot; slot
                          </span>
                          <button
                            onClick={handleRepairSlots}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-sm transition"
                          >
                            Repair
                          </button>
                        </div>
                      ) : (
                        <div className="py-3 px-4 text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 border-dashed rounded-lg space-y-1">
                          <div className="font-bold uppercase tracking-wider">{slot.label} (Read-Only)</div>
                          <div>Data bound from: <code>{slot.source}</code></div>
                          {slot.editorLink && (
                            <a href={slot.editorLink} className="text-indigo-600 dark:text-indigo-400 hover:underline">Manage globally &rarr;</a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })() : sections.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 dark:text-slate-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
              <p>No section blocks present.</p>
              <p className="text-[10px]">
                Select a type from the top dropdown to start building.
              </p>
            </div>
          ) : (() => {

            // CMS_BUILT LOGIC
            const templateConfig = resolveTemplateConfig(templateKey);
            const regionKeys = templateConfig
              ? Object.keys(templateConfig.regions)
              : [...new Set(sections.map(s => s.regionKey || "main"))];

            return (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {regionKeys.map(rKey => {
                  const regionSections = sections
                    .filter(Boolean)
                    .filter(s => (s.regionKey || "main") === rKey)
                    .sort((a, b) => a.order - b.order);
                  const regionConfig = templateConfig?.regions?.[rKey];
                  const regionLabel = regionConfig?.label || rKey;

                  return (
                    <div key={rKey}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-[2px] text-indigo-500">{regionLabel}</span>
                        <div className="flex-1 h-px bg-indigo-100" />
                        {regionConfig && (
                          <span className="text-[9px] text-gray-400 font-mono">
                            {regionSections.length}/{regionConfig.maxItems ?? "∞"}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {regionSections.length === 0 ? (
                          <div className="py-3 text-center text-[10px] text-gray-400 border border-dashed rounded-lg">Empty region</div>
                        ) : regionSections.map((sec, secIdx) => {
                          const secGlobalIdx = sections.filter(Boolean).indexOf(sec);
                          // Compute per-section capabilities from template
                          const isHideable = regionConfig?.hideable !== false;
                          const isDeletable = regionConfig?.deletable !== false;
                          const isReorderable = regionConfig?.reorderable !== false;
                          const canShowSectionActions =
                            (capabilities.canHideSections && isHideable) ||
                            capabilities.canDuplicateSections ||
                            (capabilities.canDeleteSections && isDeletable) ||
                            (capabilities.canReorderSections && isReorderable);
                          const isFirstInRegion = secIdx === 0;
                          const isLastInRegion = secIdx === regionSections.length - 1;

                          return (
                            <div
                              key={sec.id}
                              draggable={capabilities.canReorderSections && isReorderable}
                              onDragStart={(e) => handleDragStart(e, secGlobalIdx)}
                              onDragOver={(e) => handleDragOver(e, secGlobalIdx)}
                              onDrop={(e) => handleDrop(e, secGlobalIdx)}
                              onDragEnd={() => setDragSrcIndex(null)}
                              onClick={() => handleSelectSection(sec)}
                              className={`border p-3.5 rounded-lg cursor-pointer transition flex flex-col gap-2 hover:shadow-sm ${dragSrcIndex === secGlobalIdx
                                ? "opacity-40 ring-2 ring-indigo-300"
                                : ""
                                } ${selectedSection?.id === sec.id
                                  ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/20 shadow-sm"
                                  : "border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900"
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold tracking-wider">
                                  {sec.type}
                                </span>
                                <div className="flex items-center gap-1">
                                  {!sec.isVisible && <EyeOff size={10} className="text-gray-400 dark:text-slate-500" />}
                                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                    #{sec.id.slice(0, 6)}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate font-semibold">
                                {sec.content?.title ||
                                  sec.content?.body ||
                                  "— (No text contents)"}
                              </p>

                              {canShowSectionActions && (
                                <div className="flex items-center justify-between border-t pt-2 mt-1 gap-1 text-gray-500">
                                  <div className="flex items-center gap-1">
                                    {capabilities.canReorderSections && isReorderable && (
                                      <span
                                        title="Drag to reorder"
                                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none px-0.5"
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        ⠿
                                      </span>
                                    )}

                                    {capabilities.canHideSections && isHideable && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleVisibility(sec);
                                        }}
                                        className={`p-1 rounded hover:bg-gray-100 ${sec.isVisible ? "text-indigo-600" : "text-gray-400"}`}
                                        title={sec.isVisible ? "Hide section" : "Show section"}
                                      >
                                        {sec.isVisible ? (
                                          <Eye size={12} />
                                        ) : (
                                          <EyeOff size={12} />
                                        )}
                                      </button>
                                    )}

                                    {capabilities.canDuplicateSections && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicateSection(sec);
                                        }}
                                        className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition"
                                        title="Duplicate section"
                                      >
                                        <RefreshCw size={11} />
                                      </button>
                                    )}

                                    {capabilities.canDeleteSections && isDeletable && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSection(sec);
                                        }}
                                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                                        title="Delete section"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>

                                  {capabilities.canReorderSections && isReorderable && (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        disabled={isFirstInRegion}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveSection(sec, "up");
                                        }}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                                        title="Move Up"
                                      >
                                        <ArrowUp size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLastInRegion}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveSection(sec, "down");
                                        }}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                                        title="Move Down"
                                      >
                                        <ArrowDown size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isFirstInRegion}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveToTop(sec);
                                        }}
                                        className="p-1 rounded hover:bg-gray-100 text-indigo-600 disabled:opacity-30"
                                        title="Bring to Top"
                                      >
                                        <ArrowUpCircle size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Right Side: Tabbed Section Content Editing Panel */}
        <div className="p-6 space-y-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm min-w-0">
          {isDynamicPattern && (
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-purple-600 h-6 w-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-purple-900">Dynamic Route Pattern</h3>
                  <p className="text-xs text-purple-700 mt-1">
                    This page represents a dynamic route pattern (e.g., <code>{slug}</code>).
                    It acts as a template for database-driven content. You cannot edit it directly here.
                    Please manage these records from their respective feature dashboard (e.g., Blogs, Services).
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isDynamicPattern && (
            <>
              {/* Sub-tab Selection */}
              <div className="flex bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-1 text-xs font-bold text-gray-500 dark:text-slate-400">
                {capabilities.canEditContent && (
                  <button
                    onClick={() => {
                      if (!selectedSection) {
                        let firstEditableSec = null;
                        if (pageType === "CODE_TEMPLATE") {
                          const editableRegionKeys = getEditableRegionKeys(templateKey);
                          firstEditableSec = sections.find(s => editableRegionKeys.includes(s.regionKey)) || sections[0];
                        } else {
                          firstEditableSec = sections.find(s => s.isVisible !== false) || sections[0];
                        }
                        if (firstEditableSec) {
                          selectSectionWithContext(firstEditableSec, pageType, templateKey);
                        }
                      }
                      setActiveTab("section_visual");
                    }}
                    className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1.5 ${activeTab === "section_visual"
                      ? "bg-white text-indigo-600 font-bold shadow-sm"
                      : "hover:text-gray-900"
                      }`}
                  >
                    <Sliders size={14} />
                    Content Fields
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("page_meta")}
                  className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1.5 ${activeTab === "page_meta"
                    ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm"
                    : "hover:text-gray-900 dark:hover:text-slate-200"
                    }`}
                >
                  <Settings size={14} />
                  Page Details &amp; SEO
                </button>

                {pageType !== "CODE_TEMPLATE" && (
                  <button
                    onClick={() => {
                      if (!selectedSection) {
                        flashMessage("Select a section from the tree first.");
                        return;
                      }
                      setActiveTab("section_json");
                    }}
                    disabled={!selectedSection}
                    className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1.5 ${!selectedSection ? "opacity-75 cursor-not-allowed text-gray-400" : ""
                      } ${activeTab === "section_json"
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "hover:text-gray-900  dark:hover:text-white"
                      }`}
                  >
                    <Code size={14} />
                    Source JSON
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("help")}
                  className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1.5 ${activeTab === "help"
                    ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                    : "hover:text-gray-900  dark:hover:text-white"
                    }`}
                >
                  <HelpCircle size={14} />
                  Editor Guide
                </button>
              </div>

              {/* TAB 1: Page details settings */}
              {activeTab === "page_meta" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                    Page Metadata & Configurations
                  </h3>
                  {/* Notice banner for CODE_TEMPLATE */}
                  {pageType === "CODE_TEMPLATE" && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                      <span>Page identity, route, and structure are managed by the code template. SEO settings and content data remain editable.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Page Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isMetadataReadOnly}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Route Slug Path
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        disabled={isSlugReadOnly}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs font-mono outline-none focus:border-indigo-600 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        SEO Title
                      </label>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        disabled={isSeoReadOnly}
                        placeholder="Search results title header"
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Meta Keywords / Tags
                      </label>
                      <input
                        type="text"
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        disabled={isSeoReadOnly}
                        placeholder="e.g. health, wellness, nutrition"
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      SEO Description
                    </label>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      disabled={isSeoReadOnly}
                      placeholder="Short description snippet of page contents for google indexing"
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 h-20 resize-none disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Canonical URL
                      </label>
                      <input
                        type="text"
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        disabled={isSeoReadOnly}
                        placeholder="e.g. https://yourdomain.com/about"
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        OG Image URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ogImage}
                          onChange={(e) => setOgImage(e.target.value)}
                          disabled={isSeoReadOnly}
                          placeholder="e.g. https://yourdomain.com/og.jpg"
                          className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs font-mono outline-none focus:border-indigo-600 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                        />
                        {!isSeoReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleOpenMediaPicker("ogImage")}
                            className="px-3.5 py-2 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 transition flex items-center gap-1"
                          >
                            <ImageIcon size={12} />
                            Library
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      JSON-LD Structured Data Schema
                    </label>
                    <textarea
                      value={jsonLd}
                      onChange={(e) => setJsonLd(e.target.value)}
                      disabled={isSeoReadOnly}
                      placeholder='{ "@context": "https://schema.org", "@type": "WebPage", ... }'
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs font-mono outline-none focus:border-indigo-600 h-32 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500"
                    />
                  </div>

                  {/* Save button: available whenever metadata or SEO can be edited */}
                  {(capabilities.canEditMetadata || capabilities.canEditSeo) && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSavePageSettings()}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                      >
                        <Save size={12} />
                        Save SEO &amp; Page Settings
                      </button>
                    </div>
                  )}

                  {/* Visibility & Danger Zone */}
                  {capabilities.canDisable && (
                    <div className="border border-red-200 rounded-xl p-4 space-y-4 mt-2">
                      <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert size={13} /> Page Visibility &amp; Danger Zone
                      </h4>

                      <div className="flex flex-col gap-3">
                        {/* isEnabled toggle */}
                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <span className="text-xs font-semibold text-gray-800">Page Enabled</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">When disabled, the page returns a 404 to public visitors.</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const next = !isEnabled;
                              setIsEnabled(next);
                              try {
                                const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ isEnabled: next }),
                                });
                                if (!res.ok) throw new Error("Failed");
                                flashMessage(next ? "Page enabled" : "Page disabled — visitors will see 404");
                              } catch (err) {
                                setIsEnabled(!next);
                                flashMessage(`Error: ${err.message}`);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-6" : "translate-x-1"
                              }`} />
                          </button>
                        </label>

                        {/* showInNav toggle */}
                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <span className="text-xs font-semibold text-gray-800">Show in Navigation</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">Controls whether this page appears in auto-generated nav menus.</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const next = !showInNav;
                              setShowInNav(next);
                              try {
                                const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ showInNav: next }),
                                });
                                if (!res.ok) throw new Error("Failed");
                                flashMessage(next ? "Page shown in nav" : "Page hidden from nav");
                              } catch (err) {
                                setShowInNav(!next);
                                flashMessage(`Error: ${err.message}`);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showInNav ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showInNav ? "translate-x-6" : "translate-x-1"
                              }`} />
                          </button>
                        </label>

                        {/* Soft-delete */}
                        {(userRole === "SUPERADMIN" || userRole === "ADMIN") && (
                          <div className="pt-2 border-t border-red-100">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`Permanently soft-delete "${title}"? It will be hidden from the site. An admin can restore it later.`)) return;
                                setActionLoading(true);
                                try {
                                  const res = await fetchWithAuth(`/api/dashboard/pages/${pageId}`, { method: "DELETE" });
                                  if (!res.ok) {
                                    const j = await res.json();
                                    throw new Error(j.error || "Failed to delete page");
                                  }
                                  flashMessage("Page deleted. Redirecting…");
                                  setTimeout(() => { window.location.href = "/dashboard/pages"; }, 1500);
                                } catch (err) {
                                  flashMessage(`Error: ${err.message}`);
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              disabled={actionLoading}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                            >
                              <Trash2 size={12} /> Delete This Page
                            </button>
                            <p className="text-[10px] text-red-400 mt-1.5">This page will be soft-deleted and can be restored from the Pages list.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Visual Content Form Editor */}
              {activeTab === "section_visual" && (!selectedSection ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl space-y-3 bg-gray-50/50 dark:bg-slate-900/50">
                  <AlertTriangle size={24} className="mx-auto text-amber-500" />
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">No Section Currently Selected</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    Select an editable section from the left Page Section Tree to edit its content fields.
                    {pageType === "CODE_TEMPLATE" && " If section slots are missing, click Repair below to initialize them."}
                  </p>
                  {pageType === "CODE_TEMPLATE" && (
                    <button
                      onClick={handleRepairSlots}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition inline-flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} /> Repair Editable Fields
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--admin-accent, #0f7c85)" }}>
                        <span>Content Fields &bull; {selectedSection.regionKey || selectedSection.type}</span>
                        <span className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded font-mono font-semibold">
                          Type: {selectedSection.type}
                        </span>
                      </h3>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                      ID: {selectedSection.id}
                    </span>
                  </div>

                  {isContentReadOnly && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 rounded-lg text-[11px] font-medium leading-relaxed flex items-center gap-2">
                      <AlertTriangle
                        className="text-amber-600 dark:text-amber-400 shrink-0"
                        size={16}
                      />
                      <span>Visual layout and section contents are read-only.</span>
                    </div>
                  )}

                  <fieldset disabled={isContentReadOnly} className="space-y-4">
                    {/* Conditionally render form fields based on Section Type */}
                    {(() => {
                      const isCodeTemplate = pageType === "CODE_TEMPLATE";
                      if (isCodeTemplate) {
                        // Use canonicalized templateKey (already uppercase+trimmed in state)
                        const regionDef = getContractRegion(templateKey, selectedSection.regionKey);

                        // Unknown template key — show clear diagnostic with page/template info
                        if (!regionDef && templateKey) {
                          const knownTemplates = ["HOME", "ABOUT", "CONTACT", "SERVICES", "BLOGS"];
                          return (
                            <div className="p-4 border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 rounded-xl space-y-2 text-xs">
                              <h4 className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                                <AlertTriangle size={14} /> Unknown Template Configuration
                              </h4>
                              <div className="space-y-1 text-rose-700 dark:text-rose-400 font-mono text-[11px]">
                                <div>Page ID: <strong>{pageId}</strong></div>
                                <div>Page Type: <strong>{pageType}</strong></div>
                                <div>Stored Template Key: <strong>{templateKey}</strong></div>
                                <div>Region Key: <strong>{selectedSection.regionKey}</strong></div>
                              </div>
                              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                                Template key &quot;{templateKey}&quot; is not in the contract registry. Known templates: {knownTemplates.join(", ")}.
                                Use Repair to reconcile sections, or check the templateKey in the database.
                              </p>
                              <button
                                onClick={handleRepairSlots}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded shadow-sm transition inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <RefreshCw size={12} /> Attempt Repair
                              </button>
                            </div>
                          );
                        }

                        if (regionDef && regionDef.source !== "PAGE_SECTION") {
                          return (
                            <div className="p-4 border border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl space-y-2 text-xs text-blue-900 dark:text-blue-200">
                              <h4 className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                                <HelpCircle size={14} /> Non-Page Section Region ({regionDef.source})
                              </h4>
                              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                {regionDef.source === "ENTITY" && `This section is owned by an entity module (${regionDef.label}). Edit its content in the dedicated Entity Dashboard.`}
                                {regionDef.source === "GLOBAL_SETTINGS" && "This section is configured globally via Global Settings."}
                                {regionDef.source === "SYSTEM" && "This section is a System region and is read-only."}
                                {regionDef.source === "UNBOUND" && "This region is not currently bound to rendered page output."}
                              </p>
                              {regionDef.editorLink && (
                                <a href={regionDef.editorLink} className="inline-block font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]">
                                  Go to Global Owner Editor &rarr;
                                </a>
                              )}
                            </div>
                          );
                        }

                        const allowedFields = getAllowedSlotFields(templateKey, selectedSection.regionKey);
                        if (!allowedFields || allowedFields.length === 0) {
                          return (
                            <div className="p-4 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-xl space-y-2 text-xs">
                              <h4 className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                <AlertTriangle size={14} /> Section Configuration Notice
                              </h4>
                              <div className="space-y-1 text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                                <div>Page ID: <strong>{pageId}</strong></div>
                                <div>Page Type: <strong>{pageType}</strong></div>
                                <div>Stored Template Key: <strong>{templateKey}</strong></div>
                                <div>Region Key: <strong>{selectedSection.regionKey}</strong></div>
                              </div>
                              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                Region &quot;{selectedSection.regionKey}&quot; under template &quot;{templateKey}&quot; has no editable PAGE_SECTION fields configured in the contract.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-4">
                            {allowedFields.map(field => {
                              const value = visualFields[field.key];

                              if (field.type === "image") {
                                return (
                                  <div key={field.key}>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={value || ""}
                                        onChange={(e) => setVisualFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                        placeholder="https://..."
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleOpenMediaPicker(field.key)}
                                        className="px-3.5 py-2 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 transition flex items-center gap-1"
                                      >
                                        <ImageIcon size={12} />
                                        Library
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              if (field.type === "textarea" || field.type === "multiline-text") {
                                return (
                                  <div key={field.key}>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </label>
                                    <textarea
                                      value={value || ""}
                                      onChange={(e) => setVisualFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 min-h-[80px]"
                                    />
                                  </div>
                                );
                              }

                              if (field.type === "string-list") {
                                const list = Array.isArray(value) ? value : [];
                                return (
                                  <div key={field.key} className="border border-gray-200 dark:border-slate-600 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 space-y-2">
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </label>
                                    {list.map((item, idx) => (
                                      <div key={idx} className="flex gap-2">
                                        <div className="flex flex-col gap-1 justify-center">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => {
                                              const newList = [...list];
                                              [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
                                              setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                            <ArrowUp size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === list.length - 1}
                                            onClick={() => {
                                              const newList = [...list];
                                              [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
                                              setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                            <ArrowDown size={12} />
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={item}
                                          onChange={(e) => {
                                            const newList = [...list];
                                            newList[idx] = e.target.value;
                                            setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                          }}
                                          className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newList = list.filter((_, i) => i !== idx);
                                            setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                          }}
                                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setVisualFields(prev => ({ ...prev, [field.key]: [...list, ""] }))}
                                      className="text-xs text-indigo-600 font-bold flex items-center gap-1 mt-1"
                                    >
                                      <Plus size={12} /> Add Item
                                    </button>
                                  </div>
                                );
                              }

                              if (field.type === "object-list") {
                                const list = Array.isArray(value) ? value : [];
                                return (
                                  <div key={field.key} className="border border-gray-200 dark:border-slate-600 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 space-y-3">
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </label>
                                    {list.map((item, idx) => (
                                      <div key={idx} className="border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 rounded-lg relative space-y-3 shadow-sm">
                                        <div className="absolute top-2 right-10 flex gap-1">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => {
                                              const newList = [...list];
                                              [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
                                              setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                            }}
                                            className="p-1.5 rounded transition text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                            <ArrowUp size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === list.length - 1}
                                            onClick={() => {
                                              const newList = [...list];
                                              [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
                                              setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                            }}
                                            className="p-1.5 rounded transition text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                                          >
                                            <ArrowDown size={12} />
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newList = list.filter((_, i) => i !== idx);
                                            setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                          }}
                                          className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Item {idx + 1}</div>
                                        {field.itemFields?.map(subField => {
                                          const subValue = item[subField.key] || "";
                                          return (
                                            <div key={subField.key}>
                                              <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-1">{subField.label}</label>
                                              {subField.type === "textarea" ? (
                                                <textarea
                                                  value={subValue}
                                                  onChange={(e) => {
                                                    const newList = [...list];
                                                    newList[idx] = { ...newList[idx], [subField.key]: e.target.value };
                                                    setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                                  }}
                                                  className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-2 text-xs outline-none focus:border-indigo-600 min-h-[60px]"
                                                />
                                              ) : (
                                                <input
                                                  type="text"
                                                  value={subValue}
                                                  onChange={(e) => {
                                                    const newList = [...list];
                                                    newList[idx] = { ...newList[idx], [subField.key]: e.target.value };
                                                    setVisualFields(prev => ({ ...prev, [field.key]: newList }));
                                                  }}
                                                  className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-2 text-xs outline-none focus:border-indigo-600"
                                                />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItem = {};
                                        field.itemFields?.forEach(f => newItem[f.key] = "");
                                        setVisualFields(prev => ({ ...prev, [field.key]: [...list, newItem] }));
                                      }}
                                      className="text-xs text-indigo-600 font-bold flex items-center gap-1 mt-1 hover:text-indigo-700 transition"
                                    >
                                      <Plus size={12} /> Add Item
                                    </button>
                                  </div>
                                );
                              }

                              if (field.type === "boolean") {
                                return (
                                  <div key={field.key} className="flex items-center justify-between border border-gray-200 dark:border-slate-600 p-3 rounded-lg bg-gray-50/50 dark:bg-slate-800/50">
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">{field.label}</label>
                                      {field.validation?.hint && <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{field.validation.hint}</p>}
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={value === true}
                                      onChange={(e) => setVisualFields(prev => ({ ...prev, [field.key]: e.target.checked }))}
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div key={field.key}>
                                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                    {field.label}
                                  </label>
                                  {field.validation?.hint && <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1">{field.validation.hint}</p>}
                                  <input
                                    type={field.type === "number" ? "number" : field.type === "url" ? "text" : "text"}
                                    value={value || ""}
                                    onChange={(e) => {
                                      const val = field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value;
                                      setVisualFields(prev => ({ ...prev, [field.key]: val }));
                                    }}
                                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <React.Fragment>
                          {selectedSection.type === "HERO" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Badge / Eyebrow
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.badge || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        badge: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    First Title Line
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.titleLine1 || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        titleLine1: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Second Title Line
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.titleLine2 || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        titleLine2: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={visualFields.description || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 min-h-[80px]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Primary Button Text
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.primaryButtonText || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        primaryButtonText: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Primary Button URL
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.primaryButtonUrl || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        primaryButtonUrl: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Secondary Button Text
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.secondaryButtonText || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        secondaryButtonText: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Secondary Button URL
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.secondaryButtonUrl || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        secondaryButtonUrl: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Background Image URL
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={visualFields.backgroundImage || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        backgroundImage: e.target.value,
                                      }))
                                    }
                                    className="flex-1 rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                    placeholder="https://..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMediaPicker("backgroundImage")}
                                    className="px-3.5 py-2 border rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-650 transition flex items-center gap-1"
                                  >
                                    <ImageIcon size={12} />
                                    Library
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedSection.type === "TEXT_BLOCK" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Text Block Header
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.title || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                    placeholder="Section Title"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Image Position
                                  </label>
                                  <select
                                    value={visualFields.imagePosition || "top"}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        imagePosition: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 outline-none focus:border-indigo-600"
                                  >
                                    <option value="top">Image Stacked on Top</option>
                                    <option value="left">Image Positioned Left</option>
                                    <option value="right">Image Positioned Right</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Body Text Content
                                </label>
                                <textarea
                                  value={visualFields.body || ""}
                                  onChange={(e) =>
                                    setVisualFields((prev) => ({
                                      ...prev,
                                      body: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 h-32"
                                  placeholder="Write markdown or paragraph content here..."
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Block Media Attachment URL
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={visualFields.imageUrl || ""}
                                      onChange={(e) =>
                                        setVisualFields((prev) => ({
                                          ...prev,
                                          imageUrl: e.target.value,
                                        }))
                                      }
                                      className="flex-1 rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                      placeholder="https://..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMediaPicker("imageUrl")}
                                      className="px-3.5 py-2 border rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-650 transition flex items-center gap-1"
                                    >
                                      <ImageIcon size={12} />
                                      Library
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      CTA Label
                                    </label>
                                    <input
                                      type="text"
                                      value={visualFields.buttonText || ""}
                                      onChange={(e) =>
                                        setVisualFields((prev) => ({
                                          ...prev,
                                          buttonText: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 p-2.5 text-xs font-semibold outline-none focus:border-indigo-600"
                                      placeholder="Read More"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      CTA URL
                                    </label>
                                    <input
                                      type="text"
                                      value={visualFields.buttonUrl || ""}
                                      onChange={(e) =>
                                        setVisualFields((prev) => ({
                                          ...prev,
                                          buttonUrl: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                      placeholder="/details"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedSection.type === "CTA" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    CTA Title
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.title || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                    placeholder="Ready to get started?"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    CTA Subtitle
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.subtitle || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        subtitle: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600"
                                    placeholder="Contact us today for a free consultation or general inquiry."
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Button Text
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.primaryButtonText || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        primaryButtonText: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                    placeholder="Contact Us"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Button URL
                                  </label>
                                  <input
                                    type="text"
                                    value={visualFields.primaryButtonUrl || ""}
                                    onChange={(e) =>
                                      setVisualFields((prev) => ({
                                        ...prev,
                                        primaryButtonUrl: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
                                    placeholder="/contact"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedSection.type !== "HERO" &&
                            selectedSection.type !== "TEXT_BLOCK" &&
                            selectedSection.type !== "CTA" && (
                              <div className="space-y-4">
                                <p className="text-[11px] text-gray-500 leading-relaxed border p-3 rounded-lg bg-gray-50">
                                  💡 This section type is rendered dynamically. Customize
                                  its header title and styling configuration parameters
                                  below.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      Header Title
                                    </label>
                                    <input
                                      type="text"
                                      value={visualFields.title || ""}
                                      onChange={(e) =>
                                        setVisualFields((prev) => ({
                                          ...prev,
                                          title: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                      placeholder="Section Title"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      Description / Subtitle
                                    </label>
                                    <input
                                      type="text"
                                      value={visualFields.description || ""}
                                      onChange={(e) =>
                                        setVisualFields((prev) => ({
                                          ...prev,
                                          description: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600"
                                      placeholder="Subheading explanation"
                                    />
                                  </div>
                                  {selectedSection.type === "CONTACT_FORM" && (
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Button Submit Text
                                      </label>
                                      <input
                                        type="text"
                                        value={visualFields.buttonText || ""}
                                        onChange={(e) =>
                                          setVisualFields((prev) => ({
                                            ...prev,
                                            buttonText: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-indigo-600 font-semibold"
                                        placeholder="Send Message"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </React.Fragment>
                      );
                    })()}

                    <div className="border-t pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveSection()}
                        disabled={actionLoading || isContentReadOnly}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={12} />
                        {actionLoading ? "Saving..." : "Save Section Content"}
                      </button>
                    </div>
                  </fieldset>
                </div>
              ))}

              {/* TAB 3: Raw Source JSON Editor */}
              {activeTab === "section_json" && selectedSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                      Raw JSON content payload
                    </h3>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                      #{selectedSection.id}
                    </span>
                  </div>

                  {isContentReadOnly && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 rounded-lg text-[11px] font-medium leading-relaxed flex items-center gap-2">
                      <AlertTriangle
                        className="text-amber-600 dark:text-amber-400 shrink-0"
                        size={16}
                      />
                      <span>
                        Source JSON is read-only for hardcoded frontend routes.
                      </span>
                    </div>
                  )}

                  <div>
                    <textarea
                      value={rawJsonContent}
                      onChange={(e) => setRawJsonContent(e.target.value)}
                      disabled={isContentReadOnly}
                      className="w-full h-64 rounded-lg border border-gray-200 p-3 text-xs font-mono outline-none focus:border-indigo-600 bg-slate-900 text-slate-100 disabled:opacity-80 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Directly modify the JSON attributes of this section. Ensure
                      syntax remains valid.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSection()}
                      disabled={actionLoading || isContentReadOnly}
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={12} />
                      {actionLoading ? "Saving..." : "Save Raw Source"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: Help Guide */}
              {activeTab === "help" && (
                <div className="space-y-4 text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm border-b border-gray-200 dark:border-slate-700 pb-2">
                    Section Layout Guide
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs">
                        🚀 Hero Section Banner
                      </h4>
                      <p className="mt-0.5">
                        Used at the very top of pages. Focuses on high-contrast
                        headings, CTA redirects, background banner images, and text
                        alignments.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs">
                        📝 Rich Text Block
                      </h4>
                      <p className="mt-0.5">
                        Flexible block used to explain services or publish content.
                        Supports side-by-side images (placed on top, left, or
                        right), titles, paragraphs, and links.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs">
                        📦 Modules (FAQ, Services, Team, Testimonials)
                      </h4>
                      <p className="mt-0.5">
                        Dynamically pulls records from their respective admin
                        dashboards. E.g. placing an FAQ section automatically
                        fetches and structures all active FAQs for this page in
                        schema markup.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live Preview iframe panel */}
      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden min-h-[800px] flex flex-col mx-4 md:mx-6 mb-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 border-b border-gray-200 dark:border-slate-800">
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Monitor size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">Live Preview</span>
            <span className="hidden 2xl:inline-block ml-1.5 text-[9px] font-normal text-gray-500 dark:text-slate-500 normal-case tracking-normal bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              reflects saved content
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            {/* Device toggle */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2 py-1.5 text-[10px] font-bold rounded transition flex items-center gap-1 ${previewDevice === "desktop"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Monitor size={12} />
                <span className="hidden sm:inline">Desk</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2 py-1.5 text-[10px] font-bold rounded transition flex items-center gap-1 ${previewDevice === "mobile"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Smartphone size={12} />
                <span className="hidden sm:inline">Mob</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition shrink-0 shadow-sm dark:shadow-none"
              title="Reload preview"
            >
              <RefreshCw size={11} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Preview frame area */}
        <div className="flex justify-center py-5 px-4 bg-gray-50/50 dark:bg-slate-900/50 flex-1 overflow-y-auto">
          <div
            className={`flex flex-col shadow-2xl transition-all duration-300 bg-white ${previewDevice === "mobile"
              ? "w-[390px] rounded-[2rem] border-[6px] border-gray-900 dark:border-slate-700 ring-1 ring-gray-900/50 dark:ring-slate-600/50 overflow-hidden"
              : "w-full rounded-xl border border-gray-200 dark:border-slate-700/60 overflow-hidden"
              }`}
          >
            {/* Fake browser chrome */}
            <div className="bg-gray-100 dark:bg-slate-800 flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 bg-white dark:bg-slate-700/60 border border-gray-200 dark:border-transparent rounded-md px-2.5 py-1 text-[9px] text-gray-500 dark:text-slate-400 font-mono truncate min-w-0 shadow-inner">
                <span className="text-gray-400 dark:text-slate-500">{previewDisplayHost}</span>
                {previewPath}
                <span className="text-gray-400 dark:text-slate-600 ml-1">· preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300 transition p-0.5 rounded"
                title="Reload"
              >
                <RefreshCw size={10} />
              </button>
            </div>

            {/* The actual iframe */}
            {isDynamicPattern ? (
              <div className="w-full bg-slate-900 border-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center flex-1" style={{ minHeight: "500px" }}>
                <Monitor size={48} className="mb-4 opacity-50" />
                <h4 className="text-sm font-bold text-slate-300 mb-2">Live Preview Unavailable</h4>
                <p className="text-xs max-w-sm leading-relaxed">This page uses a dynamic route pattern. It requires runtime parameters to render and cannot be previewed directly from the editor.</p>
              </div>
            ) : (
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={livePreviewUrl}
                title="Page Preview"
                className="w-full bg-white border-0 flex-1"
                style={{
                  minHeight: previewDevice === "mobile" ? "760px" : "800px",
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Preview auto-refreshes after each save
          </span>
          <button
            type="button"
            onClick={() => {
              window.open(livePreviewUrl, "_blank");
            }}
            className="text-indigo-400 hover:text-indigo-300 transition font-semibold"
          >
            Open full preview ↗
          </button>
        </div>
        </div>
      </div>

      {/* Media Pick overlay modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 md:pt-20">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowMediaPicker(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-4xl p-6 z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3 mb-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                Select Media Asset
              </h3>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
                  <Upload size={14} />
                  Upload Image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMediaLoading(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        // Use fetchWithAuth so the real siteId header is injected (not hardcoded "AHP")
                        const res = await fetchWithAuth("/api/media/upload", {
                          method: "POST",
                          body: formData
                        });
                        if (!res.ok) throw new Error("Upload failed");
                        // Re-fetch media list using the same site-scoped helper
                        const listRes = await fetchWithAuth("/api/media");
                        if (listRes.ok) {
                          const data = await listRes.json();
                          setMediaList(data.data?.media || data.media || []);
                        }
                      } catch (err) {
                        flashError("Upload failed: " + err.message);
                      } finally {
                        setMediaLoading(false);
                      }
                    }}
                  />
                </label>
                <button
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 transition"
                  onClick={() => setShowMediaPicker(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {mediaLoading ? (
              <div className="py-20 text-center text-xs text-gray-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2 flex-1">
                <RefreshCw size={24} className="animate-spin text-gray-300 dark:text-slate-600" />
                Loading media assets...
              </div>
            ) : mediaList.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-500 dark:text-slate-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl flex-1">
                No media assets found. Upload images to the Media Library first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-y-auto pr-1 flex-1 pb-4">
                {mediaList.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMedia(m)}
                    className="border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50/20 dark:bg-slate-900/50 hover:border-indigo-500 hover:shadow-sm cursor-pointer transition flex flex-col gap-2 group"
                  >
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                      <SafeImage
                        src={m.secureUrl || m.url}
                        alt={m.altText || m.fileName || ""}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="200px"
                      />
                    </div>
                    <div className="text-[10px] text-gray-600 dark:text-slate-400 truncate font-semibold">
                      {m.originalName || m.fileName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-slate-700 pt-3 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 transition"
                onClick={() => setShowMediaPicker(false)}
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Version History Modal */}
      {showVersionHistory && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVersionHistory(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-2xl p-6 z-10 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3 mb-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                Version History — {title}
              </h3>
              <button
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 transition"
                onClick={() => {
                  setShowVersionHistory(false);
                  setSelectedVersionData(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            {versionsLoading ? (
              <div className="py-20 text-center text-xs text-gray-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2 flex-1">
                <RefreshCw size={24} className="animate-spin text-gray-300 dark:text-slate-600" />
                Loading versions...
              </div>
            ) : selectedVersionData ? (
              /* Version detail view */
              <div className="flex-1 overflow-y-auto space-y-4">
                <button
                  onClick={() => setSelectedVersionData(null)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  ← Back to list
                </button>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-96 border border-gray-200 dark:border-slate-700">
                  <pre>{JSON.stringify(selectedVersionData, null, 2)}</pre>
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-500 dark:text-slate-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl flex-1">
                No version history found. Versions are saved automatically when
                you create or update this page.
              </div>
            ) : (
              /* Versions list */
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-slate-100 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                          v{v.version}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 ml-3">
                          {new Date(v.createdAt).toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetchWithAuth(
                                `/api/dashboard/pages/${pageId}/versions/${v.id}`,
                              );
                              const json = await res.json();
                              if (json.data?.version) {
                                setSelectedVersionData(json.data.version);
                              }
                            } catch (err) {
                              console.error("Failed to load version:", err);
                            }
                          }}
                          className="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold transition"
                        >
                          View
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                `Restore version v${v.version} from ${new Date(v.createdAt).toLocaleString("en-US")}? Current page data will be replaced.`,
                              )
                            )
                              return;
                            setRestoringVersion(true);
                            try {
                              const res = await fetchWithAuth(
                                `/api/dashboard/pages/${pageId}/versions/${v.id}`,
                                { method: "POST" },
                              );
                              const json = await res.json();
                              if (json.data?.page) {
                                flashMessage(
                                  `✅ Restored version v${v.version}`,
                                );
                                setShowVersionHistory(false);
                                window.location.reload();
                              } else {
                                flashMessage("❌ Failed to restore version");
                              }
                            } catch (err) {
                              console.error("Failed to restore version:", err);
                              flashMessage("❌ Error restoring version");
                            } finally {
                              setRestoringVersion(false);
                            }
                          }}
                          disabled={restoringVersion}
                          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                        >
                          {restoringVersion ? "Restoring..." : "Restore"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
