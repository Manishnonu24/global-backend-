'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Image as ImageIcon, Type, AlignLeft } from 'lucide-react';

/**
 * ServicesBannerEditorModal
 *
 * Modal for editing the Services page hero/banner content.
 * Props:
 *   - siteId  {string}   – Current site ID used for API requests
 *   - isOpen  {boolean}  – Controls modal visibility
 *   - onClose {function} – Called when the modal should close
 */
export default function ServicesBannerEditorModal({ siteId, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    headline:    '',
    subheadline: '',
    ctaText:     '',
    ctaUrl:      '',
    imageUrl:    '',
    bgColor:     '#0f7c85',
  });

  // Load existing banner data when modal opens
  useEffect(() => {
    if (!isOpen || !siteId) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    fetch(`/api/dashboard/settings?siteId=${siteId}`, {
      headers: { 'x-site-id': siteId },
    })
      .then((r) => r.json())
      .then((data) => {
        const banner = data?.servicesBanner || data?.rawSettings?.servicesBanner || {};
        setForm((prev) => ({
          ...prev,
          headline:    banner.headline    || '',
          subheadline: banner.subheadline || '',
          ctaText:     banner.ctaText     || '',
          ctaUrl:      banner.ctaUrl      || '',
          imageUrl:    banner.imageUrl    || '',
          bgColor:     banner.bgColor     || '#0f7c85',
        }));
      })
      .catch(() => setError('Failed to load banner settings.'))
      .finally(() => setLoading(false));
  }, [isOpen, siteId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/dashboard/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': siteId,
        },
        body: JSON.stringify({ servicesBanner: form }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save banner settings.');
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-900 text-sm">Edit Services Banner</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#0f7c85]" />
            </div>
          ) : (
            <>
              {/* Headline */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Type size={11} /> Headline
                </label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => handleChange('headline', e.target.value)}
                  placeholder="e.g. Premium Media Packages"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85]"
                />
              </div>

              {/* Subheadline */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <AlignLeft size={11} /> Subheadline
                </label>
                <textarea
                  value={form.subheadline}
                  onChange={(e) => handleChange('subheadline', e.target.value)}
                  placeholder="A short description of your services..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85] resize-none"
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={form.ctaText}
                    onChange={(e) => handleChange('ctaText', e.target.value)}
                    placeholder="Get Started"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    CTA URL
                  </label>
                  <input
                    type="text"
                    value={form.ctaUrl}
                    onChange={(e) => handleChange('ctaUrl', e.target.value)}
                    placeholder="/contact"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85]"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <ImageIcon size={11} /> Banner Image URL
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85]"
                />
              </div>

              {/* Background Color */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    placeholder="#0f7c85"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f7c85]/30 focus:border-[#0f7c85] font-mono"
                  />
                </div>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold">
                  ✓ Banner saved successfully!
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0f7c85] hover:bg-[#0c6b73] rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving...' : 'Save Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}
