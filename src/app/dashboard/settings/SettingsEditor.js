"use client";

import { useState } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Layout,
  Search,
  Activity,
  Bot,
  Code,
  Image as ImageIcon,
  Globe,
  Menu,
  Grid,
  Settings,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

// Inline SVG components to ensure compatibility across lucide-react versions
function FacebookIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}

function TwitterIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

function LinkedinIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}

function MapPinIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function PhoneCallIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  );
}
import MediaPickerModal from "@/components/media/MediaPickerModal";

const DEFAULT_QUICK_CARDS = [
  { tag: 'Daily Quiz', icon: '🌅', desc: 'A fresh 5-question wellness check, updated every day.', link: '/quizzes/sleep-quality' },
  { tag: 'Stress Check', icon: '🧠', desc: 'Measure your mental load and unlock targeted breathing guides.', link: '/quizzes/stress-burnout' },
  { tag: 'Nutrition IQ', icon: '🥗', desc: 'Rate your diet quality and get personalised food insights.', link: '/quizzes/nutrition-gut' },
];
const DEFAULT_DEEP_CARDS = [
  { tag: 'Sleep Quality', icon: '🌙', desc: 'Assess your REM cycles, sleep hygiene, and overnight recovery.', link: '/quizzes/sleep-quality' },
  { tag: 'Dosha Discovery', icon: '🌿', desc: 'Uncover your Ayurvedic mind-body constitution in 10 questions.', link: '/quizzes/dosha-body-type' },
  { tag: 'My Dashboard', icon: '📊', desc: 'View all your past quiz scores, insights, and progress reports.', link: '/quizzes/dashboard' },
];

export default function SettingsEditor({ siteId, initialSettings }) {
  const [activeTab, setActiveTab] = useState("brand");

  // Settings States
  const [websiteSettings, setWebsiteSettings] = useState(
    initialSettings?.websiteSettings || {},
  );

  // Homepage wellness banner — lives inside websiteSettings.wellnessBanner
  const [wellnessBanner, setWellnessBanner] = useState(
    initialSettings?.websiteSettings?.wellnessBanner || {
      enabled: true,
      headline: 'Know your body,\nMake better choices.',
      subtext: 'Simple, expert-informed health assessments that help you understand yourself and take the next step with confidence.',
      heroTag: 'Daily Wellness Quiz',
      heroTitle: 'Test yourself today.',
      heroBody: 'Take a quick 5-minute assessment and discover actionable insights about your sleep, stress, nutrition, or Ayurvedic body type — all backed by clinical research.',
      heroPrimaryLabel: 'Browse All Quizzes',
      heroPrimaryLink: '/quizzes',
      heroSecondaryLabel: 'Start Free →',
      heroSecondaryLink: '/quizzes/sleep-quality',
      quickCards: DEFAULT_QUICK_CARDS,
      deepCards: DEFAULT_DEEP_CARDS,
    }
  );
  const [analytics, setAnalytics] = useState(initialSettings?.analytics || {});
  const [scripts, setScripts] = useState(initialSettings?.scripts || {});

  // New Layout & Info Settings States
  const [header, setHeader] = useState(
    initialSettings?.header || {
      sticky: true,
      showSearch: true,
      showSocials: true,
      logoHeight: 40,
      layout: "logo-left",
      bgColor: "#ffffff",
      textColor: "#4a5568",
      announcementBar: {
        enabled: false,
        text: "",
        link: "",
        bgColor: "#2563eb",
        textColor: "#ffffff",
      },
      mobileDrawerStyle: "slide-left",
      mobileDrawerBg: "#ffffff",
      mobileDrawerTextColor: "#1a202c",
    },
  );
  const [footer, setFooter] = useState(
    initialSettings?.footer || {
      layout: "4-columns",
      copyright: `© ${new Date().getFullYear()} Company. All rights reserved.`,
      showNewsletter: true,
    },
  );
  const [contactDetails, setContactDetails] = useState(
    initialSettings?.contactDetails || {
      phone: "",
      email: "",
      address: "",
      operatingHours: "",
      socials: { facebook: "", twitter: "", instagram: "", linkedin: "" },
      mapsUrl: "",
    },
  );

  // UI Loading/Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Media Picker Trigger State
  const [activePickerField, setActivePickerField] = useState(null); // "logo", "favicon", "ogImage"

  const handleWebsiteChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    // Handle nested custom404 fields
    if (name.startsWith("custom404.")) {
      const key = name.split(".")[1];
      setWebsiteSettings((prev) => ({
        ...prev,
        custom404: {
          ...(prev.custom404 || {}),
          [key]: val,
        },
      }));
    } else {
      setWebsiteSettings((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setHeader((prev) => ({ ...prev, [name]: val }));
  };

  const handleFooterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFooter((prev) => ({ ...prev, [name]: val }));
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("socials.")) {
      const socialKey = name.split(".")[1];
      setContactDetails((prev) => ({
        ...prev,
        socials: {
          ...(prev.socials || {}),
          [socialKey]: value,
        },
      }));
    } else {
      setContactDetails((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAnalyticsChange = (e) => {
    const { name, value } = e.target;
    setAnalytics((prev) => ({ ...prev, [name]: value }));
  };

  const handleScriptsChange = (e) => {
    const { name, value } = e.target;
    setScripts((prev) => ({ ...prev, [name]: value }));
  };

  // Media Picker Callback
  const handleMediaSelect = (media) => {
    if (activePickerField === "logo") {
      setWebsiteSettings((prev) => ({ ...prev, logoUrl: media.url }));
    } else if (activePickerField === "favicon") {
      setWebsiteSettings((prev) => ({ ...prev, favicon: media.url }));
    } else if (activePickerField === "ogImage") {
      setWebsiteSettings((prev) => ({ ...prev, ogImageUrl: media.url }));
    } else if (activePickerField === "maintenanceImage") {
      setWebsiteSettings((prev) => ({ ...prev, maintenanceImage: media.url }));
    } else if (activePickerField === "custom404Image") {
      setWebsiteSettings((prev) => ({
        ...prev,
        custom404: {
          ...(prev.custom404 || {}),
          image: media.url,
        },
      }));
    }
    setActivePickerField(null);
  };

  // Submit Settings Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const settingsData = {
      siteId,
      analytics,
      scripts,
      header,
      footer,
      contactDetails,
    };

    // Merge wellnessBanner into websiteSettings before saving
    const mergedWebsiteSettings = {
      ...websiteSettings,
      wellnessBanner,
    };

    try {
      // Parallel Save Operations
      const [resGlobal, resWebsite] = await Promise.all([
        fetch("/api/dashboard/global-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
          },
          body: JSON.stringify(settingsData),
        }),
        fetch("/api/dashboard/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
          },
          body: JSON.stringify(mergedWebsiteSettings),
        }),
      ]);

      if (!resGlobal.ok) {
        const errorData = await resGlobal.json();
        throw new Error(
          errorData.error || "Failed to save tracking/layout settings",
        );
      }
      if (!resWebsite.ok) {
        const errorData = await resWebsite.json();
        throw new Error(errorData.error || "Failed to save website settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner Alert */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error updating settings</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-md flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Settings Saved</p>
            <p className="text-sm">
              Global website configurations saved successfully!
            </p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-nowrap w-full overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("brand")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${activeTab === "brand"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Layout className="w-4 h-4" />
            Brand & Identity
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${activeTab === "seo"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Search className="w-4 h-4" />
            SEO Defaults
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${activeTab === "analytics"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Activity className="w-4 h-4" />
            Analytics & Tracking
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("robots")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${activeTab === "robots"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Bot className="w-4 h-4" />
            Robots & AI
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("scripts")}
            className={`px-5 py-4 text-center font-bold text-xs border-b-2 transition flex items-center gap-2 ${activeTab === "scripts"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Code className="w-4 h-4" />
            Custom Scripts
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* Tab 1: Brand & Identity */}
          {activeTab === "brand" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Brand Information & Assets
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Configure your domain base URL, color theme palletes, and
                  logos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="domain"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    Site Domain (Canonical Base URL)
                  </label>
                  <input
                    type="url"
                    id="domain"
                    name="domain"
                    value={websiteSettings.domain || ""}
                    onChange={handleWebsiteChange}
                    placeholder="e.g. https://yourcompany.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>


              </div>

              {/* Maintenance Mode Sub-card */}
              <div className="bg-slate-50/50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Maintenance Mode
                      </h4>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300">
                        Block public access to website content with a custom
                        message.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      checked={!!websiteSettings.maintenanceMode}
                      onChange={handleWebsiteChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-600"></div>
                  </label>
                </div>
                {websiteSettings.maintenanceMode && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                    <label
                      htmlFor="maintenanceMessage"
                      className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5"
                    >
                      Custom Maintenance Message
                    </label>
                    <textarea
                      id="maintenanceMessage"
                      name="maintenanceMessage"
                      value={websiteSettings.maintenanceMessage || ""}
                      onChange={handleWebsiteChange}
                      rows={2}
                      placeholder="We are currently undergoing scheduled system updates. Please visit us back shortly."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder-slate-400"
                    />
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        Maintenance Page Image
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="maintenanceImage"
                          value={websiteSettings.maintenanceImage || ""}
                          onChange={handleWebsiteChange}
                          placeholder="Media URL or relative path"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setActivePickerField("maintenanceImage")}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shrink-0 border border-slate-200 cursor-pointer"
                        >
                          Browse
                        </button>
                      </div>
                      {websiteSettings.maintenanceImage && (
                        <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-2">
                          <img
                            src={websiteSettings.maintenanceImage}
                            alt="Maintenance Preview"
                            className="max-h-12 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setWebsiteSettings((prev) => ({ ...prev, maintenanceImage: "" }))}
                            className="text-[10px] text-red-600 hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom 404 Page Sub-card */}
              <div className="bg-slate-50/50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Custom 404 Page
                      </h4>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300">
                        Customize the page visitors see when a URL is not found.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="custom404.enabled"
                      checked={websiteSettings.custom404?.enabled !== false}
                      onChange={handleWebsiteChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-600"></div>
                  </label>
                </div>

                {websiteSettings.custom404?.enabled !== false && (
                  <div className="animate-in fade-in duration-150 space-y-3 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                          Page Title
                        </label>
                        <input
                          type="text"
                          name="custom404.title"
                          value={websiteSettings.custom404?.title || ""}
                          onChange={handleWebsiteChange}
                          placeholder="Page Not Found"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          name="custom404.buttonText"
                          value={websiteSettings.custom404?.buttonText || ""}
                          onChange={handleWebsiteChange}
                          placeholder="Go Home"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                        Description
                      </label>
                      <textarea
                        name="custom404.description"
                        value={websiteSettings.custom404?.description || ""}
                        onChange={handleWebsiteChange}
                        rows={2}
                        placeholder="Oops! The page you are looking for does not exist."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                        Button Link
                      </label>
                      <input
                        type="text"
                        name="custom404.buttonLink"
                        value={websiteSettings.custom404?.buttonLink || ""}
                        onChange={handleWebsiteChange}
                        placeholder="/"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                        Custom 404 Image
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="custom404.image"
                          value={websiteSettings.custom404?.image || ""}
                          onChange={handleWebsiteChange}
                          placeholder="Media URL or relative path"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setActivePickerField("custom404Image")}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shrink-0 border border-slate-200 cursor-pointer"
                        >
                          Browse
                        </button>
                      </div>
                      {websiteSettings.custom404?.image && (
                        <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-2">
                          <img
                            src={websiteSettings.custom404.image}
                            alt="404 Preview"
                            className="max-h-12 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setWebsiteSettings((prev) => ({
                              ...prev,
                              custom404: {
                                ...(prev.custom404 || {}),
                                image: "",
                              },
                            }))}
                            className="text-[10px] text-red-650 hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Auto-redirect section */}
                    <div className="bg-white border border-slate-100 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Auto-Redirect
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="custom404.redirectOn404"
                            checked={!!websiteSettings.custom404?.redirectOn404}
                            onChange={handleWebsiteChange}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {websiteSettings.custom404?.redirectOn404 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
                          <div>
                            <label className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1">
                              Redirect URL
                            </label>
                            <input
                              type="text"
                              name="custom404.redirectUrl"
                              value={
                                websiteSettings.custom404?.redirectUrl || ""
                              }
                              onChange={handleWebsiteChange}
                              placeholder="/"
                              className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1">
                              Delay (seconds)
                            </label>
                            <input
                              type="number"
                              name="custom404.redirectDelay"
                              value={
                                websiteSettings.custom404?.redirectDelay ?? 5
                              }
                              onChange={handleWebsiteChange}
                              min={0}
                              max={30}
                              className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logo & Favicon Picker Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-150">
                {/* Logo Select */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Website Logo URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="logoUrl"
                      value={websiteSettings.logoUrl || ""}
                      onChange={handleWebsiteChange}
                      placeholder="/logo.webp or Media URL"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setActivePickerField("logo")}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border"
                    >
                      Browse
                    </button>
                  </div>
                  {websiteSettings.logoUrl && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center gap-3">
                      <img
                        src={websiteSettings.logoUrl}
                        alt="Logo Preview"
                        className="max-h-8 max-w-[120px] object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">
                        {websiteSettings.logoUrl}
                      </span>
                    </div>
                  )}
                </div>

                {/* Favicon Select */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Website Favicon URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="favicon"
                      value={websiteSettings.favicon || ""}
                      onChange={handleWebsiteChange}
                      placeholder="/favicon.ico or Media URL"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setActivePickerField("favicon")}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border"
                    >
                      Browse
                    </button>
                  </div>
                  {websiteSettings.favicon && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center gap-3">
                      <img
                        src={websiteSettings.favicon}
                        alt="Favicon Preview"
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">
                        {websiteSettings.favicon}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: SEO Defaults */}
          {activeTab === "seo" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Global SEO Configurations
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Define default metadata values applied when pages or posts
                  lack overrides.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="seo_title"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Default SEO Title
                  </label>
                  <input
                    type="text"
                    id="seo_title"
                    name="title"
                    value={websiteSettings.title || ""}
                    onChange={handleWebsiteChange}
                    placeholder="e.g. Acme Corporation | Home"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="seo_titleTemplate"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  >
                    Title Template
                    <span className="normal-case text-[10px] text-gray-400 font-normal">
                      Use %s for dynamic page title
                    </span>
                  </label>
                  <input
                    type="text"
                    id="seo_titleTemplate"
                    name="titleTemplate"
                    value={websiteSettings.titleTemplate || ""}
                    onChange={handleWebsiteChange}
                    placeholder="e.g. %s | Acme Corporation"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="seo_description"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Default Meta Description
                </label>
                <textarea
                  id="seo_description"
                  name="description"
                  value={websiteSettings.description || ""}
                  onChange={handleWebsiteChange}
                  rows={3}
                  placeholder="Provide a general description of your website for search engines..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Global JSON-LD */}
              <div>
                <label
                  htmlFor="seo_globalJsonLd"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"
                >
                  <Code className="w-3.5 h-3.5 text-gray-400" />
                  Global JSON-LD Structured Data
                </label>
                <p className="text-xs text-gray-500 mb-2 font-normal">
                  This JSON-LD structured data will be injected into the &lt;head&gt; of <strong>every single page</strong> on the site.
                </p>
                <div className="rounded-xl border border-slate-800 overflow-hidden shadow-xs">
                  <div className="flex justify-between items-center bg-slate-800 px-3.5 py-2 border-b border-slate-700 select-none">
                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Code size={12} className="text-teal-400" />
                      JSON-LD Schema Payload
                    </span>
                    <span className="text-[9px] text-teal-400 font-mono font-bold px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/60">
                      valid json
                    </span>
                  </div>
                  <textarea
                    id="seo_globalJsonLd"
                    name="globalJsonLd"
                    value={websiteSettings.globalJsonLd || ""}
                    onChange={handleWebsiteChange}
                    rows={6}
                    placeholder='{"@context": "https://schema.org", "@type": "Organization"}'
                    className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-y border-none"
                  />
                </div>
              </div>

              {/* Default OG Image */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                  Default Open Graph (OG) Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="ogImageUrl"
                    value={websiteSettings.ogImageUrl || ""}
                    onChange={handleWebsiteChange}
                    placeholder="https://yourdomain.com/og-image.jpg"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono text-ellipsis"
                  />
                  <button
                    type="button"
                    onClick={() => setActivePickerField("ogImage")}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border"
                  >
                    Browse
                  </button>
                </div>
                {websiteSettings.ogImageUrl && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center gap-3">
                    <img
                      src={websiteSettings.ogImageUrl}
                      alt="OG Preview"
                      className="max-h-16 max-w-[160px] object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">
                      {websiteSettings.ogImageUrl}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Analytics & Tracking */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Analytics & Tracking Codes
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Configure measurement keys for user action and session
                  tracking engines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="gaMeasurementId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Analytics Measurement ID
                  </label>
                  <input
                    type="text"
                    name="gaMeasurementId"
                    id="gaMeasurementId"
                    value={analytics.gaMeasurementId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                <div>
                  <label
                    htmlFor="googleAnalyticsId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Analytics ID (Legacy)
                  </label>
                  <input
                    type="text"
                    name="googleAnalyticsId"
                    id="googleAnalyticsId"
                    value={analytics.googleAnalyticsId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="UA-XXXXXXX-X"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gtmId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Tag Manager ID
                  </label>
                  <input
                    type="text"
                    name="gtmId"
                    id="gtmId"
                    value={analytics.gtmId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="GTM-XXXXXXX"
                  />
                </div>

                <div>
                  <label
                    htmlFor="googleTagManagerId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Tag Manager ID (Legacy)
                  </label>
                  <input
                    type="text"
                    name="googleTagManagerId"
                    id="googleTagManagerId"
                    value={analytics.googleTagManagerId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="GTM-XXXXXXX"
                  />
                </div>

                <div>
                  <label
                    htmlFor="clarityId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Microsoft Clarity ID
                  </label>
                  <input
                    type="text"
                    name="clarityId"
                    id="clarityId"
                    value={analytics.clarityId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="xxxxxxxxxx"
                  />
                </div>

                <div>
                  <label
                    htmlFor="searchConsoleVerification"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Search Console Verification Code
                  </label>
                  <input
                    type="text"
                    name="searchConsoleVerification"
                    id="searchConsoleVerification"
                    value={analytics.searchConsoleVerification || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. google1234567890abcdef"
                  />
                </div>

                <div>
                  <label
                    htmlFor="searchConsoleId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Search Console ID (Legacy)
                  </label>
                  <input
                    type="text"
                    name="searchConsoleId"
                    id="searchConsoleId"
                    value={analytics.searchConsoleId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. google1234567890abcdef"
                  />
                </div>

                <div>
                  <label
                    htmlFor="metaPixelId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Facebook Meta Pixel ID
                  </label>
                  <input
                    type="text"
                    name="metaPixelId"
                    id="metaPixelId"
                    value={analytics.metaPixelId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. 123456789012345"
                  />
                </div>

                <div>
                  <label
                    htmlFor="linkedInTagId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    LinkedIn Partner Insight ID
                  </label>
                  <input
                    type="text"
                    name="linkedInTagId"
                    id="linkedInTagId"
                    value={analytics.linkedInTagId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. 1234567"
                  />
                </div>

                <div>
                  <label
                    htmlFor="linkedinPartnerId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    LinkedIn Partner ID (Alt)
                  </label>
                  <input
                    type="text"
                    name="linkedinPartnerId"
                    id="linkedinPartnerId"
                    value={analytics.linkedinPartnerId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. partner-1234567"
                  />
                </div>

                <div>
                  <label
                    htmlFor="googleAdSenseId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google AdSense Publisher ID
                  </label>
                  <input
                    type="text"
                    name="googleAdSenseId"
                    id="googleAdSenseId"
                    value={analytics.googleAdSenseId || ""}
                    onChange={handleAnalyticsChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder="e.g. pub-1234567890123456"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Robots & AI */}
          {activeTab === "robots" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Robots, Sitemaps & AI Scrapers
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Edit crawler guidelines, scrapers exclusions, and AI-agent
                    context instructions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/sitemap?siteId=${siteId}`}
                    target="_blank"
                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200 flex items-center gap-1 transition-colors"
                  >
                    Sitemap XML
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                  <a
                    href={`/api/seo/robots?siteId=${siteId}`}
                    target="_blank"
                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200 flex items-center gap-1 transition-colors"
                  >
                    Robots.txt
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                  <a
                    href={`/api/seo/llm-txt?siteId=${siteId}`}
                    target="_blank"
                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200 flex items-center gap-1 transition-colors"
                  >
                    LLM.txt
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label
                  htmlFor="robotsTxt"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Custom Robots.txt Content
                </label>
                <div className="mb-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Important Note:</strong> If you specify custom <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 font-mono text-[11px] rounded border border-amber-300 dark:border-amber-700">robots.txt</code> rules, ensure you include <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 font-mono text-[11px] rounded border border-amber-300 dark:border-amber-700">Disallow: /services/private/</code> to prevent search engine indexing of private pages.
                  </p>
                </div>
                <textarea
                  id="robotsTxt"
                  name="robotsTxt"
                  value={websiteSettings.robotsTxt || ""}
                  onChange={handleWebsiteChange}
                  rows={6}
                  placeholder={`User-agent: *\nAllow: /\nDisallow: /api/`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="llmTxt"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                >
                  Custom LLM.txt Agent Guide
                </label>
                <textarea
                  id="llmTxt"
                  name="llmTxt"
                  value={websiteSettings.llmTxt || ""}
                  onChange={handleWebsiteChange}
                  rows={6}
                  placeholder={`# AI Agent System Guide\n\nThis site hosts company resources indexable by agents.`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          )}

          {/* Tab 8: Custom Scripts */}
          {activeTab === "scripts" && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Custom Header & Body Scripts
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Inject custom script snippets globally.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="headScripts"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Scripts for &lt;head&gt;
                  </label>
                  <textarea
                    name="head"
                    id="headScripts"
                    value={scripts.head || ""}
                    onChange={handleScriptsChange}
                    rows={6}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder={`<script>... head injection ...</script>`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="bodyScripts"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Scripts for start of &lt;body&gt;
                  </label>
                  <textarea
                    name="body"
                    id="bodyScripts"
                    value={scripts.body || ""}
                    onChange={handleScriptsChange}
                    rows={6}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    placeholder={`<!-- body open snippet injection -->`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
          <span className="text-xs text-gray-400 font-medium">
            Be careful updating brand identities and layout scripts on
            production sites.
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-0 outline-none"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Media Picker Modal */}
      {activePickerField !== null && (
        <MediaPickerModal
          title={
            activePickerField === "logo"
              ? "Select Brand Logo"
              : activePickerField === "favicon"
                ? "Select Website Favicon"
                : activePickerField === "ogImage"
                  ? "Select Default OG Image"
                  : activePickerField === "maintenanceImage"
                    ? "Select Maintenance Page Image"
                    : "Select Custom 404 Image"
          }
          filter="images"
          onSelect={handleMediaSelect}
          onClose={() => setActivePickerField(null)}
          siteId={siteId}
        />
      )}
    </form>
  );
}

function ExternalLinkIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2050/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

