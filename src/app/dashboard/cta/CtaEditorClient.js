"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Save,
  Eye,
  X,
  Sparkles,
  MousePointerClick,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  HelpCircle,
  Palette,
  ToggleLeft,
  ToggleRight,
  Layout,
  Image as ImageIcon,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function CtaEditorClient({ siteId, initialCtaConfig }) {
  const [activeTab, setActiveTab] = useState("main");
  const [main, setMain] = useState(
    initialCtaConfig?.main || { text: "", link: "" },
  );
  const [floatingButtons, setFloatingButtons] = useState(
    initialCtaConfig?.floatingButtons || [],
  );
  const [popups, setPopups] = useState(initialCtaConfig?.popups || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Modals / Forms States
  const [btnModalOpen, setBtnModalOpen] = useState(false);
  const [btnEditingIndex, setBtnEditingIndex] = useState(null); // null if adding new
  const [btnForm, setBtnForm] = useState({
    id: "",
    label: "",
    link: "",
    icon: "",
    position: "bottom-right",
    color: "#1e293b",
    textColor: "#ffffff",
    enabled: true,
  });

  const [popupModalOpen, setPopupModalOpen] = useState(false);
  const [popupEditingIndex, setPopupEditingIndex] = useState(null); // null if adding new
  const [popupForm, setPopupForm] = useState({
    id: "",
    title: "",
    body: "",
    type: "information",
    buttonText: "",
    buttonLink: "",
    triggerOn: "page-load",
    triggerValue: "0",
    showOnce: false,
    imageUrl: "",
  });

  const [mediaPickerType, setMediaPickerType] = useState(null);

  // Test Simulator State
  const [activeTestPopup, setActiveTestPopup] = useState(null);

  // Helper to slugify text for IDs
  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Main CTA Save Handlers
  const handleMainChange = (e) => {
    const { name, value } = e.target;
    setMain((prev) => ({ ...prev, [name]: value }));
  };

  // Floating Buttons Actions
  const openBtnModal = (index = null) => {
    if (index !== null) {
      setBtnEditingIndex(index);
      setBtnForm(floatingButtons[index]);
    } else {
      setBtnEditingIndex(null);
      setBtnForm({
        id: "",
        label: "",
        link: "",
        icon: "",
        position: "bottom-right",
        color: "#1e293b",
        textColor: "#ffffff",
        enabled: true,
      });
    }
    setBtnModalOpen(true);
  };

  const handleBtnSave = (e) => {
    e.preventDefault();
    if (!btnForm.label.trim()) return;

    const id =
      btnForm.id.trim() || slugify(btnForm.label) || `btn-${Date.now()}`;
    const formattedBtn = { ...btnForm, id };

    if (btnEditingIndex !== null) {
      setFloatingButtons((prev) =>
        prev.map((btn, i) => (i === btnEditingIndex ? formattedBtn : btn)),
      );
    } else {
      setFloatingButtons((prev) => [...prev, formattedBtn]);
    }
    setBtnModalOpen(false);
  };

  const removeBtn = (index) => {
    setFloatingButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Popups Actions
  const openPopupModal = (index = null) => {
    if (index !== null) {
      setPopupEditingIndex(index);
      setPopupForm(popups[index]);
    } else {
      setPopupEditingIndex(null);
      setPopupForm({
        id: "",
        title: "",
        body: "",
        type: "information",
        buttonText: "",
        buttonLink: "",
        triggerOn: "page-load",
        triggerValue: "0",
        showOnce: false,
        imageUrl: "",
      });
    }
    setPopupModalOpen(true);
  };

  const handlePopupSave = (e) => {
    e.preventDefault();
    if (!popupForm.title.trim()) return;

    const id =
      popupForm.id.trim() || slugify(popupForm.title) || `popup-${Date.now()}`;
    const formattedPopup = {
      ...popupForm,
      id,
      triggerValue:
        popupForm.triggerOn === "page-load" ? "0" : popupForm.triggerValue,
    };

    if (popupEditingIndex !== null) {
      setPopups((prev) =>
        prev.map((pop, i) => (i === popupEditingIndex ? formattedPopup : pop)),
      );
    } else {
      setPopups((prev) => [...prev, formattedPopup]);
    }
    setPopupModalOpen(false);
  };

  const removePopup = (index) => {
    setPopups((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Settings
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const ctaConfig = {
      main: main.text || main.link ? main : undefined,
      floatingButtons: floatingButtons.length > 0 ? floatingButtons : undefined,
      popups: popups.length > 0 ? popups : undefined,
    };

    try {
      const res = await fetch("/api/dashboard/cta", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ ctaConfig }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const POPUP_TYPE_OPTIONS = [
    {
      value: "information",
      label: "Information",
      desc: "Simple informational message",
    },
    {
      value: "subscription",
      label: "Subscription",
      desc: "Email/newsletter signup prompt",
    },
    {
      value: "exit-intent",
      label: "Exit-Intent",
      desc: "Triggers when user moves to close tab",
    },
    {
      value: "lead-magnet",
      label: "Lead Magnet",
      desc: "Offers a download or incentive",
    },
  ];

  const POSITION_OPTIONS = [
    { value: "bottom-right", label: "Bottom Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "top-right", label: "Top Right" },
    { value: "top-left", label: "Top Left" },
  ];

  const TRIGGER_OPTIONS = [
    { value: "page-load", label: "On Page Load", placeholder: "" },
    { value: "delay", label: "After Delay (seconds)", placeholder: "3" },
    { value: "scroll", label: "Scroll Percentage (%)", placeholder: "50" },
    { value: "exit-intent", label: "Exit Intent", placeholder: "" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md flex items-start gap-3 shadow-xs animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error updating settings</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-md flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-sm">
              CTA & Popup settings updated successfully!
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Settings & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Form Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            {/* Tabs Headers */}
            <div className="flex flex-nowrap w-full overflow-x-auto whitespace-nowrap border-b border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setActiveTab("main")}
                className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition flex items-center justify-center gap-2 ${activeTab === "main"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                <MousePointerClick className="w-4 h-4" />
                Main Call-To-Action
              </button>
              <button
                onClick={() => setActiveTab("floating")}
                className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition flex items-center justify-center gap-2 ${activeTab === "floating"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                Floating Buttons
              </button>
              <button
                onClick={() => setActiveTab("popups")}
                className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition flex items-center justify-center gap-2 ${activeTab === "popups"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                <Megaphone className="w-4 h-4" />
                Popups & Lead Magnets
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {/* Tab 1: Main CTA */}
              {activeTab === "main" && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3 mb-2">
                    <h3 className="text-md font-bold text-gray-800">
                      Primary Website CTA
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure the main conversion button shown in header
                      headers, hero sections, or general links.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="mainText"
                        className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                      >
                        CTA Text
                      </label>
                      <input
                        type="text"
                        id="mainText"
                        name="text"
                        value={main.text}
                        onChange={handleMainChange}
                        placeholder="e.g. Get Started Today"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="mainLink"
                        className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                      >
                        CTA Link / URL
                      </label>
                      <input
                        type="text"
                        id="mainLink"
                        name="link"
                        value={main.link}
                        onChange={handleMainChange}
                        placeholder="e.g. /contact or https://yourdomain.com"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="mainIcon"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      CTA Icon / Custom Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="mainIcon"
                        list="iconOptions"
                        name="icon"
                        value={main.icon || ""}
                        onChange={handleMainChange}
                        placeholder="e.g. sparkles or https://..."
                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setMediaPickerType("mainIcon")}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Browse
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Floating Buttons with extended configuration */}
              {activeTab === "floating" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-2">
                    <div>
                      <h3 className="text-md font-bold text-gray-800">
                        Floating Widgets
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Floating action buttons display persistently at the
                        corner of your page (e.g. support links, direct phone,
                        WhatsApp).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBtnModal()}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Button
                    </button>
                  </div>

                  {floatingButtons.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        No floating buttons yet
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Click the button above to add your first quick contact
                        or social link.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {floatingButtons.map((btn, index) => (
                        <div
                          key={btn.id}
                          className="p-4 bg-white border border-gray-100 hover:border-gray-200 rounded-xl flex justify-between items-start shadow-xs hover:shadow-md transition-all group"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full select-none">
                              ID: {btn.id}
                            </span>
                            <h4 className="text-sm font-bold text-gray-800">
                              {btn.label}
                            </h4>
                            <p
                              className="text-xs text-blue-600 font-mono truncate max-w-[200px] hover:underline"
                              title={btn.link}
                            >
                              {btn.link || "#"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {btn.position && (
                                <span className="text-2xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                  {btn.position}
                                </span>
                              )}
                              {btn.color && (
                                <span className="inline-flex items-center gap-1 text-2xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: btn.color }}
                                  />
                                  {btn.color}
                                </span>
                              )}
                              <span
                                className={`text-2xs px-1.5 py-0.5 rounded border ${btn.enabled !== false ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}
                              >
                                {btn.enabled !== false ? "Active" : "Disabled"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openBtnModal(index)}
                              className="p-1.5 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit button"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBtn(index)}
                              className="p-1.5 bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Popups with extended builder */}
              {activeTab === "popups" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-2">
                    <div>
                      <h3 className="text-md font-bold text-gray-800">
                        Lead Magnet & Newsletter Popups
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure subscription and promotional popups triggered
                        by user exits, time delays, or scroll parameters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPopupModal()}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Popup
                    </button>
                  </div>

                  {popups.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        No popups configured
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Click the button above to set up a subscription banner
                        or lead magnet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {popups.map((pop, index) => (
                        <div
                          key={pop.id}
                          className="p-4 bg-white border border-gray-100 hover:border-gray-200 rounded-xl flex justify-between items-start shadow-xs hover:shadow-md transition-all group"
                        >
                          <div className="space-y-1.5 flex-1 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full select-none">
                                ID: {pop.id}
                              </span>
                              {pop.type && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                  {pop.type}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pop.showOnce ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}
                              >
                                {pop.showOnce ? "Show Once" : "Repeat"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-800">
                              {pop.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {pop.body || "No body text content"}
                            </p>
                            <div className="flex items-center gap-3 text-2xs text-gray-400">
                              {pop.triggerOn && (
                                <span>
                                  Trigger: {pop.triggerOn}
                                  {pop.triggerValue && pop.triggerValue !== "0"
                                    ? ` (${pop.triggerValue})`
                                    : ""}
                                </span>
                              )}
                              {pop.buttonText && (
                                <span>Button: {pop.buttonText}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1.5 items-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setActiveTestPopup(pop)}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Preview simulator"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() => openPopupModal(index)}
                              className="p-1.5 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit popup"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePopup(index)}
                              className="p-1.5 bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete popup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Footer */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400 font-medium">
                Changes are temporary until saved to the database.
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
                style={{ background: "var(--admin-accent, #0f7c85)" }}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Premium Visual Simulator Box */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden sticky top-6">
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-mono text-gray-400 select-none uppercase tracking-widest font-bold">
                Mock Website Preview
              </span>
            </div>

            <div className="relative bg-slate-100 p-6 min-h-[350px] flex flex-col justify-between overflow-hidden">
              {/* Header Mock */}
              <div className="bg-white rounded-lg px-4 py-2.5 shadow-xs border border-gray-100/80 flex justify-between items-center select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                    G
                  </div>
                  <span className="text-xs font-bold text-gray-700">Brand</span>
                </div>

                {/* Main CTA button rendered here */}
                {main.text ? (
                  <a
                    href={main.link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {main.text}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium italic border border-dashed border-gray-200 px-2 py-1 rounded">
                    No main CTA configured
                  </span>
                )}
              </div>

              {/* Body Mock */}
              <div className="my-6 text-center space-y-2 select-none">
                <h4 className="text-xs font-extrabold text-gray-800 tracking-tight">
                  Experience Global Backend
                </h4>
                <p className="text-[10px] text-gray-500 max-w-[200px] mx-auto leading-relaxed">
                  Interactive items load instantly and adapt gracefully across
                  tenant viewports.
                </p>
              </div>

              {/* Floating Buttons Rendered Here (Bottom Right) */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 select-none items-end max-h-[140px] overflow-y-auto pr-1">
                {floatingButtons.length === 0 ? (
                  <span className="text-[9px] text-gray-400 bg-gray-50/90 border border-gray-200/50 px-2 py-1 rounded-sm shadow-xs select-none">
                    No Floating Buttons
                  </span>
                ) : (
                  floatingButtons
                    .filter((btn) => btn.enabled !== false)
                    .map((btn) => (
                      <a
                        key={btn.id}
                        href={btn.link || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 text-white rounded-full text-[9px] font-bold shadow-md hover:shadow-lg hover:-translate-x-1 transition-all flex items-center gap-1 cursor-pointer border border-slate-700 max-w-[150px] truncate"
                        style={{ backgroundColor: btn.color || "#1e293b" }}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-yellow-400 shrink-0" />
                        <span className="truncate">{btn.label}</span>
                      </a>
                    ))
                )}
              </div>

              {/* Popups test indicators */}
              <div className="absolute bottom-4 left-4 flex gap-1 select-none">
                <span className="text-[9px] text-gray-400 bg-white/80 backdrop-blur-xs px-2 py-1 rounded shadow-xs font-medium">
                  {popups.length} Active Popups
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button Modal - Extended */}
      {btnModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 transform transition-all scale-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">
                {btnEditingIndex !== null
                  ? "Edit Floating Button"
                  : "Add Floating Button"}
              </h3>
              <button
                type="button"
                onClick={() => setBtnModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBtnSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label
                    htmlFor="btnLabel"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Button Label
                  </label>
                  <input
                    type="text"
                    id="btnLabel"
                    value={btnForm.label}
                    onChange={(e) =>
                      setBtnForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                    required
                    placeholder="e.g. Chat on WhatsApp"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label
                    htmlFor="btnLink"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Link / Action Link
                  </label>
                  <input
                    type="text"
                    id="btnLink"
                    value={btnForm.link}
                    onChange={(e) =>
                      setBtnForm((prev) => ({ ...prev, link: e.target.value }))
                    }
                    placeholder="e.g. https://wa.me/..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="btnIcon"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Icon / Custom Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="btnIcon"
                      list="iconOptions"
                      value={btnForm.icon}
                      onChange={(e) =>
                        setBtnForm((prev) => ({ ...prev, icon: e.target.value }))
                      }
                      placeholder="e.g. message-circle or https://..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <datalist id="iconOptions">
                      <option value="phone" />
                      <option value="mail" />
                      <option value="message-circle" />
                      <option value="message-square" />
                      <option value="map" />
                      <option value="share" />
                      <option value="instagram" />
                      <option value="facebook" />
                      <option value="twitter" />
                      <option value="youtube" />
                      <option value="help" />
                      <option value="info" />
                      <option value="sparkles" />
                    </datalist>
                    <button
                      type="button"
                      onClick={() => setMediaPickerType("btnIcon")}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="btnPosition"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Position
                  </label>
                  <select
                    id="btnPosition"
                    value={btnForm.position}
                    onChange={(e) =>
                      setBtnForm((prev) => ({
                        ...prev,
                        position: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="btnColor"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                  >
                    <Palette className="w-3 h-3" />
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="btnColor"
                      value={btnForm.color}
                      onChange={(e) =>
                        setBtnForm((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="w-10 h-10 p-1 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={btnForm.color}
                      onChange={(e) =>
                        setBtnForm((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="btnTextColor"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                  >
                    <Palette className="w-3 h-3" />
                    Text & Icon Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="btnTextColor"
                      value={btnForm.textColor || "#ffffff"}
                      onChange={(e) =>
                        setBtnForm((prev) => ({
                          ...prev,
                          textColor: e.target.value,
                        }))
                      }
                      className="w-10 h-10 p-1 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={btnForm.textColor || "#ffffff"}
                      onChange={(e) =>
                        setBtnForm((prev) => ({
                          ...prev,
                          textColor: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setBtnForm((prev) => ({
                          ...prev,
                          enabled: !prev.enabled,
                        }))
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors ${btnForm.enabled !== false ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${btnForm.enabled !== false ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-gray-700">
                      {btnForm.enabled !== false ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="btnId"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  Custom Button ID
                  <span className="text-[10px] text-gray-400 font-medium normal-case font-normal">
                    (Optional, auto-generated if blank)
                  </span>
                </label>
                <input
                  type="text"
                  id="btnId"
                  value={btnForm.id}
                  onChange={(e) =>
                    setBtnForm((prev) => ({ ...prev, id: e.target.value }))
                  }
                  placeholder="e.g. whatsapp-support"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setBtnModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Save Button
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Editor Modal - Extended */}
      {popupModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 transform transition-all scale-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">
                {popupEditingIndex !== null
                  ? "Edit Popup Settings"
                  : "Create New Popup"}
              </h3>
              <button
                type="button"
                onClick={() => setPopupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePopupSave} className="p-6 space-y-4">
              {/* Popup Type */}
              <div>
                <label
                  htmlFor="popupType"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Popup Type
                </label>
                <select
                  id="popupType"
                  value={popupForm.type}
                  onChange={(e) =>
                    setPopupForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  {POPUP_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="popupTitle"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Popup Title
                </label>
                <input
                  type="text"
                  id="popupTitle"
                  value={popupForm.title}
                  onChange={(e) =>
                    setPopupForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                  placeholder="e.g. Subscribe to our newsletter"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="popupBody"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Popup Body Content
                </label>
                <textarea
                  id="popupBody"
                  value={popupForm.body}
                  onChange={(e) =>
                    setPopupForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  rows={3}
                  placeholder="e.g. Get 10% off your next purchase and stays updated."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="popupImage"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Popup Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="popupImage"
                    value={popupForm.imageUrl || ""}
                    onChange={(e) =>
                      setPopupForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="e.g. https://... or /images/..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerType("popupImage")}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Browse
                  </button>
                </div>
              </div>

              {/* Button Text & Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="popupButtonText"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Button Text
                  </label>
                  <input
                    type="text"
                    id="popupButtonText"
                    value={popupForm.buttonText}
                    onChange={(e) =>
                      setPopupForm((prev) => ({
                        ...prev,
                        buttonText: e.target.value,
                      }))
                    }
                    placeholder="e.g. Subscribe Now"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="popupButtonLink"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Button Link
                  </label>
                  <input
                    type="text"
                    id="popupButtonLink"
                    value={popupForm.buttonLink}
                    onChange={(e) =>
                      setPopupForm((prev) => ({
                        ...prev,
                        buttonLink: e.target.value,
                      }))
                    }
                    placeholder="e.g. /download/guide.pdf"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Trigger Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="popupTriggerOn"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                    >
                      Trigger Event
                    </label>
                    <select
                      id="popupTriggerOn"
                      value={popupForm.triggerOn}
                      onChange={(e) =>
                        setPopupForm((prev) => ({
                          ...prev,
                          triggerOn: e.target.value,
                          triggerValue:
                            e.target.value === "page-load" ||
                              e.target.value === "exit-intent"
                              ? "0"
                              : prev.triggerValue,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      {TRIGGER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="popupTriggerValue"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                    >
                      Value
                    </label>
                    <input
                      type="text"
                      id="popupTriggerValue"
                      value={popupForm.triggerValue}
                      onChange={(e) =>
                        setPopupForm((prev) => ({
                          ...prev,
                          triggerValue: e.target.value,
                        }))
                      }
                      disabled={
                        popupForm.triggerOn === "page-load" ||
                        popupForm.triggerOn === "exit-intent"
                      }
                      placeholder={
                        TRIGGER_OPTIONS.find(
                          (o) => o.value === popupForm.triggerOn,
                        )?.placeholder || ""
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Show Once Toggle */}
              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Show Once Per Visitor
                    </p>
                    <p className="text-2xs text-gray-400 mt-0.5">
                      If enabled, the popup will only appear once per browser
                      session.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPopupForm((prev) => ({
                        ...prev,
                        showOnce: !prev.showOnce,
                      }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${popupForm.showOnce ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${popupForm.showOnce ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </label>
              </div>

              <div>
                <label
                  htmlFor="popupId"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  Custom Popup ID
                  <span className="text-[10px] text-gray-400 font-medium normal-case font-normal">
                    (Optional, auto-generated if blank)
                  </span>
                </label>
                <input
                  type="text"
                  id="popupId"
                  value={popupForm.id}
                  onChange={(e) =>
                    setPopupForm((prev) => ({ ...prev, id: e.target.value }))
                  }
                  placeholder="e.g. newsletter-popup"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPopupModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Save Popup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Live Test Simulator Backdrop Modal */}
      {activeTestPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 relative transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            {/* Close Circle Link */}
            <button
              onClick={() => setActiveTestPopup(null)}
              className="absolute top-4 right-4 w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title="Close simulator"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Test Indicator badge */}
            <div className="absolute top-4 left-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 animate-spin" />
                SIMULATOR
              </span>
            </div>

            {/* Popup Type Badge */}
            {activeTestPopup.type && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {activeTestPopup.type}
                </span>
              </div>
            )}

            {/* Main Pop Body content */}
            <div className="p-8 pt-16 text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Megaphone className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight leading-snug">
                  {activeTestPopup.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {activeTestPopup.body ||
                    "No body content. Double-check your settings parameters."}
                </p>
              </div>

              {/* Button rendered if present */}
              {activeTestPopup.buttonText && (
                <a
                  href={activeTestPopup.buttonLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors text-center"
                >
                  {activeTestPopup.buttonText}
                </a>
              )}

              {/* Dummy Subscribe Input Form when no button text */}
              {!activeTestPopup.buttonText && (
                <div className="pt-3 space-y-2">
                  <input
                    type="email"
                    placeholder="Enter email address..."
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 select-none cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveTestPopup(null)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    Submit Form
                  </button>
                </div>
              )}

              <div className="text-[10px] text-gray-400 italic pt-1 space-y-1">
                <p>
                  Type:{" "}
                  <span className="font-mono font-semibold">
                    {activeTestPopup.type}
                  </span>
                </p>
                <p>
                  Trigger:{" "}
                  <span className="font-mono font-semibold">
                    {activeTestPopup.triggerOn}
                    {activeTestPopup.triggerValue &&
                      activeTestPopup.triggerValue !== "0"
                      ? ` (${activeTestPopup.triggerValue})`
                      : ""}
                  </span>
                </p>
                {activeTestPopup.showOnce && (
                  <p className="text-amber-600 font-semibold">
                    Show Once: Enabled
                  </p>
                )}
                <p>
                  ID: <span className="font-mono">{activeTestPopup.id}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {mediaPickerType && (
        <MediaPickerModal
          siteId={siteId}
          onClose={() => setMediaPickerType(null)}
          onSelect={(media) => {
            const url = media.secureUrl || media.url;
            if (mediaPickerType === "btnIcon") {
              setBtnForm((prev) => ({ ...prev, icon: url }));
            } else if (mediaPickerType === "popupImage") {
              setPopupForm((prev) => ({ ...prev, imageUrl: url }));
            } else if (mediaPickerType === "mainIcon") {
              setMain((prev) => ({ ...prev, icon: url }));
            }
            setMediaPickerType(null);
          }}
        />
      )}
    </div>
  );
}

