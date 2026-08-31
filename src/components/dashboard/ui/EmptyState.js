/**
 * EmptyState — icon + title + description + optional CTA button.
 * Replaces ad-hoc empty-state markup scattered across dashboard pages.
 *
 * Props:
 *   icon        {ReactNode} — lucide icon component
 *   title       {string}    — primary message
 *   description {string}    — secondary explanation (optional)
 *   action      {{ label: string, href?: string, onClick?: function }} — optional CTA
 *   compact     {boolean}   — if true, reduces vertical padding
 */
import Link from "next/link";

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8 px-4" : "py-16 px-6"
      }`}
    >
      {Icon && (
        <span
          className="inline-flex p-3.5 rounded-xl mb-4"
          style={{
            background: "var(--admin-bg-elevated, #e8edf4)",
            color: "var(--admin-text-muted, #64748b)",
          }}
        >
          <Icon size={compact ? 20 : 26} strokeWidth={1.5} />
        </span>
      )}

      <p className="admin-section-title mb-1">{title}</p>

      {description && (
        <p className="admin-caption max-w-xs mt-0.5">{description}</p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="admin-btn admin-btn-primary"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="admin-btn admin-btn-primary"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
