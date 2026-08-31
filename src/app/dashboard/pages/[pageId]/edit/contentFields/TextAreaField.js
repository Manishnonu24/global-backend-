"use client";

export default function TextAreaField({ label, value, onChange, error, placeholder, rows = 4 }) {
  return (
    <div className="space-y-1">
      <label className="dash-caption font-bold uppercase tracking-wider block">
        {label}
      </label>
      <textarea
        value={value || ""}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[var(--radius-input)] border p-2.5 text-xs outline-none transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
          error
            ? "border-red-500 focus:border-red-600"
            : "border-[var(--color-border)] dark:border-slate-700 focus:border-[var(--color-accent)]"
        }`}
      />
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}
