/**
 * StatCard — Dashboard metric card.
 * Fixed hierarchy: value is the visually dominant element, label is the caption.
 *
 * Props:
 *   title  {string}  — small muted label below the value
 *   value  {string|number} — the primary number/stat (large, bold)
 *   icon   {ReactNode}  — optional lucide icon shown in the top-right tint box
 *   trend  {{ direction: 'up'|'down', value: string }} — optional trend indicator
 *   loading {boolean} — skeleton state while data loads
 */
export default function StatCard({ title, value, icon: Icon, trend, loading = false }) {
  if (loading) {
    return (
      <div className="admin-stat-card">
        <div className="flex items-start justify-between gap-2">
          <div className="admin-skeleton h-3 w-24 rounded" />
          <div className="admin-skeleton h-8 w-8 rounded-lg" />
        </div>
        <div className="admin-skeleton h-8 w-20 rounded mt-1" />
      </div>
    );
  }

  return (
    <div className="admin-stat-card">
      <div className="flex items-start justify-between gap-2">
        <p className="admin-caption">{title}</p>
        {Icon && (
          <span
            className="shrink-0 inline-flex p-2 rounded-lg"
            style={{
              background: "var(--admin-accent-soft, rgba(15,124,133,0.10))",
              color: "var(--admin-accent, #0f7c85)",
            }}
          >
            <Icon size={16} />
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="admin-metric">{value ?? "—"}</p>
        {trend && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none"
            style={
              trend.direction === "up"
                ? {
                    background: "var(--admin-success-bg, #f0fdf4)",
                    color: "var(--admin-success, #16a34a)",
                  }
                : {
                    background: "var(--admin-error-bg, #fef2f2)",
                    color: "var(--admin-error, #dc2626)",
                  }
            }
          >
            {trend.direction === "up" ? "▲" : "▼"}{" "}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
