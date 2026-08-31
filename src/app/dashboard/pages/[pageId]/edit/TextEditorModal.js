"use client";

import { useState } from "react";

/*
 TextBlockEditorModal
 Props:
  - initial: initial content when editing (object)
  - onCancel(): called when user cancels
  - onSave(content): called with content object when validated and saved
  - saving: boolean while request in progress
  - openMediaPicker(): optional, open global media picker and pass selected media via onAttachMedia(media)
*/

export default function TextBlockEditorModal({
  initial = {},
  onCancel,
  onSave,
  saving = false,
  onAttachMedia,
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [body, setBody] = useState(initial.body || "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl || "");
  const [imageMediaId, setImageMediaId] = useState(initial.imageMediaId || "");
  const [imagePosition, setImagePosition] = useState(
    initial.imagePosition || "top",
  );
  const [ctaText, setCtaText] = useState(
    (initial.cta && initial.cta.text) || "",
  );
  const [ctaUrl, setCtaUrl] = useState((initial.cta && initial.cta.url) || "");
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (ctaText && !ctaUrl) e.ctaUrl = "CTA needs a URL";
    if (ctaUrl && !/^\/|https?:\/\//.test(ctaUrl)) {
      e.ctaUrl = "Provide a valid URL (absolute http(s) or relative path)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const content = {
      title: title.trim() || undefined,
      body: body || undefined,
      imageMediaId: imageMediaId || undefined,
      imageUrl: imageUrl || undefined,
      imagePosition: imagePosition || undefined,
    };
    if (ctaText.trim())
      content.cta = { text: ctaText.trim(), url: ctaUrl.trim() || "#" };
    onSave(content);
  }

  // optional helper to wire media picker callback into modal
  function handleAttachMedia(media) {
    if (!media) return;
    setImageMediaId(media.id);
    setImageUrl(media.secureUrl || media.url);
    if (typeof onAttachMedia === "function") onAttachMedia(media);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Text Block</h3>
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
          </div>

          <div>
            <label className="block text-sm font-medium">
              Body (HTML or Markdown)
            </label>
            <textarea
              className="mt-1 block w-full border rounded p-2 h-40 font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Image URL</label>
              <input
                className="mt-1 block w-full border rounded p-2"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Image position
              </label>
              <select
                className="mt-1 block w-full border rounded p-2"
                value={imagePosition}
                onChange={(e) => setImagePosition(e.target.value)}
              >
                <option value="top">Top</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">CTA text</label>
              <input
                className="mt-1 block w-full border rounded p-2"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">CTA URL</label>
              <input
                className="mt-1 block w-full border rounded p-2"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/path or https://..."
              />
              {errors.ctaUrl && (
                <div className="text-red-600 text-sm mt-1">{errors.ctaUrl}</div>
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
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
