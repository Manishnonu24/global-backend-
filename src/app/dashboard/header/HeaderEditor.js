"use client";

import { useState } from "react";
import { Save, AlertCircle, CheckCircle2, Layout, Smartphone, HelpCircle, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import ImageUploadField from "@/components/media/ImageUploadField";

export default function HeaderEditor({ siteId, initialConfig, menuTypes = [], navigation = {} }) {
  const defaultConfig = {
    layout: "logo-left",
    logoType: "image", // "image" | "text"
    logoText: "MySite",
    logoUrl: "/next.svg",
    logoWidth: 120,
    logoHeight: 24,
    menuType: "main",
    sticky: true,
    transparent: false,
    paddingY: "medium", // "small" | "medium" | "large"
    borderBottom: true,
    shadowSize: "small", // "none" | "small" | "medium"
    ctaText: "Get Started",
    ctaLink: "/contact",
    announcementBar: {
      enabled: true,
      text: "⚡ Welcome to the Global Backend!",
      link: "/blogs",
      bgColor: "#2563eb",
      textColor: "#ffffff"
    },
    mobileMenu: {
      enabled: true,
      layout: "drawer", // "drawer" | "dropdown"
      logoAlign: "left" // "left" | "center"
    },
    resourcesMenu: {
      label1: "Publications", url1: "/publication", cta1: "View all Publications →",
      label2: "Blogs", url2: "/blogs", cta2: "View all Blogs →",
      label3: "Quizzes", url3: "/quizzes", cta3: "View all Quizzes →",
      featuredLabel: "Latest Publication", featuredCta: "Read Now →"
    }
  };

  const isValidConfig = (cfg) => {
    return (
      cfg &&
      typeof cfg === "object" &&
      typeof cfg.layout === "string" &&
      cfg.announcementBar &&
      typeof cfg.announcementBar === "object"
    );
  };

  const [config, setConfig] = useState(
    isValidConfig(initialConfig) ? { ...defaultConfig, ...initialConfig } : defaultConfig
  );
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  // Active editor tab: "logo_layout", "announcement", "cta_menu", "mobile"
  const [activeTab, setActiveTab] = useState("logo_layout");

  // Simulated live view toggle: "desktop" | "mobile"
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dashboard/header", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId
        },
        body: JSON.stringify(config)
      });

      if (!res.ok) {
        throw new Error("Failed to save header layout configuration");
      }

      setSuccess("Header layout configuration saved successfully!");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAnnouncementField = (fieldName, value) => {
    setConfig(prev => ({
      ...prev,
      announcementBar: {
        ...prev.announcementBar,
        [fieldName]: value
      }
    }));
  };

  const getAnnouncementItems = () => {
    if (config.announcementBar.items && Array.isArray(config.announcementBar.items) && config.announcementBar.items.length > 0) {
      return config.announcementBar.items;
    }
    if (config.announcementBar.texts && Array.isArray(config.announcementBar.texts) && config.announcementBar.texts.length > 0) {
      return config.announcementBar.texts.map(t => ({ text: t || "", link: config.announcementBar.link || "" }));
    }
    return [{ text: config.announcementBar.text || "", link: config.announcementBar.link || "" }];
  };

  const updateAnnouncementItems = (newItems) => {
    setConfig(prev => ({
      ...prev,
      announcementBar: {
        ...prev.announcementBar,
        items: newItems,
        texts: newItems.map(i => i.text),
        text: newItems.length > 0 ? newItems[0].text : "",
        link: newItems.length > 0 ? newItems[0].link : ""
      }
    }));
  };

  const updateMobileField = (fieldName, value) => {
    setConfig(prev => ({
      ...prev,
      mobileMenu: {
        ...prev.mobileMenu,
        [fieldName]: value
      }
    }));
  };

  // Safe navigation fallback if menuTypes is empty
  const activeMenus = menuTypes.length > 0 ? menuTypes : ["main", "footer"];

  const activeMenuItems = navigation[config.menuType] || [];

  const renderNavLinks = (itemsArray = [], isSplit = false, splitSide = "left") => {
    let itemsToRender = itemsArray;
    if (isSplit) {
      const half = Math.ceil(itemsArray.length / 2);
      itemsToRender = splitSide === "left" ? itemsArray.slice(0, half) : itemsArray.slice(half);
    }

    return (
      <ul className="hidden md:flex gap-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider items-center">
        {itemsToRender.map((item, idx) => (
          <li key={idx} className="relative group cursor-pointer hover:text-indigo-600 transition">
            <span className="whitespace-nowrap">{item.label}</span>
            {item.children && item.children.length > 0 && (
              <div className="absolute left-0 mt-1 hidden group-hover:block bg-white border border-gray-250 rounded-lg shadow-lg p-2 min-w-[140px] text-gray-700 z-50 text-[9px] font-medium normal-case">
                {item.children.map((child, cidx) => (
                  <div key={cidx} className="px-2 py-1.5 hover:bg-gray-50 rounded transition text-gray-600 hover:text-indigo-600 text-left">
                    {child.label}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
        {itemsToRender.length === 0 && (
          <span className="text-[10px] text-gray-400 italic">Empty Menu</span>
        )}
      </ul>
    );
  };

  // Mapping helper classes for live preview
  const getPaddingClass = (size) => {
    switch (size) {
      case "small": return "py-2";
      case "large": return "py-6";
      case "medium":
      default:
        return "py-4";
    }
  };

  const getShadowClass = (size) => {
    switch (size) {
      case "none": return "shadow-none";
      case "medium": return "shadow";
      case "small":
      default:
        return "shadow-sm";
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Alert banners */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <AlertCircle className="shrink-0" size={18} />
          <div>
            <strong className="font-semibold">Operation failed:</strong>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
          <CheckCircle2 className="shrink-0" size={18} />
          <div>
            <strong className="font-semibold">Success:</strong>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Editor Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Settings Panel */}
        <div className="xl:col-span-1 bg-white border p-6 rounded-xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Header Controls</h3>
            <button
              type="submit"
              disabled={isSaving}
              className="admin-btn admin-btn-primary shadow-sm"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Header"}
            </button>
          </div>

          {/* Sub-tabs Selection */}
          <div className="grid grid-cols-2 gap-1.5 text-xs text-center font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("logo_layout")}
              className={`py-2 rounded-lg border transition ${
                activeTab === "logo_layout"
                  ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Logo & Layout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("announcement")}
              className={`py-2 rounded-lg border transition ${
                activeTab === "announcement"
                  ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Announcement Bar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cta_menu")}
              className={`py-2 rounded-lg border transition ${
                activeTab === "cta_menu"
                  ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              CTA & Navigation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mobile")}
              className={`py-2 rounded-lg border transition ${
                activeTab === "mobile"
                  ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Mobile Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resources_menu")}
              className={`py-2 rounded-lg border transition col-span-2 ${
                activeTab === "resources_menu"
                  ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Resources Menu
            </button>
          </div>

          {/* Tab Render: LOGO & LAYOUT */}
          {activeTab === "logo_layout" && (
            <div className="space-y-4 pt-2">
              {/* Logo Type selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Logo Control Type</label>
                <select
                  value={config.logoType}
                  onChange={(e) => setConfig(prev => ({ ...prev, logoType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs bg-white font-semibold"
                >
                  <option value="image">Image Logo (Upload URL)</option>
                  <option value="text">Text-Based Title Logo</option>
                </select>
              </div>

              {config.logoType === "image" ? (
                <>
                  <ImageUploadField 
                    label="Logo Image URL"
                    value={config.logoUrl}
                    onChange={(val) => setConfig(prev => ({ ...prev, logoUrl: val }))}
                    siteId={siteId}
                    placeholder="/next.svg"
                  />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Logo Width (px)</label>
                      <input
                        type="number"
                        value={config.logoWidth}
                        onChange={(e) => setConfig(prev => ({ ...prev, logoWidth: Number(e.target.value) }))}
                        className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Logo Height (px)</label>
                      <input
                        type="number"
                        value={config.logoHeight}
                        onChange={(e) => setConfig(prev => ({ ...prev, logoHeight: Number(e.target.value) }))}
                        className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Logo Title Text</label>
                  <input
                     type="text"
                     required
                     value={config.logoText}
                     onChange={(e) => setConfig(prev => ({ ...prev, logoText: e.target.value }))}
                     className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-semibold"
                     placeholder="MySite Title"
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab Render: ANNOUNCEMENT BAR */}
          {activeTab === "announcement" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <input
                  type="checkbox"
                  id="announcementBarEnabled"
                  checked={config.announcementBar.enabled}
                  onChange={(e) => updateAnnouncementField("enabled", e.target.checked)}
                  className="rounded text-indigo-600 h-4 w-4"
                />
                <label htmlFor="announcementBarEnabled" className="text-xs font-bold text-gray-700">Enable Announcement Bar</label>
              </div>

              {config.announcementBar.enabled && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Announcement Messages</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentItems = getAnnouncementItems();
                          updateAnnouncementItems([...currentItems, { text: "", link: "" }]);
                        }}
                        className="text-[11px] font-bold text-indigo-650 hover:text-indigo-800 flex items-center gap-1 transition"
                      >
                        <Plus size={12} /> Add Message
                      </button>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {getAnnouncementItems().map((item, idx, arr) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-50/50 border border-slate-150 p-3 rounded-xl">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => {
                                const next = [...arr];
                                next[idx] = { ...next[idx], text: e.target.value };
                                updateAnnouncementItems(next);
                              }}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-indigo-600 text-xs bg-white"
                              placeholder={`Announcement Text #${idx + 1}`}
                            />
                            <input
                              type="text"
                              value={item.link}
                              onChange={(e) => {
                                const next = [...arr];
                                next[idx] = { ...next[idx], link: e.target.value };
                                updateAnnouncementItems(next);
                              }}
                              className="w-full rounded-lg border border-gray-250 px-3 py-2 outline-none focus:border-indigo-650 text-xs font-mono bg-white"
                              placeholder="Redirect link path (e.g. /blogs)"
                            />
                          </div>
                          {arr.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = arr.filter((_, i) => i !== idx);
                                updateAnnouncementItems(next);
                              }}
                              className="p-2.5 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition shrink-0 self-center"
                              title="Remove Message"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Background Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.announcementBar.bgColor || "#2563eb"}
                          onChange={(e) => updateAnnouncementField("bgColor", e.target.value)}
                          className="w-8 h-8 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={config.announcementBar.bgColor || "#2563eb"}
                          onChange={(e) => updateAnnouncementField("bgColor", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-indigo-600 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Text Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.announcementBar.textColor || "#ffffff"}
                          onChange={(e) => updateAnnouncementField("textColor", e.target.value)}
                          className="w-8 h-8 rounded border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={config.announcementBar.textColor || "#ffffff"}
                          onChange={(e) => updateAnnouncementField("textColor", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-indigo-600 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab Render: CTA & MENU SELECTION */}
          {activeTab === "cta_menu" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Navigation Menu Selection</label>
                <select
                  value={config.menuType}
                  onChange={(e) => setConfig(prev => ({ ...prev, menuType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs bg-white font-semibold"
                >
                  {activeMenus.map((menuName) => (
                    <option key={menuName} value={menuName}>
                      {menuName.toUpperCase()} menu
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">CTA Button Settings</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Button Label</label>
                  <input
                    type="text"
                    value={config.ctaText || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-semibold"
                    placeholder="e.g. Contact Us"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Button Redirect Link</label>
                  <input
                    type="text"
                    value={config.ctaLink || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-mono"
                    placeholder="/contact"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Render: RESOURCES MENU */}
          {activeTab === "resources_menu" && (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((num) => (
                <div key={`col${num}`} className="border-b pb-4 mb-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Column {num}</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={config.resourcesMenu?.[`label${num}`] || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, resourcesMenu: { ...prev.resourcesMenu, [`label${num}`]: e.target.value } }))}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-semibold"
                      placeholder={`Label ${num}`}
                    />
                    <input
                      type="text"
                      value={config.resourcesMenu?.[`url${num}`] || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, resourcesMenu: { ...prev.resourcesMenu, [`url${num}`]: e.target.value } }))}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-mono"
                      placeholder={`URL ${num}`}
                    />
                    <input
                      type="text"
                      value={config.resourcesMenu?.[`cta${num}`] || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, resourcesMenu: { ...prev.resourcesMenu, [`cta${num}`]: e.target.value } }))}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs"
                      placeholder={`CTA ${num}`}
                    />
                  </div>
                </div>
              ))}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Featured Item (Right Side)</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={config.resourcesMenu?.featuredLabel || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, resourcesMenu: { ...prev.resourcesMenu, featuredLabel: e.target.value } }))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs font-semibold"
                    placeholder="Featured Label"
                  />
                  <input
                    type="text"
                    value={config.resourcesMenu?.featuredCta || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, resourcesMenu: { ...prev.resourcesMenu, featuredCta: e.target.value } }))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs"
                    placeholder="Featured CTA"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Render: MOBILE MENU EDITOR */}
          {activeTab === "mobile" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <input
                  type="checkbox"
                  id="mobileMenuEnabled"
                  checked={config.mobileMenu.enabled}
                  onChange={(e) => updateMobileField("enabled", e.target.checked)}
                  className="rounded text-indigo-600 h-4 w-4"
                />
                <label htmlFor="mobileMenuEnabled" className="text-xs font-bold text-gray-700">Enable Mobile Responsive Menu</label>
              </div>

              {config.mobileMenu.enabled && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile Drawer Style</label>
                    <select
                      value={config.mobileMenu.layout}
                      onChange={(e) => updateMobileField("layout", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs bg-white"
                    >
                      <option value="drawer">Slide-over Side Drawer</option>
                      <option value="dropdown">Top Overlay Dropdown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile Logo Alignment</label>
                    <select
                      value={config.mobileMenu.logoAlign || "left"}
                      onChange={(e) => updateMobileField("logoAlign", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-indigo-600 text-xs bg-white"
                    >
                      <option value="left">Align Logo Left</option>
                      <option value="center">Align Logo Centered</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Live Mock Preview Panel */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-gray-50 border p-2 rounded-lg">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Mock Header Preview</h3>
            
            <div className="flex gap-1 bg-white border p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3 py-1 text-[10px] font-bold rounded transition ${
                  previewDevice === "desktop" ? "bg-[var(--admin-accent)] text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Desktop Layout
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-3 py-1 text-[10px] font-bold rounded transition flex items-center gap-1 ${
                  previewDevice === "mobile" ? "bg-[var(--admin-accent)] text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Smartphone size={10} />
                Mobile Layout
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-slate-900 shadow-xl overflow-hidden min-h-[350px] flex flex-col justify-between p-4 font-sans select-none relative transition-all duration-300">
            {/* Live Header Render box */}
            <div className={`w-full bg-white rounded-lg transition overflow-hidden text-black ${
              config.sticky ? "ring-2 ring-indigo-500/20" : ""
            } ${getShadowClass(config.shadowSize)} ${
              config.borderBottom ? "border-b border-gray-200" : "border-b-0"
            } ${
              previewDevice === "mobile" ? "max-w-[400px] mx-auto border" : "w-full"
            }`}>
              
              {/* Announcement Bar */}
              {config.announcementBar.enabled && (
                <div
                  style={{
                    backgroundColor: config.announcementBar.bgColor,
                    color: config.announcementBar.textColor
                  }}
                  className="w-full py-1.5 px-4 text-center text-[10px] font-bold tracking-wide truncate flex items-center justify-center gap-1.5"
                >
                  {config.announcementBar.text}
                </div>
              )}

              {/* Navigation Header bar */}
              <div className={`px-6 flex items-center justify-between ${getPaddingClass(config.paddingY)}`}>
                
                {/* Desktop View rendering */}
                {previewDevice === "desktop" ? (
                  <>
                    {/* 1. Logo left */}
                    {config.layout === "logo-left" && (
                      <>
                        <div className="shrink-0 flex items-center">
                          {config.logoType === "text" ? (
                            <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                          ) : (
                            <img
                              src={config.logoUrl}
                              alt="Logo"
                              style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: "contain" }}
                            />
                          )}
                        </div>
                        {renderNavLinks(activeMenuItems)}
                        <div>
                          {config.ctaText && (
                            <button type="button" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                              {config.ctaText}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* 2. Logo Center */}
                    {config.layout === "logo-center" && (
                      <>
                        {renderNavLinks(activeMenuItems)}
                        <div className="shrink-0 flex items-center">
                          {config.logoType === "text" ? (
                            <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                          ) : (
                            <img
                              src={config.logoUrl}
                              alt="Logo"
                              style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: "contain" }}
                            />
                          )}
                        </div>
                        <div>
                          {config.ctaText && (
                            <button type="button" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                              {config.ctaText}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* 3. Logo Split */}
                    {config.layout === "logo-split" && (
                      <>
                        {renderNavLinks(activeMenuItems, true, "left")}
                        <div className="shrink-0 flex items-center">
                          {config.logoType === "text" ? (
                            <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                          ) : (
                            <img
                              src={config.logoUrl}
                              alt="Logo"
                              style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: "contain" }}
                            />
                          )}
                        </div>
                        {renderNavLinks(activeMenuItems, true, "right")}
                      </>
                    )}

                    {/* 4. Logo Right */}
                    {config.layout === "logo-right" && (
                      <>
                        <div>
                          {config.ctaText && (
                            <button type="button" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                              {config.ctaText}
                            </button>
                          )}
                        </div>
                        {renderNavLinks(activeMenuItems)}
                        <div className="shrink-0 flex items-center">
                          {config.logoType === "text" ? (
                            <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                          ) : (
                            <img
                              src={config.logoUrl}
                              alt="Logo"
                              style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: "contain" }}
                            />
                          )}
                        </div>
                      </>
                    )}

                    {/* 5. Stacked Centered */}
                    {config.layout === "stacked" && (
                      <div className="w-full flex flex-col items-center gap-3">
                        <div className="shrink-0 flex items-center">
                          {config.logoType === "text" ? (
                            <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                          ) : (
                            <img
                              src={config.logoUrl}
                              alt="Logo"
                              style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: "contain" }}
                            />
                          )}
                        </div>
                        <div className="flex w-full justify-between items-center pt-2 border-t border-gray-100">
                          {renderNavLinks(activeMenuItems)}
                          <div>
                            {config.ctaText && (
                              <button type="button" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                                {config.ctaText}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Mobile responsive View rendering */
                  <div className="w-full flex items-center justify-between">
                    {config.mobileMenu.logoAlign === "center" && <div className="w-6" />}
                    
                    <div className="shrink-0 flex items-center">
                      {config.logoType === "text" ? (
                        <span className="font-bold text-sm tracking-tight text-gray-900">{config.logoText}</span>
                      ) : (
                        <img
                          src={config.logoUrl}
                          alt="Logo"
                          style={{
                            width: `${Math.min(config.logoWidth, 90)}px`,
                            height: `${Math.min(config.logoHeight, 20)}px`,
                            objectFit: "contain"
                          }}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mobile Hamburger burger icon simulation */}
                      <button type="button" className="p-1.5 border rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 shrink-0">
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Layout characteristics specifications info */}
            <div className="mt-8 bg-slate-950 border border-slate-800 p-4 rounded-lg text-xs space-y-2 text-slate-400 leading-relaxed font-sans max-w-xl mx-auto w-full">
              <div className="font-bold text-slate-200 flex items-center gap-1.5 select-none">
                <Layout size={14} className="text-indigo-400" />
                Active Header Settings Specifications
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                <li>Layout positioning format is resolved as <span className="font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">{config.layout}</span>.</li>
                <li>Vertical padding height is <span className="font-semibold text-slate-200">{config.paddingY}</span>.</li>
                <li>Sticky behaviors are <span className="font-semibold text-slate-200">{config.sticky ? "enabled (header locks to screen top)" : "disabled"}</span>.</li>
                <li>Overlay Transparency is <span className="font-semibold text-slate-200">{config.transparent ? "active (transparent overlay header)" : "inactive (solid background)"}</span>.</li>
                <li>Navigation menu references <span className="font-semibold text-slate-200">"{config.menuType}"</span> database entries array.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

