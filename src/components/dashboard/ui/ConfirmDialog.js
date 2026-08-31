"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";

/**
 * ConfirmDialog — Standardized confirmation modal for destructive/important actions.
 *
 * Props:
 *   isOpen       {boolean}  — dialog visibility state
 *   onClose      {function} — called when user cancels or closes modal
 *   onConfirm    {function} — called when user clicks primary confirm button
 *   title        {string}   — heading text
 *   description  {string}   — secondary details/message
 *   confirmLabel {string}   — confirm button text (default: "Confirm")
 *   cancelLabel  {string}   — cancel button text (default: "Cancel")
 *   variant      {'danger'|'warning'|'primary'} — visual style (default: "danger")
 *   loading      {boolean}  — optional loading spinner state on confirm
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}) {
  if (!isOpen) return null;

  const confirmStyle = {
    danger: {
      background: "var(--admin-error, #dc2626)",
      color: "#ffffff",
    },
    warning: {
      background: "var(--admin-warning, #ca8a04)",
      color: "#ffffff",
    },
    primary: {
      background: "var(--admin-accent, #0f7c85)",
      color: "#ffffff",
    },
  };

  const iconEl = {
    danger: <AlertTriangle size={20} style={{ color: "var(--admin-error, #dc2626)" }} className="shrink-0" />,
    warning: <AlertTriangle size={20} style={{ color: "var(--admin-warning, #ca8a04)" }} className="shrink-0" />,
    primary: <Info size={20} style={{ color: "var(--admin-accent, #0f7c85)" }} className="shrink-0" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div
        className="relative bg-[var(--admin-surface,#ffffff)] border border-[var(--admin-border,#e2e8f0)] rounded-2xl p-6 shadow-2xl max-w-md w-full z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-3.5">
          <div
            className="p-3 rounded-xl flex-shrink-0"
            style={{ background: "var(--admin-bg-elevated, #f1f5f9)" }}
          >
            {iconEl[variant] || iconEl.danger}
          </div>

          <div className="flex-1 space-y-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold" style={{ color: "var(--admin-text, #0f172a)" }}>
              {title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted, #64748b)" }}>
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center justify-end gap-3 mt-6 pt-4"
          style={{ borderTop: "1px solid var(--admin-border, #e2e8f0)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer hover:bg-[var(--admin-bg-elevated)]"
            style={{
              borderColor: "var(--admin-border, #e2e8f0)",
              background: "var(--admin-surface, #ffffff)",
              color: "var(--admin-text-secondary, #334155)",
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (onConfirm) await onConfirm();
            }}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0 inline-flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95"
            style={confirmStyle[variant] || confirmStyle.danger}
          >
            {loading && (
              <span
                className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"
              />
            )}
            <span className="whitespace-nowrap px-1">{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
