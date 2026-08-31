"use client";

import { useState } from "react";
import { Save, Plus, Trash2, ArrowRight } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function FooterEditor({
  siteId,
  initialConfig,
  navigation = {},
  menuTypes = [],
}) {
  const defaultConfig = {
    layout: "5-columns",
    copyright: `© ${new Date().getFullYear()} Company Name. All rights reserved.`,
    columns: [
      {
        type: "logo_desc",
        title: "About Us",
        logoUrl: "/next.svg",
        description:
          "We deliver cutting edge solutions to power modern digital experiences. Scoped multi-site content management at scale.",
      },
      {
        type: "links",
        title: "Explore",
        links: [
          { label: "Home", url: "/" },
          { label: "Health Topics", url: "/blogs" },
          { label: "Recipes", url: "/recipes" },
          { label: "Services", url: "/services" },
          { label: "Contact Us", url: "/contact" },
        ],
      },
      {
        type: "links",
        title: "Quick Links",
        links: [
          { label: "About Us", url: "/about" },
          { label: "Events", url: "/events" },
          { label: "Shop", url: "/publication" },
          { label: "Quiz", url: "/quizzes" },
        ],
      },
      {
        type: "links",
        title: "Legal",
        links: [
          { label: "Privacy Policy", url: "/legal/privacy" },
          { label: "Terms of Service", url: "/legal/terms" },
          { label: "Disclaimer", url: "/legal/disclaimer" },
        ],
      },
      {
        type: "links",
        title: "Community",
        links: [
          { label: "Join Our Community", url: "/info?tab=contact" },
          { label: "Share Your Story", url: "/recipes/submit" },
          { label: "Suggest a Topic", url: "/info?tab=contact" },
          { label: "Become a Contributor", url: "/info?tab=contact" },
        ],
      },
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://www.instagram.com/ahealthplace/', visible: true },
      { platform: 'facebook', url: 'https://www.facebook.com/ahealthplace', visible: true },
      { platform: 'linkedin', url: 'https://www.linkedin.com/company/a-health-place/', visible: true },
      { platform: 'youtube', url: 'https://www.youtube.com/@ahealthplace', visible: true },
      { platform: 'pinterest', url: 'https://uk.pinterest.com/ahealthyplace/_saved', visible: true }
    ],
  };

  const isValidConfig = (cfg) => {
    return (
      cfg &&
      typeof cfg === "object" &&
      typeof cfg.layout === "string" &&
      Array.isArray(cfg.columns) &&
      cfg.columns.length >= 0
    );
  };

  const getInitialConfig = () => {
    if (isValidConfig(initialConfig)) {
      const cfg = { ...initialConfig };
      if (!cfg.columns) {
        cfg.columns = [];
      }
      while (cfg.columns.length < 5) {
        cfg.columns.push({
          type: "links",
          title: cfg.columns.length === 4 ? "Community" : "Quick Links",
          links: [],
        });
      }
      if (!cfg.socialLinks) {
        cfg.socialLinks = [...defaultConfig.socialLinks];
      }
      return cfg;
    }
    return defaultConfig;
  };

  const [config, setConfig] = useState(getInitialConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const handleMediaSelect = (media) => {
    updateColumnField(editingColIdx, "logoUrl", media.secureUrl || media.url);
    setShowMediaPicker(false);
  };

  // Active column being edited in panel (0 to 4)
  const [editingColIdx, setEditingColIdx] = useState(0);

  const getColCount = () => {
    if (config.colCount) return config.colCount;
    if (config.layout === "1-columns" || config.layout === "minimal") return 1;
    if (config.layout === "2-columns") return 2;
    if (config.layout === "3-columns") return 3;
    if (config.layout === "4-columns") return 4;
    return 5;
  };
  const colCount = getColCount();

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const savedConfig = {
        ...config,
        colCount,
        layout: `${colCount}-columns`
      };

      const res = await fetch("/api/dashboard/footer", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(savedConfig),
      });

      if (!res.ok) {
        throw new Error("Failed to save footer layout");
      }

      setSuccess("Footer layout configuration saved successfully!");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateColumnField = (colIdx, fieldName, value) => {
    setConfig((prev) => {
      const updatedCols = [...prev.columns];
      updatedCols[colIdx] = {
        ...updatedCols[colIdx],
        [fieldName]: value,
      };
      return { ...prev, columns: updatedCols };
    });
  };

  const handleAddLinkItem = (colIdx) => {
    setConfig((prev) => {
      const updatedCols = [...prev.columns];
      const links = [...(updatedCols[colIdx].links || [])];
      links.push({ label: "New Link", url: "#" });
      updatedCols[colIdx] = { ...updatedCols[colIdx], links };
      return { ...prev, columns: updatedCols };
    });
  };

  const handleRemoveLinkItem = (colIdx, itemIdx) => {
    setConfig((prev) => {
      const updatedCols = [...prev.columns];
      const links = (updatedCols[colIdx].links || []).filter(
        (_, idx) => idx !== itemIdx,
      );
      updatedCols[colIdx] = { ...updatedCols[colIdx], links };
      return { ...prev, columns: updatedCols };
    });
  };

  const handleUpdateLinkItem = (colIdx, itemIdx, key, val) => {
    setConfig((prev) => {
      const updatedCols = [...prev.columns];
      const links = [...(updatedCols[colIdx].links || [])];
      links[itemIdx] = { ...links[itemIdx], [key]: val };
      updatedCols[colIdx] = { ...updatedCols[colIdx], links };
      return { ...prev, columns: updatedCols };
    });
  };

  const renderConfigurator = (col, idx) => {
    return (
      <div className="space-y-4 pt-2">
        {/* Visibility Toggle Option */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <span className="text-xs font-bold text-gray-700 block">Column Visibility</span>
            <span className="text-[11px] text-gray-500">Show or hide this column in the website footer</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border shadow-2xs hover:bg-gray-50">
            <input
              type="checkbox"
              checked={col.visible !== false && col.type !== "hidden"}
              onChange={(e) => updateColumnField(idx, "visible", e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className={col.visible !== false && col.type !== "hidden" ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>
              {col.visible !== false && col.type !== "hidden" ? "Visible" : "Hidden"}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Column Title
          </label>
          <input
            type="text"
            value={col.title || ""}
            onChange={(e) => updateColumnField(idx, "title", e.target.value)}
            className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Column Block Type
          </label>
          <select
            value={col.type}
            onChange={(e) => updateColumnField(idx, "type", e.target.value)}
            className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
          >
            <option value="logo_desc">Logo & Description</option>
            <option value="links">Quick Navigation Links</option>
            <option value="contact">Contact Details</option>
            <option value="newsletter">Newsletter Form</option>
            <option value="hidden">Hidden / Do Not Show</option>
          </select>
        </div>

        {/* LOGO & DESC FIELDS */}
        {col.type === "logo_desc" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Logo URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={col.logoUrl || ""}
                  onChange={(e) =>
                    updateColumnField(idx, "logoUrl", e.target.value)
                  }
                  className="flex-1 min-w-0 rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-gray-200 text-slate-700 text-xs font-semibold rounded-lg transition shrink-0"
                >
                  Choose
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Description Text
              </label>
              <textarea
                value={col.description || ""}
                onChange={(e) =>
                  updateColumnField(idx, "description", e.target.value)
                }
                rows={3}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
          </div>
        )}

        {/* QUICK LINKS FIELDS */}
        {col.type === "links" && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Links Source Type
              </label>
              <select
                value={col.sourceType || "manual"}
                onChange={(e) =>
                  updateColumnField(idx, "sourceType", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
              >
                <option value="manual">Manual Links</option>
                <option value="navigation">Synced Navigation Menu</option>
              </select>
            </div>

            {col.sourceType === "navigation" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Select Navigation Menu
                </label>
                <select
                  value={col.menuType || "footer"}
                  onChange={(e) =>
                    updateColumnField(idx, "menuType", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                >
                  {(menuTypes.length > 0 ? menuTypes : ["main", "footer"]).map(
                    (menuName) => (
                      <option key={menuName} value={menuName}>
                        {menuName.toUpperCase()} menu
                      </option>
                    ),
                  )}
                </select>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-normal">
                  Links in this column will dynamically sync with changes made
                  in the Navigation & Menus builder.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-gray-500">
                    Navigation Links
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddLinkItem(idx)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(col.links || []).map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border"
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          handleUpdateLinkItem(
                            idx,
                            itemIdx,
                            "label",
                            e.target.value,
                          )
                        }
                        className="w-1/2 min-w-0 rounded border border-gray-200 p-1.5 text-xs outline-none focus:border-blue-600"
                        placeholder="Label"
                      />
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) =>
                          handleUpdateLinkItem(
                            idx,
                            itemIdx,
                            "url",
                            e.target.value,
                          )
                        }
                        className="w-1/2 min-w-0 rounded border border-gray-200 p-1.5 text-xs outline-none focus:border-blue-600 font-mono"
                        placeholder="URL Route"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLinkItem(idx, itemIdx)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {(col.links || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No links added. Click 'Add Item'.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTACT DETAILS FIELDS */}
        {col.type === "contact" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={col.phone || ""}
                onChange={(e) =>
                  updateColumnField(idx, "phone", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={col.email || ""}
                onChange={(e) =>
                  updateColumnField(idx, "email", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Office Address
              </label>
              <input
                type="text"
                value={col.address || ""}
                onChange={(e) =>
                  updateColumnField(idx, "address", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
          </div>
        )}

        {/* NEWSLETTER FIELDS */}
        {col.type === "newsletter" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Input Placeholder
              </label>
              <input
                type="text"
                value={col.newsletterPlaceholder || ""}
                onChange={(e) =>
                  updateColumnField(
                    idx,
                    "newsletterPlaceholder",
                    e.target.value,
                  )
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={col.newsletterButtonText || ""}
                onChange={(e) =>
                  updateColumnField(idx, "newsletterButtonText", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderColumnPreview = (col, idx) => {
    return (
      <div key={idx} className="space-y-3 text-slate-300">
        <h4 className="font-semibold text-white tracking-wide text-xs uppercase border-b border-slate-700 pb-1.5">
          {col.title || "Untitled Block"}
        </h4>

        {col.type === "logo_desc" && (
          <div className="space-y-2">
            {col.logoUrl && (
              <div className="h-6 w-20 relative select-none opacity-85">
                <span className="font-bold text-white text-sm font-mono tracking-tight">
                  LOGO
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {col.description || "No description text."}
            </p>
          </div>
        )}

        {col.type === "links" && (
          <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium text-left">
            {col.sourceType === "navigation"
              ? (navigation[col.menuType || "footer"] || []).map(
                  (item, linkIdx) => (
                    <li key={linkIdx}>
                      <a
                        href={item.url}
                        onClick={(e) => e.preventDefault()}
                        className="hover:text-white transition flex items-center gap-1"
                      >
                        <span>•</span> {item.label}
                      </a>
                    </li>
                  ),
                )
              : (col.links || []).map((item, linkIdx) => (
                  <li key={linkIdx}>
                    <a
                      href={item.url}
                      onClick={(e) => e.preventDefault()}
                      className="hover:text-white transition flex items-center gap-1"
                    >
                      <span>•</span> {item.label}
                    </a>
                  </li>
                ))}
            {(col.sourceType === "navigation"
              ? navigation[col.menuType || "footer"] || []
              : col.links || []
            ).length === 0 && (
              <span className="italic text-slate-500 text-[10px]">
                No links configured
              </span>
            )}
          </ul>
        )}

        {col.type === "contact" && (
          <div className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed font-sans">
            {col.phone && <p>📞 {col.phone}</p>}
            {col.email && <p>✉️ {col.email}</p>}
            {col.address && <p>📍 {col.address}</p>}
            {!col.phone && !col.email && !col.address && (
              <span className="italic text-slate-500 text-[10px]">
                No details configured
              </span>
            )}
          </div>
        )}

        {col.type === "newsletter" && (
          <div className="space-y-2 font-sans">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <input
                disabled
                type="text"
                placeholder={col.newsletterPlaceholder || "your@email.com"}
                className="bg-transparent border-none text-[10px] w-full px-2 text-slate-400 outline-none"
              />
              <button
                disabled
                className="bg-blue-600 text-white rounded text-[10px] px-2.5 py-1 font-semibold"
              >
                {col.newsletterButtonText || "Send"}
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Subscribe to receive regular updates.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl animate-pulse">
          {success}
        </div>
      )}

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Configurations Panel */}
        <div className="xl:col-span-1 space-y-6 bg-white border p-6 rounded-xl shadow-sm min-w-0">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900">Layout Configurations</h3>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Config"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                Footer Column Count (Frontend Display)
              </label>
              <select
                value={`${colCount}-columns`}
                onChange={(e) => {
                  const count = parseInt(e.target.value, 10) || 5;
                  setConfig((prev) => ({
                    ...prev,
                    colCount: count,
                    layout: `${count}-columns`,
                  }));
                }}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-semibold bg-white"
              >
                <option value="1-columns">1 Column (Logo / Brand Only)</option>
                <option value="2-columns">2 Columns</option>
                <option value="3-columns">3 Columns</option>
                <option value="4-columns">4 Columns</option>
                <option value="5-columns">5 Columns (Full Multi-Column)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Select how many columns will be active and shown on the live website.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Copyright Text Footer Line
              </label>
              <input
                type="text"
                required
                value={config.copyright}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, copyright: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-sans"
              />
            </div>

            <div className="border-t pt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Social Links</span>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    socialLinks: [...(prev.socialLinks || []), { platform: 'instagram', url: '', visible: true }]
                  }))}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Add Link
                </button>
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(config.socialLinks || []).map((social, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <select
                      value={social.platform}
                      onChange={(e) => {
                        const newLinks = [...config.socialLinks];
                        newLinks[idx].platform = e.target.value;
                        setConfig(prev => ({ ...prev, socialLinks: newLinks }));
                      }}
                      className="w-24 rounded border border-gray-200 px-2 py-1.5 outline-none text-xs bg-white"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="pinterest">Pinterest</option>
                      <option value="twitter">Twitter</option>
                    </select>
                    <input
                      type="text"
                      value={social.url}
                      onChange={(e) => {
                        const newLinks = [...config.socialLinks];
                        newLinks[idx].url = e.target.value;
                        setConfig(prev => ({ ...prev, socialLinks: newLinks }));
                      }}
                      className="flex-1 rounded border border-gray-200 px-2 py-1.5 outline-none text-xs"
                      placeholder="https://..."
                    />
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={social.visible !== false}
                        onChange={(e) => {
                          const newLinks = [...config.socialLinks];
                          newLinks[idx].visible = e.target.checked;
                          setConfig(prev => ({ ...prev, socialLinks: newLinks }));
                        }}
                        className="rounded text-blue-600 w-3 h-3"
                      />
                      <span className="text-[10px] text-gray-500 font-medium">Vis</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newLinks = config.socialLinks.filter((_, i) => i !== idx);
                        setConfig(prev => ({ ...prev, socialLinks: newLinks }));
                      }}
                      className="text-gray-400 hover:text-red-500 transition shrink-0 ml-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>



            {colCount > 0 ? (
              <div className="border-t pt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Column Editor Select
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {Array.from({ length: colCount }).map((_, idx) => {
                    const col = config.columns[idx] || {};
                    const isHidden = col.visible === false || col.type === "hidden";
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingColIdx(idx)}
                        className={`py-2 px-3 min-w-[70px] rounded-lg text-xs font-bold border transition flex flex-col items-center justify-center ${
                          editingColIdx === idx
                            ? "bg-blue-50 border-blue-500 text-blue-600 shadow-2xs"
                            : isHidden
                            ? "bg-amber-50/60 border-amber-200 text-amber-700 hover:bg-amber-100/70"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>Column {idx + 1}</span>
                        {isHidden && (
                          <span className="text-[9px] font-extrabold uppercase text-amber-600">
                            (Hidden)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border-t pt-4 text-xs text-gray-400 italic">
                Minimalist footer layout does not use column blocks.
              </div>
            )}

            {/* Column configurer block */}
            {colCount > 0 && (
              <div className="bg-gray-50/50 p-4 border rounded-xl animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-gray-700 mb-2 border-b pb-1">
                  Editing Column Block {editingColIdx + 1}
                </h4>
                {renderConfigurator(
                  config.columns[editingColIdx],
                  editingColIdx,
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Mock Render Preview Panel */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Live Mock Preview
            </h3>
            <span className="text-[10px] bg-slate-100 border text-slate-500 px-2 py-0.5 rounded font-mono">
              Desktop Rendering View
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden min-h-70 flex flex-col justify-between p-8 font-sans">
            {/* Grid Columns - Auto Arranges Dynamically Based on colCount */}
            <div
              className={`grid grid-cols-1 gap-6 w-full ${
                colCount === 1
                  ? "md:grid-cols-1"
                  : colCount === 2
                  ? "md:grid-cols-2"
                  : colCount === 3
                  ? "md:grid-cols-3"
                  : colCount === 4
                  ? "md:grid-cols-4"
                  : "md:grid-cols-5"
              }`}
            >
              {config.columns
                .slice(0, colCount)
                .map((col, idx) => renderColumnPreview(col, idx))}
            </div>

            {/* Footer Bottom copyright and layout info */}
            <div className="border-t border-slate-800 pt-6 mt-10 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-3">
              <p>
                {config.copyright.replace(
                  "{year}",
                  new Date().getFullYear().toString(),
                )}
              </p>
              <div className="flex gap-4">
                <span>Privacy Policies</span>
                <span>Terms of Service</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showMediaPicker && (
        <MediaPickerModal
          siteId={siteId}
          filter="images"
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </form>
  );
}

