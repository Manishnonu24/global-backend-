/**
 * Badge — semantic status pill using admin design tokens.
 * Maps a `status` string to the correct color pair.
 * Never relies on colour alone — also shows textual status label.
 *
 * Props:
 *   status   {string}  — the status value (case-insensitive)
 *   label    {string}  — optional override for the display text (defaults to status)
 *   dot      {boolean} — if true, shows a small colored dot before the text
 *   size     {'sm'|'md'} — 'sm' (default) or 'md'
 */

const STATUS_MAP = {
  // Green — success, active, live, published
  published:   "success",
  active:      "success",
  new:         "success",
  live:        "success",
  success:     "success",
  approved:    "success",
  visible:     "success",
  enabled:     "success",
  open:        "success",

  // Yellow — draft, pending, warning, scheduled
  draft:       "warning",
  pending:     "warning",
  scheduled:   "warning",
  warning:     "warning",
  contacted:   "warning",
  review:      "warning",
  processing:  "warning",

  // Red — error, failed, rejected, blocked
  error:       "error",
  failed:      "error",
  rejected:    "error",
  blocked:     "error",
  spam:        "error",
  deleted:     "error",
  banned:      "error",
  unpublished: "error",

  // Blue — info, sending, in-progress
  info:        "info",
  sending:     "info",
  progress:    "info",
  importing:   "info",

  // Neutral — archived, cancelled, closed, superadmin
  archived:    "neutral",
  cancelled:   "neutral",
  closed:      "neutral",
  paused:      "neutral",
  disabled:    "neutral",
  inactive:    "neutral",

  // Roles
  superadmin:  "error",
  admin:       "warning",
  editor:      "accent",
  author:      "info",
  marketing:   "warning",
  visitor:     "neutral",
  viewer:      "neutral",
};

// Maps variant name → admin-badge-* class name
const BADGE_CLASS = {
  success: "admin-badge admin-badge-success",
  warning: "admin-badge admin-badge-warning",
  error:   "admin-badge admin-badge-error",
  info:    "admin-badge admin-badge-info",
  neutral: "admin-badge admin-badge-neutral",
  accent:  "admin-badge admin-badge-accent",
};

// Dot colour using inline styles from CSS vars
const DOT_COLOR = {
  success: "var(--admin-success, #16a34a)",
  warning: "var(--admin-warning, #ca8a04)",
  error:   "var(--admin-error, #dc2626)",
  info:    "var(--admin-info, #2563eb)",
  neutral: "var(--admin-text-muted, #64748b)",
  accent:  "var(--admin-accent, #0f7c85)",
};

export default function Badge({ status, label, dot = false, size = "sm" }) {
  const normalized = (status || "").toLowerCase().trim();
  const variant = STATUS_MAP[normalized] ?? "neutral";
  const displayText = label ?? status ?? "—";
  const sizeStyle = size === "md"
    ? { fontSize: "11px", padding: "3px 10px" }
    : { fontSize: "10px", padding: "2px 8px" };

  return (
    <span
      className={BADGE_CLASS[variant]}
      style={sizeStyle}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: DOT_COLOR[variant] }}
          aria-hidden="true"
        />
      )}
      {displayText}
    </span>
  );
}
