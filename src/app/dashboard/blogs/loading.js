export default function BlogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-9 w-36 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-2 w-10 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Table header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 flex gap-8 border-b border-slate-100 dark:border-slate-800">
          {["Post", "Categories", "Author", "Status", "Date"].map((h) => (
            <div key={h} className="h-2.5 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="h-5 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-7 w-20 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
