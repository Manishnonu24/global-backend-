"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SectionCard from "@/components/dashboard/ui/SectionCard";
import DataTable from "@/components/dashboard/ui/DataTable";
import Badge from "@/components/dashboard/ui/Badge";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import {
  Download,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Mail,
  ShieldCheck,
  Eye,
  MessageSquare,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  TestTube,
  ChevronDown,
  Target,
  Inbox,
} from "lucide-react";

const SUBMISSION_STATUSES = ["new", "read", "spam", "archived"];
const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"];

// ─── Submissions Tab ──────────────────────────────────────────────────────────
function SubmissionsTab({ siteId, submissions, setSubmissions, total }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") || "";
  const currentPage = parseInt(searchParams.get("subPage") || "1", 10);

  const [searchInput, setSearchInput] = useState(currentQ);
  const [search, setSearch] = useState(currentQ);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Requirement: Debounce search/filter inputs (300ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      if (searchInput !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set("q", searchInput);
        else params.delete("q");
        params.set("subPage", "1");
        router.push(`?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, currentQ, router, searchParams]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.message?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, search, filterStatus]);

  const openEdit = (sub) => {
    setSelected(sub);
    setNotes(sub.notes || "");
    setStatus(sub.status || "new");
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/forms/submissions/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, status, notes } : s))
      );
      setSelected(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`/api/dashboard/forms/submissions/${deleteTargetId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (!res.ok) throw new Error("Delete failed");
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTargetId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("subPage", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const columns = [
    {
      key: "type",
      label: "Form Type",
      render: () => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40">
          📩 Contact Form
        </span>
      ),
    },
    {
      key: "sender",
      label: "Sender",
      sortable: true,
      render: (_, sub) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{sub.name}</div>
          <div className="dash-caption text-[11px]">{sub.email}</div>
          {sub.phone && <div className="dash-caption text-[10px]">{sub.phone}</div>}
        </div>
      ),
    },
    {
      key: "message",
      label: "Message Content",
      render: (_, sub) => (
        <div className="max-w-xs">
          <p className="truncate text-slate-700 dark:text-slate-300 text-xs">{sub.message}</p>
          {sub.notes && (
            <p className="dash-caption italic mt-0.5 truncate">Note: {sub.notes}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => <Badge status={val} />,
    },
    {
      key: "createdAt",
      label: "Date Received",
      sortable: true,
      render: (val) => (
        <span className="dash-caption font-mono">
          {new Date(val).toLocaleDateString("en-US")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, sub) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(sub)}
            className="p-1.5 text-slate-400 hover:text-[var(--color-accent)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[var(--radius-input)] transition-colors"
            title="Edit status & notes"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => setDeleteTargetId(sub.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[var(--radius-input)] transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Type Differentiation Banner */}
      <div className="bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 rounded-[var(--radius-card)] p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 dark:bg-sky-900/50 text-sky-600 rounded-[var(--radius-input)] shrink-0">
            <Mail size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wide">
                General Inquiries &amp; Website Forms
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-extrabold text-[9.5px] uppercase">
                📩 General Form
              </span>
            </div>
            <p className="dash-caption text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
              Customer support requests and contact form submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-800 rounded-[var(--radius-card)]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Search by name, email or message content..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none focus:border-[var(--color-accent)] bg-white dark:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[var(--color-muted)] shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-1.5 outline-none bg-white dark:bg-slate-800 font-medium"
          >
            <option value="all">All Statuses</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <SectionCard noPadding>
        <DataTable
          columns={columns}
          rows={filtered}
          emptyIcon={Inbox}
          emptyTitle="No form submissions found"
          emptyDescription="Contact form entries will appear here automatically when submitted."
          pageSize={50}
          totalCount={total}
          page={currentPage}
          onPageChange={handlePageChange}
        />
      </SectionCard>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Form Submission"
        description="Are you sure you want to permanently delete this form submission? This action cannot be undone."
      />

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[var(--radius-card)] border border-[var(--color-border)] dark:border-slate-800 overflow-hidden text-left" style={{ boxShadow: "var(--shadow-floating)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-[var(--color-accent)]" />
                <h3 className="dash-section-title text-slate-900 dark:text-slate-100">Submission Details</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-[var(--color-muted)] hover:text-slate-900 dark:hover:text-white rounded">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-[var(--radius-input)]">{error}</div>}

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-4 space-y-2 text-xs">
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Name:</span><span className="text-slate-900 dark:text-slate-100">{selected.name}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Email:</span><span className="text-slate-900 dark:text-slate-100">{selected.email}</span></div>
                {selected.phone && <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Phone:</span><span className="text-slate-900 dark:text-slate-100">{selected.phone}</span></div>}
                <div className="flex gap-2 mt-1"><span className="font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Date:</span><span className="dash-caption">{new Date(selected.createdAt).toLocaleString("en-US")}</span></div>
                <div className="pt-2 border-t border-[var(--color-border)] dark:border-slate-700">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Message:</span>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-white dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-700 rounded p-2.5 max-h-32 overflow-y-auto leading-relaxed">{selected.message}</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="dash-caption font-semibold block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none bg-white dark:bg-slate-800"
                  >
                    {SUBMISSION_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="dash-caption font-semibold block mb-1">Internal Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none bg-white dark:bg-slate-800"
                    placeholder="Add follow-up notes..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)] dark:border-slate-800">
                  <button type="button" onClick={() => setSelected(null)} className="px-4 py-1.5 text-xs border border-[var(--color-border)] dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-[var(--radius-input)] hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-[var(--radius-input)] hover:opacity-90 disabled:opacity-50 font-semibold transition-opacity">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────
function LeadsTab({ siteId, leads, setLeads, total }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") || "";
  const currentPage = parseInt(searchParams.get("leadPage") || "1", 10);

  const [searchInput, setSearchInput] = useState(currentQ);
  const [search, setSearch] = useState(currentQ);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Requirement: Debounce search/filter inputs (300ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      if (searchInput !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set("q", searchInput);
        else params.delete("q");
        params.set("leadPage", "1");
        router.push(`?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, currentQ, router, searchParams]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.serviceInterest?.toLowerCase().includes(q) ||
        l.sourcePage?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [leads, search, filterStatus]);

  const openEdit = (lead) => {
    setSelected(lead);
    setNotes(lead.notes || "");
    setStatus(lead.status || "new");
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/leads/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setLeads((prev) =>
        prev.map((l) => (l.id === selected.id ? { ...l, status, notes } : l))
      );
      setSelected(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`/api/dashboard/leads/${deleteTargetId}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (!res.ok) throw new Error("Delete failed");
      setLeads((prev) => prev.filter((l) => l.id !== deleteTargetId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("leadPage", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const columns = [
    {
      key: "prospect",
      label: "Prospect Name & Details",
      sortable: true,
      render: (_, lead) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
          <div className="dash-caption text-[11px]">{lead.email}</div>
          {lead.phone && <div className="dash-caption text-[10px]">{lead.phone}</div>}
        </div>
      ),
    },
    {
      key: "serviceInterest",
      label: "Service Interest",
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-[var(--color-accent)]">{val || "General"}</span>
      ),
    },
    {
      key: "sourcePage",
      label: "Source Page",
      render: (val) => <span className="dash-caption font-mono">{val || "Direct"}</span>,
    },
    {
      key: "notes",
      label: "Notes",
      render: (val) => (
        <p className="truncate max-w-xs text-xs text-slate-600 dark:text-slate-400 italic">
          {val ? `Note: ${val}` : "—"}
        </p>
      ),
    },
    {
      key: "status",
      label: "Pipeline Stage",
      sortable: true,
      render: (val) => <Badge status={val} />,
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (val) => (
        <span className="dash-caption font-mono">
          {new Date(val).toLocaleDateString("en-US")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, lead) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(lead)}
            className="p-1.5 text-slate-400 hover:text-[var(--color-accent)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[var(--radius-input)] transition-colors"
            title="Edit stage & notes"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => setDeleteTargetId(lead.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[var(--radius-input)] transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Type Differentiation Banner */}
      <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-[var(--radius-card)] p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-[var(--radius-input)] shrink-0">
            <Target size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                Sales Leads &amp; Opportunity Pipeline
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-extrabold text-[9.5px] uppercase">
                🎯 CRM Prospect
              </span>
            </div>
            <p className="dash-caption text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
              Qualified business leads tracked through pipeline stages.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-800 rounded-[var(--radius-card)]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Search by prospect name, email, service or source page..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none focus:border-[var(--color-accent)] bg-white dark:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[var(--color-muted)] shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-1.5 outline-none bg-white dark:bg-slate-800 font-medium"
          >
            <option value="all">All Stages</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <SectionCard noPadding>
        <DataTable
          columns={columns}
          rows={filtered}
          emptyIcon={Target}
          emptyTitle="No leads found"
          emptyDescription="Sales prospects will appear here automatically when created."
          pageSize={50}
          totalCount={total}
          page={currentPage}
          onPageChange={handlePageChange}
        />
      </SectionCard>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Sales Lead"
        description="Are you sure you want to permanently delete this lead? This action cannot be undone."
      />

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[var(--radius-card)] border border-[var(--color-border)] dark:border-slate-800 overflow-hidden text-left" style={{ boxShadow: "var(--shadow-floating)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-[var(--color-accent)]" />
                <h3 className="dash-section-title text-slate-900 dark:text-slate-100">Lead Details</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-[var(--color-muted)] hover:text-slate-900 dark:hover:text-white rounded">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-[var(--radius-input)]">{error}</div>}

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] p-4 space-y-2 text-xs">
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Prospect Name:</span><span className="text-slate-900 dark:text-slate-100">{selected.name}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Email:</span><span className="text-slate-900 dark:text-slate-100">{selected.email}</span></div>
                {selected.phone && <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Phone:</span><span className="text-slate-900 dark:text-slate-100">{selected.phone}</span></div>}
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Interest:</span><span className="font-semibold text-[var(--color-accent)]">{selected.serviceInterest || "General"}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Source Page:</span><span className="font-mono text-slate-700 dark:text-slate-300">{selected.sourcePage || "Direct"}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Captured:</span><span className="dash-caption">{new Date(selected.createdAt).toLocaleString("en-US")}</span></div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="dash-caption font-semibold block mb-1">Pipeline Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none bg-white dark:bg-slate-800 font-medium"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="dash-caption font-semibold block mb-1">Sales Notes &amp; Follow-up</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] dark:border-slate-700 rounded-[var(--radius-input)] outline-none bg-white dark:bg-slate-800"
                    placeholder="Record sales activity or follow-up notes..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)] dark:border-slate-800">
                  <button type="button" onClick={() => setSelected(null)} className="px-4 py-1.5 text-xs border border-[var(--color-border)] dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-[var(--radius-input)] hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-[var(--radius-input)] hover:opacity-90 disabled:opacity-50 font-semibold transition-opacity">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsManager({ siteId, initialSubmissions, initialLeads, totalSubmissions, totalLeads }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "submissions";

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [leads, setLeads] = useState(initialLeads);

  const switchTab = (tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`);
  };

  const handleExportCSV = () => {
    const currentData = activeTab === "submissions" ? submissions : leads;
    if (!currentData || currentData.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = Object.keys(currentData[0]).join(",");
    const rows = currentData.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            Form Inquiries &amp; Sales Leads
          </h1>
          <p className="admin-caption mt-1">
            Manage contact form entries and track business lead prospects.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <button
            onClick={handleExportCSV}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          onClick={() => switchTab("submissions")}
          className={`admin-tab ${activeTab === "submissions" ? "is-active" : ""}`}
        >
          <Mail size={14} /> Form Submissions ({totalSubmissions})
        </button>

        <button
          onClick={() => switchTab("leads")}
          className={`admin-tab ${activeTab === "leads" ? "is-active" : ""}`}
        >
          <Target size={14} /> Sales Leads ({totalLeads})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "submissions" ? (
        <SubmissionsTab
          siteId={siteId}
          submissions={submissions}
          setSubmissions={setSubmissions}
          total={totalSubmissions}
        />
      ) : (
        <LeadsTab
          siteId={siteId}
          leads={leads}
          setLeads={setLeads}
          total={totalLeads}
        />
      )}
    </div>
  );
}
