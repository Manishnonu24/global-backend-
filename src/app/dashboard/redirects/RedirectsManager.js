"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Save,
  ArrowLeftRight,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function RedirectsManager({
  siteId,
  initialRedirects,
  initialCustom404,
}) {
  const [activeTab, setActiveTab] = useState("redirects"); // "redirects" | "custom404" | "scanner"

  // Redirect rules states
  const [redirects, setRedirects] = useState(initialRedirects || []);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState("301");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Custom 404 states
  const [c404Enabled, setC404Enabled] = useState(
    initialCustom404?.enabled ?? true,
  );
  const [c404Title, setC404Title] = useState(
    initialCustom404?.title || "Page Not Found",
  );
  const [c404Description, setC404Description] = useState(
    initialCustom404?.description ||
    "Oops! The page you are looking for does not exist.",
  );
  const [c404ButtonText, setC404ButtonText] = useState(
    initialCustom404?.buttonText || "Go Home",
  );
  const [c404ButtonLink, setC404ButtonLink] = useState(
    initialCustom404?.buttonLink || "/",
  );
  const [c404RedirectOn404, setC404RedirectOn404] = useState(
    initialCustom404?.redirectOn404 ?? false,
  );
  const [c404RedirectUrl, setC404RedirectUrl] = useState(
    initialCustom404?.redirectUrl || "/",
  );
  const [c404RedirectDelay, setC404RedirectDelay] = useState(
    initialCustom404?.redirectDelay ?? 5,
  );

  const [c404Submitting, setC404Submitting] = useState(false);
  const [c404Success, setC404Success] = useState(null);
  const [c404Error, setC404Error] = useState(null);

  const handleAddRedirect = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      source: source.trim().startsWith("/")
        ? source.trim()
        : `/${source.trim()}`,
      target: target.trim(),
      type: Number(type),
    };

    try {
      const res = await fetch("/api/dashboard/redirects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add redirect rule");
      }

      const result = await res.json();
      const newRedirect = result.data?.redirect ?? result.redirect;
      setRedirects((prev) => [newRedirect, ...prev]);
      setSource("");
      setTarget("");
      setType("301");
      setSuccess("Redirect rule added successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this redirect rule?")) return;

    try {
      const res = await fetch(`/api/dashboard/redirects/${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete redirect rule");
      }

      setRedirects((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const runBrokenLinkScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await fetch(`/api/dashboard/redirects/broken-links`, {
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to run broken link scan");
      }

      const result = await res.json();
      setScanResult({
        scannedPages: result.scannedPagesCount,
        scannedPosts: result.scannedPostsCount,
        brokenLinks: result.brokenLinks,
      });
    } catch (err) {
      setScanError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave404 = async (e) => {
    e.preventDefault();
    setC404Submitting(true);
    setC404Success(null);
    setC404Error(null);

    const payload = {
      enabled: c404Enabled,
      title: c404Title.trim(),
      description: c404Description.trim(),
      buttonText: c404ButtonText.trim(),
      buttonLink: c404ButtonLink.trim(),
      redirectOn404: c404RedirectOn404,
      redirectUrl: c404RedirectUrl.trim(),
      redirectDelay: Number(c404RedirectDelay),
    };

    try {
      const res = await fetch("/api/dashboard/redirects/custom-404", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error || "Failed to save Custom 404 configurations",
        );
      }

      setC404Success("Custom 404 configurations saved successfully!");
      setTimeout(() => setC404Success(null), 3500);
    } catch (err) {
      setC404Error(err.message);
    } finally {
      setC404Submitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-1 rounded-lg shadow-sm w-full overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("redirects")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition ${activeTab === "redirects"
              ? "bg-blue-50 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
        >
          <ArrowLeftRight size={14} />
          URL Redirects Map
        </button>

        <button
          onClick={() => setActiveTab("custom404")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition ${activeTab === "custom404"
              ? "bg-blue-50 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
        >
          <Settings size={14} />
          Custom 404 Settings
        </button>

        <button
          onClick={() => setActiveTab("scanner")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition ${activeTab === "scanner"
              ? "bg-blue-50 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
        >
          <ShieldAlert size={14} />
          Broken Links Scan
        </button>
      </div>

      {/* Redirects rules Mapping Tab */}
      {activeTab === "redirects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2 items-center">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex gap-2 items-center">
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <Plus size={16} className="text-blue-500" />
                Add New Route Mapping
              </h3>
              <form
                onSubmit={handleAddRedirect}
                className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
              >
                <div className="sm:col-span-1.5">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Source Path (URL)
                  </label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                    placeholder="e.g. /old-about"
                  />
                </div>

                <div className="sm:col-span-1.5">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Destination Path/URL
                  </label>
                  <input
                    type="text"
                    id="target-input"
                    required
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                    placeholder="e.g. /about"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Redirect Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                  >
                    <option value="301">301 - Permanent</option>
                    <option value="302">302 - Temporary</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300 transition w-full"
                >
                  <Plus size={14} />
                  Add Rule
                </button>
              </form>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-6 py-4 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Active Redirect Rules
                </h3>
              </div>

              {(!redirects || redirects.length === 0) ? (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  No custom redirects mapping configured.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Source Path</th>
                        <th className="px-6 py-3.5">Destination</th>
                        <th className="px-6 py-3.5">Type</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-gray-700 font-medium">
                      {redirects.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/30 transition"
                        >
                          <td className="px-6 py-4 font-mono text-gray-900 text-xs">
                            {item.source}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500 text-xs truncate max-w-xs">
                            {item.target}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono rounded border ${item.type === 301
                                  ? "bg-green-50 text-green-700 border-green-150"
                                  : "bg-blue-50 text-blue-700 border-blue-150"
                                }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 transition"
                              title="Delete Redirect Rule"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 border rounded-xl bg-gray-50/30 p-5 space-y-4 h-fit">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
              <ArrowLeftRight size={14} className="text-blue-500" />
              Routing & URL Mappings
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Use redirects to ensure old indexed page URLs mapped to updated
              routes don't return broken links to site visitors.
            </p>
            <div className="text-[10px] text-gray-500 border bg-white p-3 rounded-lg space-y-2">
              <span className="font-semibold block text-gray-700 uppercase">
                Redirect Types:
              </span>
              <div>
                <strong className="text-green-700">301 (Permanent)</strong>:
                Tells browsers and search engines to update their index mapping
                to the destination URL.
              </div>
              <div>
                <strong className="text-blue-700">302 (Temporary)</strong>:
                Tells clients to temporarily route users to the destination
                path.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom 404 Config Tab */}
      {activeTab === "custom404" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleSave404} className="xl:col-span-2 space-y-6">
            {c404Error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2 items-center">
                <AlertCircle size={16} />
                <span>{c404Error}</span>
              </div>
            )}
            {c404Success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex gap-2 items-center">
                <CheckCircle2 size={16} />
                <span>{c404Success}</span>
              </div>
            )}

            {/* Custom 404 Page Customizer */}
            <div className="border p-6 rounded-xl bg-white shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={16} className="text-blue-500" />
                    Custom 404 Page Config
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Configure layout contents served for missing site routes.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={c404Enabled}
                    onChange={(e) => setC404Enabled(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase">
                    Enable Content
                  </span>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    404 Page Title Header
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!c404Enabled}
                    value={c404Title}
                    onChange={(e) => setC404Title(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="Page Not Found"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    404 Description Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    disabled={!c404Enabled}
                    value={c404Description}
                    onChange={(e) => setC404Description(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
                    placeholder="Provide friendly information guiding the visitor..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!c404Enabled}
                      value={c404ButtonText}
                      onChange={(e) => setC404ButtonText(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      CTA Button Link Target
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!c404Enabled}
                      value={c404ButtonLink}
                      onChange={(e) => setC404ButtonLink(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Auto Redirection controls */}
            <div className="border p-6 rounded-xl bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={15} className="text-orange-500" />
                  Auto Redirection Options
                </h4>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={c404RedirectOn404}
                    onChange={(e) => setC404RedirectOn404(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase">
                    Enable Redirection
                  </span>
                </label>
              </div>

              {c404RedirectOn404 ? (
                <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Redirect Target URL
                      </label>
                      <input
                        type="text"
                        required
                        value={c404RedirectUrl}
                        onChange={(e) => setC404RedirectUrl(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-mono"
                        placeholder="e.g. /"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Delay (Seconds):{" "}
                        <span className="font-mono text-blue-600">
                          {c404RedirectDelay}s
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={c404RedirectDelay}
                        onChange={(e) =>
                          setC404RedirectDelay(Number(e.target.value))
                        }
                        className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    If enabled, visitors landing on a 404 page will be
                    dynamically redirected to the target URL after the selected
                    delay. Set delay to 0 for immediate redirection.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Automatic redirection is disabled. Visitors will remain on the
                  custom 404 page layout.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={c404Submitting}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Save size={14} />
              {c404Submitting ? "Saving Config..." : "Save 404 Customizer"}
            </button>
          </form>

          {/* Preview Panel */}
          <div className="xl:col-span-1 border rounded-xl bg-gray-50/50 p-5 space-y-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-1.5">
              404 Page Live Preview
            </h4>

            {c404Enabled ? (
              <div className="border rounded-xl bg-white p-6 shadow-sm text-center space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold font-mono">
                  404
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-gray-900 text-sm leading-tight">
                    {c404Title}
                  </h5>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    {c404Description}
                  </p>
                </div>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="inline-block text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                >
                  {c404ButtonText}
                </a>

                {c404RedirectOn404 && (
                  <div className="text-[9px] text-gray-400 animate-pulse border-t pt-2 mt-1">
                    Redirecting to{" "}
                    <span className="font-mono">{c404RedirectUrl}</span> in{" "}
                    {c404RedirectDelay}s...
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-xl bg-white p-8 text-center text-gray-400 text-xs italic shadow-sm">
                Custom 404 page content is disabled. The browser or target
                hosting default error layouts will show instead.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broken Links Scanner Tab */}
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">
                Broken Links Scanner
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Audit layout sections and action buttons across pages for broken
                internal relative URLs. Ensure users don't encounter dead ends.
              </p>

              <button
                onClick={runBrokenLinkScanner}
                disabled={isScanning}
                className="flex justify-center items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400 transition w-full sm:w-fit"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Scanning Slugs...
                  </>
                ) : (
                  <>
                    <ShieldAlert size={14} />
                    Run Audit Scanner
                  </>
                )}
              </button>
            </div>

            {scanError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2 items-center">
                <AlertCircle size={16} />
                <span>Audit scanner failed: {scanError}</span>
              </div>
            )}

            {scanResult && (
              <div className="space-y-4 pt-2 text-xs">
                <div className="flex justify-between text-gray-500 px-1">
                  <span>Pages Scanned: {scanResult.scannedPages}</span>
                  <span>Posts Scanned: {scanResult.scannedPosts}</span>
                </div>

                {(!scanResult.brokenLinks || scanResult.brokenLinks.length === 0) ? (
                  <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl">
                    <CheckCircle
                      className="shrink-0 text-green-600"
                      size={18}
                    />
                    <div>
                      <strong className="font-semibold text-sm">
                        Audit Clean!
                      </strong>
                      <p className="mt-0.5 text-xs text-green-700 leading-normal">
                        No broken links detected on any page buttons or CTAs.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="font-bold text-sm text-red-700 flex items-center gap-1.5 px-1">
                      <ShieldAlert size={16} />
                      Found {scanResult.brokenLinks.length} Broken Link(s)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                      {scanResult.brokenLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className="border border-red-150 bg-red-50/20 p-3.5 rounded-xl space-y-2"
                        >
                          <div className="flex justify-between items-center font-bold text-gray-800 text-xs">
                            <span>Page: {link.pageSlug}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-normal uppercase">
                              {link.context}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <div className="font-mono text-[10px] text-red-600 bg-white p-2 rounded-lg border border-red-100 truncate flex-1">
                              {link.brokenLink}
                            </div>
                            <button
                              onClick={() => {
                                setSource(link.brokenLink);
                                setTarget("");
                                setActiveTab("redirects");
                                setTimeout(() => {
                                  const targetInput =
                                    document.getElementById("target-input");
                                  if (targetInput) {
                                    targetInput.focus();
                                    targetInput.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                  }
                                }, 100);
                              }}
                              className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition shrink-0 cursor-pointer"
                            >
                              Create Redirect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 border rounded-xl bg-gray-50/30 p-5 space-y-4 h-fit">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-blue-500" />
              Scan Scope
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              The scanner checks the URLs configured across all dynamic layout
              sections. It flags links pointing to missing/unregistered page or
              blog slugs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

