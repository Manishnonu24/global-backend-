"use client";

import { useState } from "react";

/*
 HeroEditorModal
 Props:
  - initial (optional) : initial content when editing (object)
  - onCancel(): called when user cancels
  - onSave(content): called with content object when validated and saved
  - saving: boolean while request in progress
*/

export default function HeroEditorModal({
  initial = {},
  onCancel,
  onSave,
  saving = false,
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [subtitle, setSubtitle] = useState(initial.subtitle || "");
  const [backgroundUrl, setBackgroundUrl] = useState(
    initial.backgroundUrl || "",
  );
  const [primaryText, setPrimaryText] = useState(
    (initial.primaryButton && initial.primaryButton.text) || "",
  );
  const [primaryUrl, setPrimaryUrl] = useState(
    (initial.primaryButton && initial.primaryButton.url) || "",
  );
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!title || title.trim().length === 0) e.title = "Title is required";
    if (primaryText && !primaryUrl) e.primaryUrl = "Primary CTA needs a URL";
    // optional: validate URL format with a simple regex
    if (
      primaryUrl &&
      !/^https?:\/\//.test(primaryUrl) &&
      !primaryUrl.startsWith("/")
    ) {
      // allow relative paths too
      e.primaryUrl = "Provide a valid URL (absolute http(s) or relative path)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const content = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      backgroundUrl: backgroundUrl.trim() || undefined,
    };
    if (primaryText.trim()) {
      content.primaryButton = {
        text: primaryText.trim(),
        url: primaryUrl.trim() || "#",
      };
    }
    onSave(content);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Create Hero Section</h3>
          <button className="text-sm text-gray-600" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              className="mt-1 block w-full border rounded p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <div className="text-red-600 text-sm mt-1">{errors.title}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Subtitle</label>
            <input
              className="mt-1 block w-full border rounded p-2"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Background image URL
            </label>
            <input
              className="mt-1 block w-full border rounded p-2"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">
                Primary CTA text
              </label>
              <input
                className="mt-1 block w-full border rounded p-2"
                value={primaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Primary CTA URL
              </label>
              <input
                className="mt-1 block w-full border rounded p-2"
                value={primaryUrl}
                onChange={(e) => setPrimaryUrl(e.target.value)}
                placeholder="/subscribe or https://..."
              />
              {errors.primaryUrl && (
                <div className="text-red-600 text-sm mt-1">
                  {errors.primaryUrl}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Create Hero"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
