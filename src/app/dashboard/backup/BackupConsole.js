"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  FileCode,
  FileSpreadsheet,
  Archive,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  Table,
} from "lucide-react";
import {
  parseCsvText,
  parseSqlText,
  parseXmlText,
  parseZipFile,
  autoDetectEntity,
  ENTITY_LABEL_MAP,
} from "@/lib/backupParsers";
import ImportConsole from "@/app/dashboard/import/ImportConsole";

export default function BackupConsole({ siteId, initialHistory }) {
  const [activeConsoleTab, setActiveConsoleTab] = useState("backup");
  const [history, setHistory] = useState(initialHistory);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isBackingUpMedia, setIsBackingUpMedia] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [parsedPayload, setParsedPayload] = useState(null);
  const [detectedFormat, setDetectedFormat] = useState(null);
  const [csvRecords, setCsvRecords] = useState(null);
  const [csvTargetEntity, setCsvTargetEntity] = useState("pages");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [exportFormat, setExportFormat] = useState("json");

  const jsonToSql = (data) => {
    let sql = `-- Database Snapshot SQL Dump\n-- Generated for Site ID: ${siteId}\n-- Timestamp: ${new Date().toISOString()}\n\n`;
    for (const [tableName, records] of Object.entries(data)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      sql += `-- Table: ${tableName}\n`;
      records.forEach((record) => {
        const columns = Object.keys(record);
        const values = columns.map((col) => {
          let val = record[col];
          if (val === null) return "NULL";
          if (typeof val === "boolean") return val ? "1" : "0";
          if (typeof val === "object")
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          return val;
        });
        sql += `INSERT INTO \`${tableName}\` (\`${columns.join(
          "`, `",
        )}\`) VALUES (${values.join(", ")});\n`;
      });
      sql += "\n";
    }
    return sql;
  };

  const jsonToCsvZip = async (data, filename) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const [tableName, records] of Object.entries(data)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      const columns = Object.keys(records[0]);
      let csv = columns.join(",") + "\n";

      records.forEach((record) => {
        const row = columns.map((col) => {
          let val = record[col];
          if (val === null) return "";
          if (typeof val === "object") val = JSON.stringify(val);
          else val = String(val);

          val = val.replace(/"/g, '""');
          if (val.includes(",") || val.includes("\n") || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        });
        csv += row.join(",") + "\n";
      });

      zip.file(`${tableName}.csv`, csv);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const triggerBackup = async () => {
    setIsBackingUp(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dashboard/backup/database", {
        method: "POST",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate backup");
      }

      const result = await res.json();
      const backup = result.data?.backup ?? result.backup;

      if (exportFormat === "sql") {
        const sqlContent = jsonToSql(backup.data);
        const dataStr =
          "data:text/sql;charset=utf-8," + encodeURIComponent(sqlContent);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
          "download",
          `site_backup_${siteId}_${Date.now()}.sql`,
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else if (exportFormat === "csv") {
        await jsonToCsvZip(
          backup.data,
          `site_backup_${siteId}_${Date.now()}.zip`,
        );
      } else {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(backup, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
          "download",
          `site_backup_${siteId}_${Date.now()}.json`,
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }

      const historyRes = await fetch(`/api/dashboard/backup/history`, {
        headers: { "x-site-id": siteId },
      });
      const historyResult = await historyRes.json();
      const history =
        historyResult.data?.backupHistory ?? historyResult.backupHistory;
      if (history) {
        setHistory(history);
      }
      setSuccess(
        `Database backup successfully compiled and downloaded as ${exportFormat.toUpperCase()}!`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const triggerMediaBackup = async () => {
    setIsBackingUpMedia(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dashboard/backup/media", {
        method: "POST",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate media backup");
      }

      const result = await res.json();
      const backup = result.data?.backup ?? result.backup;

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `media_backup_${siteId}_${Date.now()}.json`,
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      const historyRes = await fetch(`/api/dashboard/backup/history`, {
        headers: { "x-site-id": siteId },
      });
      const historyResult = await historyRes.json();
      const history =
        historyResult.data?.backupHistory ?? historyResult.backupHistory;
      if (history) {
        setHistory(history);
      }
      setSuccess("Media backup successfully compiled and downloaded!");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBackingUpMedia(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setRestoreFile(file);
    setIsParsingFile(true);
    setParsedPayload(null);
    setCsvRecords(null);
    setShowInspector(false);

    const ext = file.name.split(".").pop().toLowerCase();

    try {
      if (ext === "json") {
        setDetectedFormat("JSON");
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.data || json.media || json.folders) {
          setParsedPayload({ siteId, ...json });
        } else {
          setParsedPayload({ siteId, version: "1.1", data: json });
        }
      } else if (ext === "xml") {
        setDetectedFormat("XML");
        const text = await file.text();
        const data = parseXmlText(text);
        setParsedPayload({ siteId, version: "1.1", data });
      } else if (ext === "sql") {
        setDetectedFormat("SQL");
        const text = await file.text();
        const data = parseSqlText(text);
        setParsedPayload({ siteId, version: "1.1", data });
      } else if (ext === "csv") {
        setDetectedFormat("CSV");
        const text = await file.text();
        const records = parseCsvText(text);
        setCsvRecords(records);
        const autoEntity = autoDetectEntity(
          Object.keys(records[0] || {}),
          file.name,
        );
        setCsvTargetEntity(autoEntity);
        setParsedPayload({
          siteId,
          version: "1.1",
          data: { [autoEntity]: records },
        });
      } else if (ext === "zip") {
        setDetectedFormat("CSV Archive (ZIP)");
        const data = await parseZipFile(file);
        setParsedPayload({ siteId, version: "1.1", data });
      } else {
        throw new Error(
          "Unsupported file format. Please upload a .json, .xml, .sql, .csv, or .zip file.",
        );
      }
    } catch (err) {
      setError(`Failed to parse ${file.name}: ${err.message}`);
      setParsedPayload(null);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleCsvEntityChange = (newEntity) => {
    setCsvTargetEntity(newEntity);
    if (csvRecords) {
      setParsedPayload({
        siteId,
        version: "1.1",
        data: { [newEntity]: csvRecords },
      });
    }
  };

  const triggerRestore = async (e) => {
    e.preventDefault();
    if (!parsedPayload) {
      setError("Please upload a valid JSON, XML, SQL, CSV, or ZIP backup file first.");
      return;
    }

    const isMedia =
      parsedPayload && (parsedPayload.media || parsedPayload.folders);
    const totalCount = parsedPayload.data
      ? Object.values(parsedPayload.data).reduce(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0,
      )
      : (parsedPayload.media?.length || 0) + (parsedPayload.folders?.length || 0);

    const confirmMessage = isMedia
      ? "CRITICAL WARNING: Restoring the media snapshot will delete and overwrite your current site media folders and file references. Are you sure you want to proceed?"
      : `CRITICAL WARNING: Restoring this backup will replace current database tables with ${totalCount} records extracted from your ${detectedFormat} file. Are you sure you want to proceed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dashboard/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({ backup: parsedPayload }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to restore backup");
      }

      const resJson = await res.json();
      const msg = resJson.data?.message ?? resJson.message;
      setSuccess(
        msg ||
        "Database successfully rollbacked and restored! Reloading state...",
      );
      setRestoreFile(null);
      setParsedPayload(null);
      setDetectedFormat(null);
      setCsvRecords(null);

      const historyRes = await fetch(`/api/dashboard/backup/history`, {
        headers: { "x-site-id": siteId },
      });
      const historyResult = await historyRes.json();
      const history =
        historyResult.data?.backupHistory ?? historyResult.backupHistory;
      if (history) {
        setHistory(history);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFormatBadgeColor = (format) => {
    switch (format) {
      case "JSON":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "XML":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "SQL":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "CSV":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CSV Archive (ZIP)":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case "JSON":
        return <FileText size={18} className="text-amber-600" />;
      case "XML":
        return <FileCode size={18} className="text-cyan-600" />;
      case "SQL":
        return <Database size={18} className="text-indigo-600" />;
      case "CSV":
        return <FileSpreadsheet size={18} className="text-emerald-600" />;
      case "CSV Archive (ZIP)":
        return <Archive size={18} className="text-purple-600" />;
      default:
        return <Upload size={18} className="text-gray-600" />;
    }
  };

  const entityEntries = parsedPayload?.data
    ? Object.entries(parsedPayload.data).filter(
      ([_, arr]) => Array.isArray(arr) && arr.length > 0,
    )
    : [];

  const totalParsedRecords = entityEntries.reduce(
    (sum, [_, arr]) => sum + arr.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Console Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveConsoleTab("backup")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeConsoleTab === "backup"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Database size={16} />
          Backup & Restore Engine
        </button>

        <button
          type="button"
          onClick={() => setActiveConsoleTab("import")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeConsoleTab === "import"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Upload size={16} />
          Data Import & Restore Console (CSV, XML, JSON, SQL)
        </button>
      </div>

      {activeConsoleTab === "import" ? (
        <div className="w-full">
          <ImportConsole siteId={siteId} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operations Panel */}
          <div className="lg:col-span-2 space-y-6">
        {/* Banner Alert Messages */}
        {error && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm animate-fadeIn">
            <AlertCircle className="shrink-0" size={18} />
            <div>
              <strong className="font-semibold">Operation failed:</strong>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm animate-fadeIn">
            <CheckCircle2 className="shrink-0" size={18} />
            <div>
              <strong className="font-semibold">Success:</strong>
              <p className="mt-0.5">{success}</p>
            </div>
          </div>
        )}

        {/* Compile Backup Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex gap-3 items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Compile Site Database Backup
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate an atomic snapshot of your website configuration
                including pages, blogs, services, testimonials, FAQs, redirects,
                and leads.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-gray-500">
              ⚡ Scope: All tables filtered under Site ID{" "}
              <span className="font-mono text-gray-800 bg-gray-200 px-1 py-0.5 rounded">
                {siteId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                disabled={isBackingUp || isBackingUpMedia || isRestoring}
                className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex-grow sm:flex-grow-0"
              >
                <option value="json">JSON Backup</option>
                <option value="sql">SQL Dump</option>
                <option value="csv">CSV Archive (ZIP)</option>
              </select>
              <button
                onClick={triggerBackup}
                disabled={isBackingUp || isBackingUpMedia || isRestoring}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300 transition flex-grow sm:flex-grow-0 cursor-pointer"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Compiling...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Compile Media Backup Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex gap-3 items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Compile Site Media Snapshot
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate an atomic snapshot of your website media asset folders
                and file links stored inside your remote bucket (S3/MinIO).
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-gray-500">
              ⚡ Scope: Media assets and folder hierarchies under Site ID{" "}
              <span className="font-mono text-gray-800 bg-gray-200 px-1 py-0.5 rounded">
                {siteId}
              </span>
            </div>
            <button
              onClick={triggerMediaBackup}
              disabled={isBackingUp || isBackingUpMedia || isRestoring}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-300 transition w-full sm:w-auto cursor-pointer"
            >
              {isBackingUpMedia ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Compiling...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Media JSON
                </>
              )}
            </button>
          </div>
        </div>

        {/* Restore Backup Card (Multi-format XML, SQL, CSV, ZIP, JSON) */}
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex gap-3 items-start">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Upload size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">
                  Atomic Rollback & Data Import Restore
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  <Sparkles size={12} /> Auto-Fetch & Format
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Upload a <strong>JSON, XML, SQL, CSV</strong>, or <strong>ZIP</strong> file.
                The system will automatically parse, extract, and arrange the data
                according to your site structure before atomic restoration.
              </p>
            </div>
          </div>

          <form onSubmit={triggerRestore} className="space-y-4 pt-2">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-500 transition relative bg-gray-50/50">
              <input
                type="file"
                accept=".json,.xml,.sql,.csv,.zip"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isBackingUp || isBackingUpMedia || isRestoring || isParsingFile}
              />
              <div className="space-y-2 text-sm text-gray-500">
                {isParsingFile ? (
                  <div className="flex flex-col items-center gap-2 py-2 text-blue-600">
                    <RefreshCw className="animate-spin" size={32} />
                    <p className="font-semibold text-sm">
                      Parsing & Arranging File Contents...
                    </p>
                  </div>
                ) : restoreFile ? (
                  <div className="flex items-center justify-center gap-3 bg-white p-3 border rounded-lg max-w-md mx-auto shadow-xs">
                    {getFormatIcon(detectedFormat)}
                    <div className="text-left overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate text-sm">
                        {restoreFile.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>{formatBytes(restoreFile.size)}</span>
                        <span>•</span>
                        <span
                          className={`px-1.5 py-0.2 rounded border text-[10px] font-medium ${getFormatBadgeColor(
                            detectedFormat,
                          )}`}
                        >
                          {detectedFormat}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400" size={32} />
                    <p className="text-gray-700 font-medium">
                      Drag & drop your backup file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400">
                      Supported Formats: <strong>.JSON, .XML, .SQL, .CSV, .ZIP</strong> (Up to 25MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Single CSV Target Selector */}
            {detectedFormat === "CSV" && csvRecords && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <Table size={14} /> Map CSV Data to Target Table:
                  </label>
                  <span className="text-xs text-emerald-700 font-mono">
                    {csvRecords.length} Rows Found
                  </span>
                </div>
                <select
                  value={csvTargetEntity}
                  onChange={(e) => handleCsvEntityChange(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(ENTITY_LABEL_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label} ({key})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-Arranged Data Structure Matrix */}
            {parsedPayload && entityEntries.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Auto-Arranged Data Breakdown
                    </h4>
                  </div>
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {totalParsedRecords} Total Records
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {entityEntries.map(([entityKey, records]) => (
                    <div
                      key={entityKey}
                      className="border rounded-lg p-2.5 bg-gray-50 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-gray-800 truncate">
                        {ENTITY_LABEL_MAP[entityKey] || entityKey}
                      </span>
                      <span className="ml-2 font-mono font-bold bg-white px-2 py-0.5 border rounded text-blue-700 shadow-2xs">
                        {records.length}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Inspect Arranged Payload Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInspector(!showInspector)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium transition cursor-pointer"
                  >
                    <Eye size={14} />
                    {showInspector ? "Hide Arranged Data Structure" : "Inspect Arranged Data Structure"}
                    {showInspector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showInspector && (
                    <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs font-mono rounded-lg max-h-60 overflow-y-auto">
                      {JSON.stringify(parsedPayload.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Submit Restore Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={
                  isBackingUp ||
                  isBackingUpMedia ||
                  isRestoring ||
                  isParsingFile ||
                  !parsedPayload
                }
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:bg-gray-300 disabled:text-gray-500 transition cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Restoring Database...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Upload & Restore Arranged Data
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Log Panel */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
          Backup History
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-6">
            No previous backups recorded.
          </p>
        ) : (
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {history.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 text-xs space-y-1 hover:bg-gray-50/50"
              >
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>
                    {log.type === "media" ? "Media Snapshot" : "Database Snap"}
                  </span>
                  <span className="text-gray-500">{formatBytes(log.size)}</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(log.timestamp).toLocaleString("en-US")}
                </div>
                <div
                  className="text-[10px] text-gray-500 font-mono truncate"
                  title={log.id}
                >
                  ID: {log.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    )}
    </div>
  );
}
