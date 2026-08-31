"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Map,
  Clock,
  Share2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Globe,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: Link2,
    placeholder: "https://facebook.com/yourpage",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Link2,
    placeholder: "https://instagram.com/yourhandle",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: Link2,
    placeholder: "https://x.com/yourhandle",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Link2,
    placeholder: "https://linkedin.com/in/yourprofile",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Link2,
    placeholder: "https://youtube.com/@yourchannel",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: Link2,
    placeholder: "https://tiktok.com/@yourhandle",
  },
  {
    key: "website",
    label: "Website",
    icon: Globe,
    placeholder: "https://yourwebsite.com",
  },
];

const DEFAULT_HOURS = [
  { day: "Monday", open: "09:00", close: "18:00", closed: false },
  { day: "Tuesday", open: "09:00", close: "18:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "18:00", closed: false },
  { day: "Thursday", open: "09:00", close: "18:00", closed: false },
  { day: "Friday", open: "09:00", close: "18:00", closed: false },
  { day: "Saturday", open: "10:00", close: "15:00", closed: false },
  { day: "Sunday", open: "", close: "", closed: true },
];

function SectionCard({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <span className="text-sm font-bold text-slate-900">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ContactDetailsEditor({ siteId, initialData }) {
  // ── Primary contact fields ──────────────────────────────────────────────────
  const [phones, setPhones] = useState(
    initialData?.phones || [
      { number: "", label: "Primary", isWhatsApp: false },
    ],
  );
  const [emails, setEmails] = useState(
    initialData?.emails || [{ address: "", label: "General" }],
  );
  const [addresses, setAddresses] = useState(
    initialData?.addresses || [
      {
        line1: "",
        line2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        label: "Main Office",
      },
    ],
  );

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  const [whatsapp, setWhatsapp] = useState(
    initialData?.whatsapp || {
      number: "",
      defaultMessage: "",
      showWidget: false,
    },
  );

  // ── Google Maps ──────────────────────────────────────────────────────────────
  const [maps, setMaps] = useState(
    initialData?.maps || {
      embedUrl: "",
      directionsUrl: "",
      latitude: "",
      longitude: "",
    },
  );

  // ── Business hours ───────────────────────────────────────────────────────────
  const [hours, setHours] = useState(
    initialData?.businessHours || DEFAULT_HOURS,
  );
  const [timezone, setTimezone] = useState(initialData?.timezone || "");

  // ── Social links ─────────────────────────────────────────────────────────────
  const [socials, setSocials] = useState(initialData?.socials || {});
  const [customSocials, setCustomSocials] = useState(
    initialData?.customSocials || [],
  );

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const addPhone = () =>
    setPhones((p) => [...p, { number: "", label: "", isWhatsApp: false }]);
  const removePhone = (i) => setPhones((p) => p.filter((_, idx) => idx !== i));
  const updatePhone = (i, field, val) =>
    setPhones((p) =>
      p.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );

  const addEmail = () => setEmails((e) => [...e, { address: "", label: "" }]);
  const removeEmail = (i) => setEmails((e) => e.filter((_, idx) => idx !== i));
  const updateEmail = (i, field, val) =>
    setEmails((e) =>
      e.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );

  const addAddress = () =>
    setAddresses((a) => [
      ...a,
      {
        line1: "",
        line2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        label: "",
      },
    ]);
  const removeAddress = (i) =>
    setAddresses((a) => a.filter((_, idx) => idx !== i));
  const updateAddress = (i, field, val) =>
    setAddresses((a) =>
      a.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );

  const updateHour = (i, field, val) =>
    setHours((h) =>
      h.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );

  const addCustomSocial = () =>
    setCustomSocials((c) => [...c, { platform: "", url: "" }]);
  const removeCustomSocial = (i) =>
    setCustomSocials((c) => c.filter((_, idx) => idx !== i));
  const updateCustomSocial = (i, field, val) =>
    setCustomSocials((c) =>
      c.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      phones,
      emails,
      addresses,
      whatsapp,
      maps,
      businessHours: hours,
      timezone,
      socials,
      customSocials,
    };

    try {
      const res = await fetch(`/api/dashboard/contact/details?siteId=${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contact Details</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your business contact information, business hours, and social
            links.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              <CheckCircle size={13} /> Saved successfully
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Phone Numbers ───────────────────────────────────────────────────── */}
      <SectionCard icon={Phone} title="Phone Numbers">
        <div className="space-y-3">
          {phones.map((phone, i) => (
            <div
              key={i}
              className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={phone.label}
                    onChange={(e) => updatePhone(i, "label", e.target.value)}
                    placeholder="e.g. Sales, Support"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone.number}
                    onChange={(e) => updatePhone(i, "number", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 pt-4">
                <label className="flex items-center gap-1 cursor-pointer text-[10px] uppercase tracking-wider text-slate-600 font-semibold whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={phone.isWhatsApp}
                    onChange={(e) =>
                      updatePhone(i, "isWhatsApp", e.target.checked)
                    }
                    className="rounded border-slate-300 text-green-600 h-3 w-3"
                  />
                  WhatsApp
                </label>
                {phones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhone(i)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPhone}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus size={14} /> Add Phone Number
        </button>
      </SectionCard>

      {/* ── Email Addresses ─────────────────────────────────────────────────── */}
      <SectionCard icon={Mail} title="Email Addresses">
        <div className="space-y-3">
          {emails.map((email, i) => (
            <div
              key={i}
              className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={email.label}
                    onChange={(e) => updateEmail(i, "label", e.target.value)}
                    placeholder="e.g. General, Support"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email.address}
                    onChange={(e) => updateEmail(i, "address", e.target.value)}
                    placeholder="hello@yourcompany.com"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {emails.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmail(i)}
                  className="text-red-500 hover:text-red-700 pt-5 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEmail}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus size={14} /> Add Email Address
        </button>
      </SectionCard>

      {/* ── Office Addresses ────────────────────────────────────────────────── */}
      <SectionCard icon={MapPin} title="Office Addresses">
        <div className="space-y-4">
          {addresses.map((addr, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={addr.label}
                  onChange={(e) => updateAddress(i, "label", e.target.value)}
                  placeholder="Location label, e.g. Head Office"
                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white flex-1 min-w-0 sm:flex-none sm:w-64"
                />
                {addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAddress(i)}
                    className="text-red-500 hover:text-red-700 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={addr.line1}
                    onChange={(e) => updateAddress(i, "line1", e.target.value)}
                    placeholder="Street address"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Address Line 2{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={addr.line2}
                    onChange={(e) => updateAddress(i, "line2", e.target.value)}
                    placeholder="Suite, floor, building..."
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={addr.city}
                    onChange={(e) => updateAddress(i, "city", e.target.value)}
                    placeholder="City"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={addr.state}
                    onChange={(e) => updateAddress(i, "state", e.target.value)}
                    placeholder="State"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={addr.country}
                    onChange={(e) =>
                      updateAddress(i, "country", e.target.value)
                    }
                    placeholder="Country"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={addr.postalCode}
                    onChange={(e) =>
                      updateAddress(i, "postalCode", e.target.value)
                    }
                    placeholder="ZIP / Postcode"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAddress}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus size={14} /> Add Office Location
        </button>
      </SectionCard>

      {/* ── WhatsApp ────────────────────────────────────────────────────────── */}
      <SectionCard icon={MessageCircle} title="WhatsApp">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow
            label="WhatsApp Number"
            hint="Include country code, e.g. +14155552671"
          >
            <input
              type="tel"
              value={whatsapp.number}
              onChange={(e) =>
                setWhatsapp((w) => ({ ...w, number: e.target.value }))
              }
              placeholder="+14155552671"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldRow>
          <FieldRow
            label="Default Message (pre-filled)"
            hint="Message users will see when they open the chat"
          >
            <input
              type="text"
              value={whatsapp.defaultMessage}
              onChange={(e) =>
                setWhatsapp((w) => ({ ...w, defaultMessage: e.target.value }))
              }
              placeholder="Hi! I'd like to know more about..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldRow>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
          <input
            type="checkbox"
            checked={whatsapp.showWidget}
            onChange={(e) =>
              setWhatsapp((w) => ({ ...w, showWidget: e.target.checked }))
            }
            className="rounded border-slate-300 text-green-600 h-4 w-4"
          />
          Show WhatsApp floating widget on website
        </label>
      </SectionCard>

      {/* ── Google Maps ─────────────────────────────────────────────────────── */}
      <SectionCard icon={Map} title="Google Maps">
        <FieldRow
          label="Embed URL"
          hint="Paste the Google Maps embed iframe src URL here"
        >
          <input
            type="url"
            value={maps.embedUrl}
            onChange={(e) =>
              setMaps((m) => ({ ...m, embedUrl: e.target.value }))
            }
            placeholder="https://www.google.com/maps/embed?pb=..."
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </FieldRow>
        <FieldRow
          label="Directions URL"
          hint="Link to Google Maps directions for your location"
        >
          <input
            type="url"
            value={maps.directionsUrl}
            onChange={(e) =>
              setMaps((m) => ({ ...m, directionsUrl: e.target.value }))
            }
            placeholder="https://maps.google.com/?q=..."
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </FieldRow>
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Latitude" hint="Optional GPS coordinate">
            <input
              type="text"
              value={maps.latitude}
              onChange={(e) =>
                setMaps((m) => ({ ...m, latitude: e.target.value }))
              }
              placeholder="40.7128"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldRow>
          <FieldRow label="Longitude" hint="Optional GPS coordinate">
            <input
              type="text"
              value={maps.longitude}
              onChange={(e) =>
                setMaps((m) => ({ ...m, longitude: e.target.value }))
              }
              placeholder="-74.0060"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldRow>
        </div>
        {maps.embedUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 h-48">
            <iframe
              src={maps.embedUrl.trim().startsWith("<iframe") ? (maps.embedUrl.match(/src=["']([^"']+)["']/) || [])[1] || "" : maps.embedUrl}
              className="w-full h-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </SectionCard>

      {/* ── Business Hours ──────────────────────────────────────────────────── */}
      <SectionCard icon={Clock} title="Business Hours">
        <FieldRow
          label="Timezone"
          hint="Used to display correct local times to visitors"
        >
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. America/New_York, Asia/Kolkata"
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </FieldRow>
        <div className="space-y-2 mt-2">
          {hours.map((hour, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 sm:py-2 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-700 w-24 shrink-0">
                  {hour.day}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={hour.closed}
                    onChange={(e) => updateHour(i, "closed", e.target.checked)}
                    className="rounded border-slate-300 text-red-500 h-3.5 w-3.5"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Closed
                  </span>
                </label>
              </div>
              <div
                className={`flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto ${hour.closed ? "opacity-30 pointer-events-none" : ""}`}
              >
                <input
                  type="time"
                  value={hour.open}
                  onChange={(e) => updateHour(i, "open", e.target.value)}
                  className="flex-1 min-w-0 sm:flex-none w-full sm:w-auto px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold shrink-0">
                  to
                </span>
                <input
                  type="time"
                  value={hour.close}
                  onChange={(e) => updateHour(i, "close", e.target.value)}
                  className="flex-1 min-w-0 sm:flex-none w-full sm:w-auto px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Social Links ────────────────────────────────────────────────────── */}
      <SectionCard icon={Share2} title="Social Links">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_PLATFORMS.map(
            ({ key, label, icon: PlatformIcon, placeholder }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <PlatformIcon size={13} className="text-slate-500" />
                  {label}
                </label>
                <input
                  type="url"
                  value={socials[key] || ""}
                  onChange={(e) =>
                    setSocials((s) => ({ ...s, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ),
          )}
        </div>

        {/* Custom socials */}
        {customSocials.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Custom Links
            </p>
            {customSocials.map((cs, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cs.platform}
                  onChange={(e) =>
                    updateCustomSocial(i, "platform", e.target.value)
                  }
                  placeholder="Platform name"
                  className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="url"
                  value={cs.url}
                  onChange={(e) => updateCustomSocial(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeCustomSocial(i)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addCustomSocial}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-2"
        >
          <Plus size={14} /> Add Custom Social Link
        </button>
      </SectionCard>

      {/* Sticky footer save bar */}
      <div className="flex flex-wrap justify-end gap-3 pt-4 pb-2">
        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex-1 min-w-0">
            <AlertCircle size={13} className="shrink-0" /> <span className="truncate">{error}</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shrink-0 w-full sm:w-auto"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Contact Details"}
        </button>
      </div>
    </div>
  );
}

