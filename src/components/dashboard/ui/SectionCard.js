/**
 * SectionCard — flat bordered card wrapper for dashboard panels.
 * Replaces the repeated `rounded-xl border ... p-4 shadow-sm` pattern across dashboard pages.
 *
 * Props:
 *   title       {string}     — card heading
 *   description {string}     — optional muted sub-heading below the title
 *   action      {ReactNode}  — optional right-side slot (button, link, badge, etc.)
 *   children    {ReactNode}  — card body content
 *   className   {string}     — optional additional class names
 *   noPadding   {boolean}    — if true, removes default padding (for tables that need full bleed)
 */
export default function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  noPadding = false,
}) {
  return (
    <div
      className={`${noPadding ? "admin-card-noPad" : "admin-card"} ${className}`}
      style={noPadding ? {} : {}}
    >
      {(title || action) && (
        <div
          className={`admin-card-header ${
            noPadding
              ? "px-5 py-4"
              : "mb-4"
          }`}
          style={
            noPadding
              ? { borderBottom: "1px solid var(--admin-border, #e2e8f0)" }
              : {}
          }
        >
          <div className="min-w-0">
            {title && (
              <h2 className="admin-section-title">{title}</h2>
            )}
            {description && (
              <p className="admin-caption mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
