"use client";

import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import EmptyState from "./EmptyState";

/**
 * DataTable — generic, reusable data table for dashboard list pages.
 *
 * Server-renderable when no interaction props are needed. Only sort headers
 * and pagination require client state (handled here as the minimal client boundary).
 *
 * Props:
 *   columns   {Array<{ key, label, sortable?, render?, width?, align? }>}
 *   rows      {Array<object>}  — data rows, keyed by columns[*].key
 *   loading   {boolean}        — shows skeleton rows
 *   emptyIcon {ReactNode}      — passed to EmptyState
 *   emptyTitle {string}        — passed to EmptyState
 *   emptyDescription {string}  — passed to EmptyState
 *   emptyAction {object}       — passed to EmptyState
 *   pageSize  {number}         — rows per page (default 20; 0 = no pagination)
 *   totalCount {number}        — total rows for pagination (if server-paginated)
 *   page      {number}         — current page (1-based, for server pagination)
 *   onPageChange {function}    — called with new page number (server pagination)
 *   onSort    {function}       — called with { key, dir } on sort click (server sort)
 *   defaultSort {{ key, dir }} — initial sort state
 *   rowKey    {string|function} — field name or fn(row) → key
 *   className {string}         — extra wrapper class
 */
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  emptyIcon,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
  pageSize = 20,
  totalCount,
  page: controlledPage,
  onPageChange,
  onSort,
  defaultSort,
  rowKey = "id",
  className = "",
}) {
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? "");
  const [sortDir, setSortDir] = useState(defaultSort?.dir ?? "asc");
  const [localPage, setLocalPage] = useState(1);

  // Determine whether we are server-paginated
  const isServerPaginated = typeof onPageChange === "function";
  const currentPage = isServerPaginated ? (controlledPage ?? 1) : localPage;

  const handleSort = useCallback((key) => {
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(nextDir);
    if (onSort) onSort({ key, dir: nextDir });
  }, [sortKey, sortDir, onSort]);

  // Client-side sort (when no onSort provided)
  const sortedRows = (!onSort && sortKey)
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  // Client-side pagination (when no onPageChange)
  const effectiveTotal = totalCount ?? rows.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(effectiveTotal / pageSize)) : 1;
  const displayRows = (!isServerPaginated && pageSize > 0)
    ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedRows;

  const getRowKey = (row, idx) =>
    typeof rowKey === "function" ? rowKey(row) : (row[rowKey] ?? idx);

  const SKELETON_ROWS = Array.from({ length: Math.min(pageSize || 5, 8) });

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Table container */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          {/* Sticky header */}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  data-sortable={col.sortable ? "" : undefined}
                  className={col.align === "right" ? "text-right" : ""}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1"
                      style={{ color: "inherit" }}
                    >
                      {col.label}
                      <span className="inline-flex flex-col -space-y-0.5">
                        <ChevronUp
                          size={9}
                          style={{
                            color: sortKey === col.key && sortDir === "asc"
                              ? "var(--admin-accent, #0f7c85)"
                              : undefined,
                            opacity: sortKey === col.key && sortDir === "asc" ? 1 : 0.3,
                          }}
                        />
                        <ChevronDown
                          size={9}
                          style={{
                            color: sortKey === col.key && sortDir === "desc"
                              ? "var(--admin-accent, #0f7c85)"
                              : undefined,
                            opacity: sortKey === col.key && sortDir === "desc" ? 1 : 0.3,
                          }}
                        />
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading skeleton */}
            {loading &&
              SKELETON_ROWS.map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div
                        className="admin-skeleton h-3 rounded"
                        style={{ width: col.skeletonWidth ?? "80%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Data rows */}
            {!loading &&
              displayRows.map((row, idx) => (
                <tr key={getRowKey(row, idx)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : ""} ${
                        col.numeric ? "col-numeric" : ""
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {!loading && displayRows.length === 0 && (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          compact
        />
      )}

      {/* Pagination footer */}
      {!loading && pageSize > 0 && totalPages > 1 && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          style={{
            borderTop: "1px solid var(--admin-border, #e2e8f0)",
            background: "var(--admin-surface-muted, #f8fafc)",
          }}
        >
          <p className="admin-caption">
            {isServerPaginated
              ? `Page ${currentPage} of ${totalPages} · ${effectiveTotal} total`
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, effectiveTotal)} of ${effectiveTotal}`
            }
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => isServerPaginated ? onPageChange(currentPage - 1) : setLocalPage((p) => p - 1)}
              className="admin-btn-icon"
              style={{ width: "28px", height: "28px" }}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2 text-xs font-semibold" style={{ color: "var(--admin-text-secondary, #334155)" }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => isServerPaginated ? onPageChange(currentPage + 1) : setLocalPage((p) => p + 1)}
              className="admin-btn-icon"
              style={{ width: "28px", height: "28px" }}
              aria-label="Next page"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
