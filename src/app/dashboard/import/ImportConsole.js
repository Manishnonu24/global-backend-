"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  ArrowRight,
  ArrowLeft,
  FileCode,
  AlertTriangle,
} from "lucide-react";
import Pagination from "@/components/Pagination";

// ────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────────────────────
const TARGET_MODELS = [
  "Post", "Magazine", "Recipe", "Service", "Testimonial",
  "Faq", "TeamMember", "Page", "LegalPage", "Category", "Tag",
];

const MODEL_LABELS = {
  Post: "Blog Post",
  Magazine: "Magazine",
  Recipe: "Recipe",
  Service: "Service",
  Testimonial: "Testimonial",
  Faq: "FAQ",
  TeamMember: "Team Member",
  Page: "Page",
  LegalPage: "Legal Page",
  Category: "Category",
  Tag: "Tag",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConfidenceBadge({ value }) {
  const pct = Math.round((value || 0) * 100);
  const colorClass =
    pct >= 90
      ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-green-200 dark:border-green-800"
      : pct >= 70
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800"
      : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${colorClass}`}>
      <Sparkles size={12} />
      {pct}% confidence
    </span>
  );
}

function StatusBadge({ status }) {
  const badgeMap = {
    PENDING: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border-gray-200 dark:border-slate-700",
    RUNNING: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    DRY_RUN: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    COMPLETED: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-green-200 dark:border-green-800",
    FAILED: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800",
    ROLLED_BACK: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  };
  const cls = badgeMap[status] || badgeMap.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export default function ImportConsole({ siteId, userId, userRole = "ADMIN" }) {
  const isAdmin = true;

  // Step: "upload" | "preview" | "mapping" | "commit" | "history"
  const [activeTab, setActiveTab] = useState("upload");

  // Upload step state
  const [file, setFile] = useState(null);
  const [hint, setHint] = useState("");
  const [defaultContributorId, setDefaultContributorId] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  // Mapping step state
  const [fieldMap, setFieldMap] = useState({});

  // Commit step state
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [commitError, setCommitError] = useState(null);

  // History step state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyError, setHistoryError] = useState(null);
  const [rollbackModal, setRollbackModal] = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Load history and restore last commit result on mount
  useEffect(() => {
    loadHistory();
    try {
      const saved = localStorage.getItem(`ahp_last_import_commit_${siteId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.batchId || parsed.totalRows !== undefined)) {
          setCommitResult(parsed);
          setActiveTab("commit");
        }
      }
    } catch {}
  }, [siteId]);

  // ─── File selection ──────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreviewData(null);
    setCommitResult(null);
    setPreviewError(null);
    setCommitError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ─── Preview API call ────────────────────────────────────────────────────
  const runPreview = async () => {
    if (!file) return;
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      if (hint) fd.append("hint", hint);
      if (defaultContributorId) fd.append("defaultContributorId", defaultContributorId);
      if (defaultCategory) fd.append("defaultCategory", defaultCategory);

      const res = await fetch(`/api/admin/import/preview?site_id=${siteId}`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");

      setPreviewData(data);
      if (data.fieldMap) setFieldMap(data.fieldMap);
      setActiveTab("preview");
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Commit API call ─────────────────────────────────────────────────────
  const runCommit = async () => {
    if (!file || !previewData?.targetModel) return;
    setCommitLoading(true);
    setCommitError(null);
    setCommitResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetModel", previewData.targetModel);
      fd.append("fieldMap", JSON.stringify(fieldMap));
      if (defaultContributorId) fd.append("defaultContributorId", defaultContributorId);
      if (defaultCategory) fd.append("defaultCategory", defaultCategory);

      const res = await fetch(`/api/admin/import/commit?site_id=${siteId}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Commit failed");
      setCommitResult(data);
      try {
        localStorage.setItem(`ahp_last_import_commit_${siteId}`, JSON.stringify(data));
      } catch {}
      setActiveTab("commit");
      loadHistory();
    } catch (err) {
      setCommitError(err.message);
    } finally {
      setCommitLoading(false);
    }
  };

  // ─── History API call ───────────────────────────────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/admin/import/history?site_id=${siteId}&all=true&limit=1000`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setHistory(data);
      setHistoryPage(1);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "history") loadHistory();
  };

  // ─── Rollback ───────────────────────────────────────────────────────────
  const confirmRollback = async () => {
    if (!rollbackModal) return;
    setRollbackLoading(true);
    try {
      const res = await fetch(
        `/api/admin/import/${rollbackModal.batchId}/rollback?site_id=${siteId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rollback failed");
      setRollbackModal(null);
      await loadHistory();
    } catch (err) {
      alert("Rollback failed: " + err.message);
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to erase all import history logs?")) {
      return;
    }
    setClearLoading(true);
    try {
      const res = await fetch(`/api/admin/import/history?site_id=${siteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear history");
      await loadHistory();
    } catch (err) {
      alert("Error clearing history: " + err.message);
    } finally {
      setClearLoading(false);
    }
  };

  const updateFieldMap = (srcCol, newPrismaField) => {
    setFieldMap((prev) => ({ ...prev, [srcCol]: newPrismaField }));
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Data Import & Restore Console
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Import content from CSV, JSON, XML, or SQL files with atomic rollback support.
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 overflow-x-auto">
          {[
            { key: "upload", label: "1. Upload File", icon: Upload },
            { key: "preview", label: "2. Preview & Map", icon: Search, disabled: !previewData },
            { key: "commit", label: "3. Import Result", icon: CheckCircle2, disabled: !commitResult },
            { key: "history", label: "4. Import History", icon: Layers },
          ].map(({ key, label, icon: Icon, disabled }) => (
            <button
              key={key}
              onClick={() => !disabled && handleTabChange(key)}
              disabled={disabled}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === key
                  ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                  : disabled
                  ? "border-transparent text-gray-300 dark:text-slate-600 cursor-not-allowed"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ── UPLOAD TAB ── */}
        {activeTab === "upload" && (
          <div className="space-y-6">
            <div
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                  : file
                  ? "border-green-500 bg-green-50/30 dark:bg-green-950/20"
                  : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-500"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.xml,.sql,.ndjson,.jsonl"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="flex justify-center mb-3">
                {file ? (
                  <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 rounded-full">
                    <FileText size={32} />
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-full">
                    <Upload size={32} />
                  </div>
                )}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Click or drop another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    Drag & drop file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Supports WordPress XML (.xml), CSV (.csv), JSON (.json), and SQL (.sql) dumps · Max 10 MB
                  </p>
                </div>
              )}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Import Target Model (Optional Override)
                </label>
                <select
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Auto-detect (Recommended)</option>
                  {TARGET_MODELS.map((m) => (
                    <option key={m} value={m}>{MODEL_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Default Category (Assign to Posts)
                </label>
                <input
                  type="text"
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  placeholder="e.g. Wellness, Health, News"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Default Contributor ID (for Recipes)
                </label>
                <input
                  type="text"
                  value={defaultContributorId}
                  onChange={(e) => setDefaultContributorId(e.target.value)}
                  placeholder="User ID (optional)"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {previewError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{previewError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={runPreview}
                disabled={!file || previewLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {previewLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Analyzing file…
                  </>
                ) : (
                  <>
                    Preview & Detect Fields
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {activeTab === "preview" && previewData && (
          <div className="space-y-6">
            {/* Detection Summary Card */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 block">Format</span>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                    {(previewData.format || "").toUpperCase()}
                  </span>
                </div>

                <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block" />

                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 block">Target Model</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {previewData.targetModel ? MODEL_LABELS[previewData.targetModel] : "Unknown"}
                  </span>
                </div>

                {previewData.confidence != null && (
                  <ConfidenceBadge value={previewData.confidence} />
                )}
              </div>

              {previewData.previewValidation && (
                <div className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    ✓ {previewData.previewValidation.validRows} valid rows
                  </span>
                  {previewData.previewValidation.errors.length > 0 && (
                    <span className="text-red-500 ml-2">
                      ({previewData.previewValidation.errors.length} errors)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Field Mapping Table */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Field Mapping</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Review and adjust how source columns map to {previewData.targetModel} database fields.
              </p>

              <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Source Column</th>
                      <th className="px-4 py-3">→ Maps to Field</th>
                      <th className="px-4 py-3">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {Object.entries(fieldMap).map(([srcCol, prismaField]) => (
                      <tr key={srcCol} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {srcCol}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={prismaField}
                            onChange={(e) => updateFieldMap(srcCol, e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— skip —</option>
                            {["title","slug","content","excerpt","status","publishedAt",
                              "seoTitle","seoDescription","ogImage","canonicalUrl",
                              "categories","tags","authorId","question","answer",
                              "clientName","rating","name","role","bio",
                              "type","ingredients","steps","cookingTime","calories",
                              "description","price","coverImage","magazineId","link"
                            ].map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                            <option value={prismaField}>{prismaField}</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                          {String(previewData.sampleRows?.[0]?.[prismaField] ?? "").slice(0, 60) || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {commitError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{commitError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setActiveTab("upload")}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back to Upload
              </button>

              <button
                onClick={runCommit}
                disabled={commitLoading || !previewData.targetModel}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {commitLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Executing Import…
                  </>
                ) : (
                  <>
                    Run Atomic Import
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── COMMIT RESULT TAB ── */}
        {activeTab === "commit" && commitResult && (
          <div className="space-y-6">
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {commitResult.status === "COMPLETED" ? "Import Complete!" : "Import Finished with Errors"}
              </h3>
              <p className="text-xs font-mono text-gray-500">
                Batch ID: {commitResult.batchId}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white block">{commitResult.totalRows}</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Total Rows</span>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 rounded-xl text-center">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400 block">{commitResult.successRows}</span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Imported</span>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-center">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400 block">{commitResult.failedRows}</span>
                <span className="text-xs font-bold text-red-500 uppercase">Failed</span>
              </div>
            </div>

            {Array.isArray(commitResult.errorLog) && commitResult.errorLog.length > 0 && (
              <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-red-800 dark:text-red-300">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                  <span>Import Failure Details ({commitResult.errorLog.length} error{commitResult.errorLog.length > 1 ? "s" : ""})</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {commitResult.errorLog.map((err, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/60 rounded-lg p-3 text-xs shadow-sm">
                      <span className="font-mono font-bold text-red-600 dark:text-red-400 mr-2">
                        {err.rowIndex >= 0 ? `Row ${err.rowIndex + 1}:` : "Batch Error:"}
                      </span>
                      <span className="text-gray-800 dark:text-slate-200 font-medium">
                        {Array.isArray(err.errors) ? err.errors.join("; ") : String(err.errors)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => {
                  setFile(null); setPreviewData(null); setCommitResult(null);
                  try { localStorage.removeItem(`ahp_last_import_commit_${siteId}`); } catch {}
                  setFieldMap({}); setHint(""); setActiveTab("upload");
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-all cursor-pointer"
              >
                Import Another File
              </button>

              <button
                onClick={() => handleTabChange("history")}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Layers size={16} />
                View Import History
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Import Execution History</h3>
              <div className="flex gap-2">
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
                {isAdmin && (
                  <button
                    onClick={handleClearHistory}
                    disabled={clearLoading}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Erase History
                  </button>
                )}
              </div>
            </div>

            {historyLoading && (
              <div className="py-12 text-center text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium">Loading history logs…</p>
              </div>
            )}

            {historyError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{historyError}</span>
              </div>
            )}

            {history && !historyLoading && (
              history.batches.length === 0 ? (
                <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                  <FileCode size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No import history logs found yet.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">File Name</th>
                        <th className="px-4 py-3">Type → Model</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Rows</th>
                        <th className="px-4 py-3">Date</th>
                        {isAdmin && <th className="px-4 py-3">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                      {history.batches
                        .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                        .map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                            {b.fileName}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                              {(b.sourceType || "").toUpperCase()}
                            </span>
                            <span className="text-gray-400 mx-1.5">→</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                              {MODEL_LABELS[b.targetModel] || b.targetModel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium">
                            <span className="text-green-600 dark:text-green-400">{b.successRows}</span>
                            <span className="text-gray-400">/{b.totalRows}</span>
                            {b.failedRows > 0 && (
                              <span className="text-red-500 ml-1">({b.failedRows} err)</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-slate-400">
                            {formatDate(b.createdAt)}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3.5">
                              {b.canRollback ? (
                                <button
                                  onClick={() => setRollbackModal({ batchId: b.id, fileName: b.fileName, rows: b.successRows })}
                                  className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-medium text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw size={12} />
                                  Rollback
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {b.status === "ROLLED_BACK" ? "Rolled back" : "—"}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/80 dark:bg-slate-800/40 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <div>
                        Showing <span className="font-semibold text-gray-900 dark:text-white">{history.batches.length > 0 ? (historyPage - 1) * historyPageSize + 1 : 0}</span> to{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">{Math.min(historyPage * historyPageSize, history.batches.length)}</span> of{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">{history.batches.length}</span> total import logs
                      </div>

                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-slate-700">
                        <span className="text-[11px]">Show:</span>
                        {[10, 25, 50, 100, 99999].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setHistoryPageSize(size);
                              setHistoryPage(1);
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                              historyPageSize === size
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {size === 99999 ? "All" : size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {Math.ceil(history.batches.length / historyPageSize) > 1 && (
                      <Pagination
                        currentPage={historyPage}
                        totalPages={Math.ceil(history.batches.length / historyPageSize)}
                        onPageChange={(p) => setHistoryPage(p)}
                      />
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Rollback confirmation modal */}
      {rollbackModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
              <RotateCcw size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Confirm Atomic Rollback
            </h3>

            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to rollback batch for <strong>{rollbackModal.fileName}</strong>?
              This will undo all <strong>{rollbackModal.rows}</strong> created or updated records.
            </p>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setRollbackModal(null)}
                disabled={rollbackLoading}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium text-sm rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={confirmRollback}
                disabled={rollbackLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {rollbackLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Rolling back…
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Confirm Rollback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
