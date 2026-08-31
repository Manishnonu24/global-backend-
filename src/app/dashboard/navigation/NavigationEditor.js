"use client";

import { useState } from "react";
import {
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function NavigationEditor({
  siteId,
  initialNavigation,
  availablePages,
}) {
  const [activeTab, setActiveTab] = useState("main");
  const [navigation, setNavigation] = useState(initialNavigation || {});

  // Active items list based on current active tab
  const items = navigation[activeTab] || [];

  // Edit Form States
  const [editingIndex, setEditingIndex] = useState(null); // number (for parent index)
  const [editingSubIndex, setEditingSubIndex] = useState(null); // number (if editing child)
  const [formLabel, setFormLabel] = useState("");
  const [formLinkType, setFormLinkType] = useState("internal"); // "internal" or "external"
  const [formUrl, setFormUrl] = useState("");
  const [isDropdown, setIsDropdown] = useState(false);

  // Status indicators
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const saveNavigation = async (updatedItems) => {
    const newNav = {
      ...navigation,
      [activeTab]: updatedItems,
    };

    // Optimistically update local state
    setNavigation(newNav);
  };

  const handleSaveToServer = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Save Main Header Menu
      const mainRes = await fetch(`/api/dashboard/navigation/main`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(navigation.main || []),
      });

      if (!mainRes.ok) {
        const data = await mainRes.json();
        throw new Error(data.error || "Failed to save Main Menu");
      }

      // Save Footer Menu
      const footerRes = await fetch(`/api/dashboard/navigation/footer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(navigation.footer || []),
      });

      if (!footerRes.ok) {
        const data = await footerRes.json();
        throw new Error(data.error || "Failed to save Footer Menu");
      }

      setMessage({
        type: "success",
        text: "Navigation menus configuration saved successfully!",
      });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    const newItem = {
      label: "New Navigation Link",
      url: "/",
      type: "internal",
      children: [],
    };
    const updated = [...items, newItem];
    saveNavigation(updated);
    // Auto-select this item for editing
    openEditForm(updated.length - 1, null, newItem);
  };

  const handleAddSubItem = (parentIndex) => {
    const updated = [...items];
    const parent = updated[parentIndex];
    if (!parent.children) {
      parent.children = [];
    }
    const newSubItem = {
      label: "New Sub-item",
      url: "/",
      type: "internal",
    };
    parent.children.push(newSubItem);
    saveNavigation(updated);
    openEditForm(parentIndex, parent.children.length - 1, newSubItem);
  };

  const handleRemoveItem = (parentIndex, subIndex = null) => {
    const updated = [...items];
    if (subIndex === null) {
      updated.splice(parentIndex, 1);
    } else {
      updated[parentIndex].children.splice(subIndex, 1);
    }
    saveNavigation(updated);
    setEditingIndex(null);
    setEditingSubIndex(null);
  };

  const handleReorder = (index, direction, subIndex = null) => {
    const updated = [...items];
    if (subIndex === null) {
      if (direction === "up" && index > 0) {
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
      } else if (direction === "down" && index < updated.length - 1) {
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
      }
    } else {
      const children = updated[index].children;
      if (direction === "up" && subIndex > 0) {
        const temp = children[subIndex];
        children[subIndex] = children[subIndex - 1];
        children[subIndex - 1] = temp;
      } else if (direction === "down" && subIndex < children.length - 1) {
        const temp = children[subIndex];
        children[subIndex] = children[subIndex + 1];
        children[subIndex + 1] = temp;
      }
    }
    saveNavigation(updated);
  };

  const openEditForm = (index, subIndex, item) => {
    setEditingIndex(index);
    setEditingSubIndex(subIndex);
    setFormLabel(item.label || "");
    setFormLinkType(item.type || "internal");
    setFormUrl(item.url || "");
    setIsDropdown(!!(item.children && item.children.length > 0));
  };

  const handleFormSave = (e) => {
    e.preventDefault();
    if (editingIndex === null) return;

    const updated = [...items];
    if (editingSubIndex === null) {
      const currentItem = updated[editingIndex];
      updated[editingIndex] = {
        ...currentItem,
        label: formLabel,
        type: formLinkType,
        url: formUrl,
        children: isDropdown ? currentItem.children || [] : [],
      };
    } else {
      updated[editingIndex].children[editingSubIndex] = {
        label: formLabel,
        type: formLinkType,
        url: formUrl,
      };
    }

    saveNavigation(updated);
    setEditingIndex(null);
    setEditingSubIndex(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditingIndex(null);
    setEditingSubIndex(null);
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 border-l-4 rounded-lg flex items-start gap-3 shadow-sm ${message.type === "success"
              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
              : "bg-red-50 border-red-500 text-red-800"
            }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider">
              {message.type === "success" ? "Success" : "Error"}
            </p>
            <p className="text-xs">{message.text}</p>
          </div>
        </div>
      )}

      {/* Editor Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col md:flex-row">
        {/* Left Side: Navigation Items Tree */}
        <div className="w-full md:w-3/5 p-6 border-r border-gray-250/80 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Tabs & Save Button */}
            <div className="flex justify-between items-center border-b pb-3.5">
              <div className="bg-gray-200 p-0.5 rounded-lg flex border border-gray-300">
                <button
                  type="button"
                  onClick={() => handleTabChange("main")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === "main"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-700 hover:text-gray-900"
                    }`}
                >
                  Main Header Menu
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("footer")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === "footer"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-700 hover:text-gray-900"
                    }`}
                >
                  Footer Menu
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToServer}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-white rounded-lg text-xs font-bold px-3.5 py-1.8 shadow-sm transition disabled:opacity-50 cursor-pointer"
                style={{ background: "var(--admin-accent, #0f7c85)" }}
              >
                <Save size={13} />
                {isSaving ? "Saving..." : "Save Menu"}
              </button>
            </div>

            {/* Menu items list */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {items.map((item, parentIdx) => (
                <div key={parentIdx} className="space-y-2">
                  {/* Parent Menu Item Block */}
                  <div
                    className={`flex flex-wrap items-center justify-between p-3 border rounded-xl gap-2 transition ${editingIndex === parentIdx && editingSubIndex === null
                        ? "bg-blue-50/50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600"
                        : "bg-gray-50/40 border-gray-200 dark:bg-slate-800 dark:border-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={parentIdx === 0}
                          onClick={() => handleReorder(parentIdx, "up")}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={parentIdx === items.length - 1}
                          onClick={() => handleReorder(parentIdx, "down")}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">
                            {item.label}
                          </span>
                          <span
                            className={`text-[8px] px-1.5 py-0.2 rounded-full border shrink-0 ${item.type === "external"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                              }`}
                          >
                            {item.type === "external" ? "External" : "Internal"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-full">
                          {item.url || "/"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddSubItem(parentIdx)}
                        className="text-[10px] bg-white dark:bg-slate-700 border dark:border-slate-600 hover:bg-gray-55/70 dark:hover:bg-slate-600 hover:border-gray-300 text-gray-600 dark:text-gray-300 font-bold px-2 py-1 rounded"
                        title="Add dropdown sub-item"
                      >
                        + Dropdown
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(parentIdx, null, item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(parentIdx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Children Sub-items blocks */}
                  {(item.children || []).map((subItem, childIdx) => (
                    <div
                      key={childIdx}
                      className={`flex flex-wrap items-center justify-between p-2.5 border rounded-xl ml-8 gap-2 transition ${editingIndex === parentIdx &&
                          editingSubIndex === childIdx
                          ? "bg-blue-50/30 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700"
                          : "bg-white border-gray-150 dark:bg-slate-800/50 dark:border-slate-700"
                        }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={childIdx === 0}
                            onClick={() =>
                              handleReorder(parentIdx, "up", childIdx)
                            }
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            disabled={childIdx === item.children.length - 1}
                            onClick={() =>
                              handleReorder(parentIdx, "down", childIdx)
                            }
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 truncate">
                              {subItem.label}
                            </span>
                            <span className="text-[7px] text-gray-400 uppercase tracking-wider font-semibold shrink-0">
                              • Sub-item
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 font-mono truncate max-w-full">
                            {subItem.url}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(parentIdx, childIdx, subItem)
                          }
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(parentIdx, childIdx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-12 bg-gray-100 dark:bg-slate-800/50 rounded-xl border border-dashed dark:border-slate-700 text-gray-700 dark:text-gray-300 space-y-2">
                  <p className="text-xs italic font-medium">
                    No menu links configured. Click "Add Main Item" to start.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 py-3 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100/50 dark:bg-slate-800/50 transition-all mt-4"
          >
            <Plus size={14} />
            Add Main Item
          </button>
        </div>

        {/* Right Side: Edit Item Form Pane */}
        <div className="w-full md:w-2/5 p-6 bg-gray-50/40 flex flex-col justify-between min-h-[400px]">
          {editingIndex !== null ? (
            <form
              onSubmit={handleFormSave}
              className="space-y-5 flex-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                    Edit Menu Item{" "}
                    {editingSubIndex !== null
                      ? `(Dropdown Link)`
                      : `(Root Link)`}
                  </h4>
                </div>

                {/* Label */}
                <div>
                  <label
                    htmlFor="form_label"
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5"
                  >
                    Link Label Text
                  </label>
                  <input
                    type="text"
                    id="form_label"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full rounded-xl border border-gray-250 bg-white px-3.5 py-2.5 outline-none focus:border-blue-500 text-xs font-semibold text-gray-800"
                    placeholder="e.g. Services, Contact Us"
                  />
                </div>

                {/* Link Type selector */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Destination Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-0.5 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => {
                        setFormLinkType("internal");
                        setFormUrl("/");
                      }}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${formLinkType === "internal"
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-500"
                        }`}
                    >
                      Internal Page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormLinkType("external");
                        setFormUrl("https://");
                      }}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${formLinkType === "external"
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-500"
                        }`}
                    >
                      External URL / Anchor
                    </button>
                  </div>
                </div>

                {/* Destination Link field */}
                <div>
                  <label
                    htmlFor="form_url"
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5"
                  >
                    Destination Link
                  </label>
                  {formLinkType === "internal" ? (
                    <div className="relative">
                      <input
                        type="text"
                        id="form_url"
                        required
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="/category/skills"
                        className="w-full rounded-xl border border-gray-250 bg-white px-3.5 py-2.5 outline-none focus:border-blue-500 text-xs text-gray-800 font-semibold"
                        list="internal-pages"
                      />
                      <datalist id="internal-pages">
                        <option value="/">Home Page (/)</option>
                        <option value="/blogs">Blogs Feed (/blogs)</option>
                        <option value="/services">
                          Services Page (/services)
                        </option>
                        <option value="/testimonials">
                          Testimonials Page (/testimonials)
                        </option>
                        <option value="/faq">FAQs Page (/faq)</option>
                        <option value="/team">Team Members Page (/team)</option>
                        <option value="/contact">
                          Contact Page (/contact)
                        </option>
                        {availablePages.map((p) => (
                          <option
                            key={p.slug}
                            value={
                              p.slug.startsWith("/") ? p.slug : `/${p.slug}`
                            }
                          >
                            {p.title} ({p.slug})
                          </option>
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <input
                      type="text"
                      id="form_url"
                      required
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full rounded-xl border border-gray-250 bg-white px-3.5 py-2.5 outline-none focus:border-blue-500 text-xs text-gray-700 font-mono"
                      placeholder="e.g. https://google.com or #contact-section"
                    />
                  )}
                </div>

                {/* Dropdown Support Checkbox (only visible for parent links) */}
                {editingSubIndex === null && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isDropdown"
                      checked={isDropdown}
                      onChange={(e) => setIsDropdown(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label
                      htmlFor="isDropdown"
                      className="text-xs text-gray-600 font-medium"
                    >
                      Enable dropdown list container for sub-links
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-6 border-t">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm border-0 outline-none"
                >
                  Apply Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setEditingSubIndex(null);
                  }}
                  className="w-full py-2 bg-white border hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-3">
              <div className="p-3 bg-gray-200 rounded-full text-gray-600">
                <HelpCircle size={20} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-gray-800 uppercase tracking-wide">
                  Select an Item to Edit
                </h5>
                <p className="text-[11px] text-gray-700 mt-1 max-w-[250px] mx-auto">
                  Click the edit pencil button next to any link or sub-link to
                  customize its target path, destination type, or labels.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

