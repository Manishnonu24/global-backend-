"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import DataTable from "@/components/dashboard/ui/DataTable";
import Badge from "@/components/dashboard/ui/Badge";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { BANNER_ZONE_SIZES, getAdImageWarnings, STATIC_BANNER_MAX_KB } from "@/lib/adSizes";
import { Plus, Trash2, Edit, Megaphone, Layers, Image as ImageIcon, AlertTriangle, Leaf, Zap, ShieldCheck } from "lucide-react";

function proxyUrl(url) {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

export default function CrmAdsTab({ siteId }) {
  const [ads, setAds] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active section tab inside CRM Ads tab: 'ads' | 'zones'
  const [subTab, setSubTab] = useState("ads");

  // Ad Modals & Forms
  const [isAdFormOpen, setIsAdFormOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState(null);
  const [deleteAdId, setDeleteAdId] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imageWarnings, setImageWarnings] = useState([]);

  const [formAd, setFormAd] = useState({
    zoneId: "",
    name: "",
    type: "banner",
    code: "",
    imageUrl: "",
    targetUrl: "",
    headline: "",
    description: "",
    ctaText: "Learn More",
    ctaColor: "#0f7c85",
    isActive: true,
  });

  // Zone Modals & Forms
  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [deleteZoneId, setDeleteZoneId] = useState(null);
  const [selectedSizePreset, setSelectedSizePreset] = useState("300x250");
  const [formZone, setFormZone] = useState({
    name: "",
    slug: "",
    width: 300,
    height: 250,
  });

  const [adError, setAdError] = useState(null);
  const [adSuccess, setAdSuccess] = useState(null);
  const [zoneError, setZoneError] = useState(null);
  const [zoneSuccess, setZoneSuccess] = useState(null);

  const fetchAdsAndZones = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [adsRes, zonesRes] = await Promise.all([
        fetch("/api/dashboard/ads", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/ads/zones", { headers: { "x-site-id": siteId } }),
      ]);
      const adsJson = await adsRes.json();
      const zonesJson = await zonesRes.json();
      if (adsRes.ok) setAds(adsJson.data?.ads || []);
      if (zonesRes.ok) setZones(zonesJson.data?.zones || []);
    } catch (err) {
      console.error("Failed to fetch ads and zones:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchAdsAndZones();
  }, [fetchAdsAndZones]);

  // Image Warning Inspector
  useEffect(() => {
    if (!formAd.imageUrl || formAd.type !== "banner") {
      setImageWarnings([]);
      return;
    }

    const img = new Image();
    img.src = proxyUrl(formAd.imageUrl);
    img.onload = () => {
      const warnings = getAdImageWarnings(null, img.naturalWidth, img.naturalHeight);
      setImageWarnings(warnings);
    };
    img.onerror = () => {
      setImageWarnings(["Unable to load image for aspect ratio verification."]);
    };
  }, [formAd.imageUrl, formAd.type]);

  // --- Ad Handlers ---
  const openNewAd = () => {
    setEditingAdId(null);
    setFormAd({
      zoneId: zones[0]?.id || "",
      name: "",
      type: "banner",
      code: "",
      imageUrl: "",
      targetUrl: "",
      headline: "",
      description: "",
      ctaText: "Learn More",
      ctaColor: "#0f7c85",
      isActive: true,
    });
    setAdError(null);
    setAdSuccess(null);
    setIsAdFormOpen(true);
  };

  const openEditAd = (ad) => {
    setEditingAdId(ad.id);
    setFormAd({
      zoneId: ad.zoneId,
      name: ad.name,
      type: ad.type,
      code: ad.code || "",
      imageUrl: ad.imageUrl || "",
      targetUrl: ad.targetUrl || "",
      headline: ad.headline || "",
      description: ad.description || "",
      ctaText: ad.ctaText || "Learn More",
      ctaColor: ad.ctaColor || "#0f7c85",
      isActive: ad.isActive,
    });
    setAdError(null);
    setAdSuccess(null);
    setIsAdFormOpen(true);
  };

  const handleSaveAd = async (e) => {
    e.preventDefault();
    setAdError(null);
    setAdSuccess(null);
    try {
      const url = editingAdId ? `/api/dashboard/ads/${editingAdId}` : "/api/dashboard/ads";
      const method = editingAdId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(formAd),
      });
      const data = await res.json();
      if (data.success) {
        setAdSuccess(editingAdId ? "Ad updated successfully!" : "Ad deployed successfully!");
        fetchAdsAndZones();
        setTimeout(() => {
          setIsAdFormOpen(false);
          setAdSuccess(null);
        }, 1200);
      } else {
        throw new Error(data.error || "Failed to save ad");
      }
    } catch (err) {
      setAdError(err.message);
    }
  };

  const handleDeleteAd = async () => {
    if (!deleteAdId) return;
    try {
      const res = await fetch(`/api/dashboard/ads/${deleteAdId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (data.success) {
        fetchAdsAndZones();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteAdId(null);
    }
  };

  const toggleAdActive = async (ad) => {
    const prevActive = ad.isActive;
    setAds((prev) => prev.map((item) => (item.id === ad.id ? { ...item, isActive: !prevActive } : item)));

    try {
      const res = await fetch(`/api/dashboard/ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ isActive: !prevActive }),
      });
      if (!res.ok) {
        setAds((prev) => prev.map((item) => (item.id === ad.id ? { ...item, isActive: prevActive } : item)));
      } else {
        fetchAdsAndZones();
      }
    } catch (e) {
      setAds((prev) => prev.map((item) => (item.id === ad.id ? { ...item, isActive: prevActive } : item)));
    }
  };

  // --- Zone Handlers ---
  const openNewZone = () => {
    setEditingZone(null);
    setSelectedSizePreset("300x250");
    setFormZone({ name: "", width: 300, height: 250 });
    setZoneError(null);
    setZoneSuccess(null);
    setIsZoneFormOpen(true);
  };

  const openEditZone = (zone) => {
    setEditingZone(zone);
    const matchingPreset = BANNER_ZONE_SIZES.find((s) => s.width === zone.width && s.height === zone.height);
    if (matchingPreset) {
      setSelectedSizePreset(`${zone.width}x${zone.height}`);
    } else {
      setSelectedSizePreset("custom");
    }
    setFormZone({ name: zone.name, width: zone.width || 300, height: zone.height || 250 });
    setZoneError(null);
    setZoneSuccess(null);
    setIsZoneFormOpen(true);
  };

  const handlePresetSelect = (presetKey) => {
    setSelectedSizePreset(presetKey);
    if (presetKey === "custom") return;

    const [w, h] = presetKey.split("x").map(Number);
    setFormZone((prev) => ({ ...prev, width: w, height: h }));
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setZoneError(null);
    setZoneSuccess(null);
    try {
      const url = editingZone ? `/api/dashboard/ads/zones/${editingZone.id}` : "/api/dashboard/ads/zones";
      const method = editingZone ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({
          name: formZone.name,
          width: formZone.width ? Number(formZone.width) : null,
          height: formZone.height ? Number(formZone.height) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setZoneSuccess(editingZone ? "Zone updated successfully!" : "Zone created successfully!");
        fetchAdsAndZones();
        setTimeout(() => {
          setIsZoneFormOpen(false);
          setZoneSuccess(null);
        }, 1200);
      } else {
        throw new Error(data.error || "Failed to save zone");
      }
    } catch (err) {
      setZoneError(err.message);
    }
  };

  const handleDeleteZone = async () => {
    if (!deleteZoneId) return;
    try {
      const res = await fetch(`/api/dashboard/ads/zones/${deleteZoneId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      const data = await res.json();
      if (data.success) {
        fetchAdsAndZones();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteZoneId(null);
    }
  };

  const activeFormZone = useMemo(() => {
    return zones.find((z) => z.id === formAd.zoneId) || zones[0] || { width: 300, height: 250 };
  }, [zones, formAd.zoneId]);

  const getCTR = (impressions, clicks) => {
    if (!impressions) return "0.00%";
    return `${((clicks / impressions) * 100).toFixed(2)}%`;
  };

  const adColumns = [
    {
      key: "name",
      label: "Ad Name",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl ? (
            <div className="w-10 h-8 rounded overflow-hidden border border-slate-200 shrink-0 bg-slate-900">
              <img src={proxyUrl(row.imageUrl)} alt={val} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
              CODE
            </div>
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (val) => <Badge status={val === "banner" ? "info" : "warning"} label={val} />,
    },
    {
      key: "zone",
      label: "Placement Zone",
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300 block">{row.zone?.name || "Unassigned"}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.zone?.width && row.zone?.height ? `${row.zone.width}×${row.zone.height}` : "Responsive"}
          </span>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      align: "center",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => toggleAdActive(row)}
          title={row.isActive ? "Pause Ad" : "Activate Ad"}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            row.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              row.isActive ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      ),
    },
    {
      key: "impressions",
      label: "Impressions",
      align: "center",
      sortable: true,
      render: (val) => val || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      align: "center",
      sortable: true,
      render: (val) => val || 0,
    },
    {
      key: "ctr",
      label: "CTR",
      align: "center",
      render: (_, row) => getCTR(row.impressions, row.clicks),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditAd(row)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Edit Ad"
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => setDeleteAdId(row.id)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-600 transition-colors"
            title="Delete Ad"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const zoneColumns = [
    {
      key: "name",
      label: "Zone Name",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{val}</span>
          <span className="text-[10px] text-slate-400 font-mono">slug: {row.slug}</span>
        </div>
      ),
    },
    {
      key: "dimensions",
      label: "Standard Dimensions",
      render: (_, row) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.width && row.height ? `${row.width}×${row.height} px` : "Responsive"}
        </span>
      ),
    },
    {
      key: "linkedAds",
      label: "Linked Ads",
      align: "center",
      render: (_, row) => {
        const count = ads.filter((a) => a.zoneId === row.id).length;
        return <Badge status={count > 0 ? "success" : "neutral"} label={`${count} Ads`} />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditZone(row)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Edit Zone"
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => setDeleteZoneId(row.id)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-600 transition-colors"
            title="Delete Zone"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="dash-section-title text-slate-900 dark:text-white">Ad System &amp; Standardized Zones</h2>
          <p className="dash-caption mt-0.5">Manage fixed Google-standard ad placements and active display banner campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSubTab("ads")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                subTab === "ads"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Ad Campaigns ({ads.length})
            </button>
            <button
              onClick={() => setSubTab("zones")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                subTab === "zones"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Placement Zones ({zones.length})
            </button>
          </div>

          {subTab === "ads" ? (
            <button
              onClick={openNewAd}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-accent)] hover:opacity-90 text-white rounded-[var(--radius-input)] text-xs font-semibold transition-opacity shrink-0"
            >
              <Plus size={14} /> New Ad Campaign
            </button>
          ) : (
            <button
              onClick={openNewZone}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-accent)] hover:opacity-90 text-white rounded-[var(--radius-input)] text-xs font-semibold transition-opacity shrink-0"
            >
              <Plus size={14} /> New Placement Zone
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {subTab === "ads" && (
        <SectionCard noPadding>
          <DataTable
            columns={adColumns}
            rows={ads}
            loading={loading}
            emptyIcon={Megaphone}
            emptyTitle="No ads configured"
            emptyDescription="Click 'New Ad Campaign' above to deploy your first ad placement."
          />
        </SectionCard>
      )}

      {subTab === "zones" && (
        <SectionCard noPadding>
          <DataTable
            columns={zoneColumns}
            rows={zones}
            loading={loading}
            emptyIcon={Layers}
            emptyTitle="No placement zones defined"
            emptyDescription="Click 'New Placement Zone' above to define a Google-standard ad slot."
          />
        </SectionCard>
      )}

      {/* --- Ad Form Modal (Create / Edit) --- */}
      {isAdFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 rounded-[var(--radius-card)] border border-[var(--color-border)] dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-left"
            style={{ boxShadow: "var(--shadow-floating)" }}
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--color-border)] dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="dash-section-title text-slate-900 dark:text-slate-100">
                {editingAdId ? "Edit Ad Campaign" : "Deploy Ad Campaign"}
              </h3>
              <button
                onClick={() => setIsAdFormOpen(false)}
                className="text-xs text-[var(--color-muted)] hover:text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSaveAd} className="p-6 space-y-4 overflow-y-auto">
              {adError && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{adError}</div>}
              {adSuccess && <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200">{adSuccess}</div>}

              <div className="space-y-1">
                <label className="dash-caption font-bold uppercase">Ad Unit Name</label>
                <input
                  type="text"
                  required
                  value={formAd.name}
                  onChange={(e) => setFormAd({ ...formAd, name: e.target.value })}
                  placeholder="e.g. Summer Wellness Banner #1"
                  className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="dash-caption font-bold uppercase">Ad Type</label>
                  <select
                    value={formAd.type}
                    onChange={(e) => setFormAd({ ...formAd, type: e.target.value })}
                    className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none bg-white dark:bg-slate-800"
                  >
                    <option value="banner">Upload Image Banner</option>
                    <option value="adsense">Google AdSense / Custom Script</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="dash-caption font-bold uppercase">Placement Zone</label>
                  <select
                    required
                    value={formAd.zoneId}
                    onChange={(e) => setFormAd({ ...formAd, zoneId: e.target.value })}
                    className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none bg-white dark:bg-slate-800"
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.width && z.height ? `${z.width}×${z.height}` : "Responsive"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formAd.type === "banner" ? (
                <>
                  <div className="space-y-1">
                    <label className="dash-caption font-bold uppercase">Banner Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={formAd.imageUrl}
                        onChange={(e) => setFormAd({ ...formAd, imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 rounded-[var(--radius-input)] text-xs font-semibold shrink-0 flex items-center gap-1"
                      >
                        <ImageIcon size={13} /> Select Media
                      </button>
                    </div>

                    {/* Advisory Specs & Warnings */}
                    <div className="mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        💡 Advisory: Recommended upload specs: 1200×628 (1.91:1), 1200×1200 (1:1), or 960×1200 (4:5). Max {STATIC_BANNER_MAX_KB}KB.
                      </p>
                      {imageWarnings.map((warn, i) => (
                        <p key={i} className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle size={12} className="shrink-0" /> {warn}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="dash-caption font-bold uppercase">Target / Destination URL</label>
                    <input
                      type="url"
                      required
                      value={formAd.targetUrl}
                      onChange={(e) => setFormAd({ ...formAd, targetUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="dash-caption font-bold uppercase">Headline (Optional)</label>
                      <input
                        type="text"
                        value={formAd.headline}
                        onChange={(e) => setFormAd({ ...formAd, headline: e.target.value })}
                        placeholder="Catchy Headline"
                        className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="dash-caption font-bold uppercase">CTA Button Text</label>
                      <input
                        type="text"
                        value={formAd.ctaText}
                        onChange={(e) => setFormAd({ ...formAd, ctaText: e.target.value })}
                        placeholder="Learn More"
                        className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  {/* Live Ad Card Preview matching Frontend Framed Ad Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                      Live Framed Card Preview ({activeFormZone.width || 300}×{activeFormZone.height || 250})
                    </p>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "280px",
                        height: activeFormZone.height && activeFormZone.width ? `${(280 * activeFormZone.height) / activeFormZone.width}px` : "220px",
                      }}
                      className="bg-white rounded-[20px] p-2.5 border border-slate-200/90 shadow-sm mx-auto flex flex-col justify-between overflow-hidden"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between w-full pb-1 select-none">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0f4c4e]">
                          ADVERTISEMENT
                        </span>
                        <span className="bg-accent text-white font-black text-[8.5px] px-2 py-0.5 rounded-full shadow-2xs">
                          Advertise With Us
                        </span>
                      </div>

                      {/* Middle Image Container */}
                      <div className="relative flex-1 w-full rounded-lg overflow-hidden bg-slate-900 flex flex-col justify-end p-2.5 my-1">
                        {formAd.imageUrl ? (
                          <img
                            src={proxyUrl(formAd.imageUrl)}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[11px] italic">
                            Select or enter image URL
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                        <div className="relative z-10 text-white text-left">
                          <p className="text-[11px] font-extrabold truncate">{formAd.headline || formAd.name || "Ad Headline"}</p>
                          <span className="inline-block mt-0.5 text-[8.5px] font-black px-2.5 py-0.5 bg-[#0f7c85] rounded-full">
                            {formAd.ctaText || "Learn More"}
                          </span>
                        </div>
                      </div>

                      {/* Footer Badges */}
                      <div className="grid grid-cols-3 gap-0.5 pt-1 border-t border-slate-100 text-center text-[7.5px] font-bold text-slate-600">
                        <div className="flex items-center justify-center gap-0.5">
                          <Leaf className="w-2.5 h-2.5 text-[#0f4c4e]" /> Verified
                        </div>
                        <div className="flex items-center justify-center gap-0.5 border-x border-slate-100">
                          <Zap className="w-2.5 h-2.5 text-[#0f4c4e]" /> Partner
                        </div>
                        <div className="flex items-center justify-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5 text-[#0f4c4e]" /> Researched
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="dash-caption font-bold uppercase">AdSense / Custom Script Code</label>
                  <textarea
                    required
                    rows={4}
                    value={formAd.code}
                    onChange={(e) => setFormAd({ ...formAd, code: e.target.value })}
                    placeholder="<script>...</script>"
                    className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs font-mono outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adActive"
                  checked={formAd.isActive}
                  onChange={(e) => setFormAd({ ...formAd, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="adActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Activate and serve this ad immediately
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdFormOpen(false)}
                  className="px-3 py-1.5 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[var(--color-accent)] text-white rounded-[var(--radius-input)] text-xs font-semibold hover:opacity-90"
                >
                  Save Ad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Zone Form Modal (Create / Edit) --- */}
      {isZoneFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 rounded-[var(--radius-card)] border border-[var(--color-border)] dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col text-left"
            style={{ boxShadow: "var(--shadow-floating)" }}
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--color-border)] dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="dash-section-title text-slate-900 dark:text-slate-100">
                {editingZone ? "Edit Placement Zone" : "Create Placement Zone"}
              </h3>
              <button
                onClick={() => setIsZoneFormOpen(false)}
                className="text-xs text-[var(--color-muted)] hover:text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
              {zoneError && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{zoneError}</div>}
              {zoneSuccess && <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200">{zoneSuccess}</div>}

              <div className="space-y-1">
                <label className="dash-caption font-bold uppercase">Zone Name</label>
                <input
                  type="text"
                  required
                  value={formZone.name}
                  onChange={(e) => setFormZone({ ...formZone, name: e.target.value })}
                  placeholder="e.g. Homepage Hero Bottom Banner"
                  className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="dash-caption font-bold uppercase">Google-Standard Size Preset</label>
                <select
                  value={selectedSizePreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none bg-white dark:bg-slate-800"
                >
                  {BANNER_ZONE_SIZES.map((size) => (
                    <option key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                      {size.label}
                    </option>
                  ))}
                  <option value="custom">Custom Dimensions...</option>
                </select>
              </div>

              {selectedSizePreset === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="dash-caption font-bold uppercase">Width (px)</label>
                    <input
                      type="number"
                      required
                      value={formZone.width}
                      onChange={(e) => setFormZone({ ...formZone, width: Number(e.target.value) })}
                      className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="dash-caption font-bold uppercase">Height (px)</label>
                    <input
                      type="number"
                      required
                      value={formZone.height}
                      onChange={(e) => setFormZone({ ...formZone, height: Number(e.target.value) })}
                      className="w-full border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-2 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsZoneFormOpen(false)}
                  className="px-3 py-1.5 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[var(--color-accent)] text-[#fff] rounded-[var(--radius-input)] text-xs font-semibold hover:opacity-90"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(item) => {
          setFormAd((prev) => ({ ...prev, imageUrl: item.secureUrl || item.url }));
          setMediaPickerOpen(false);
        }}
      />

      {/* Confirm Delete Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteAdId}
        onClose={() => setDeleteAdId(null)}
        onConfirm={handleDeleteAd}
        title="Delete Ad Campaign"
        description="Are you sure you want to delete this ad campaign? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={!!deleteZoneId}
        onClose={() => setDeleteZoneId(null)}
        onConfirm={handleDeleteZone}
        title="Delete Placement Zone"
        description="Deleting this zone will also remove any assigned ads. Are you sure you want to proceed?"
      />
    </div>
  );
}
