export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Metrics row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="space-y-2">
              <div className="h-2.5 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="h-64 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl" />
      <div className="h-32 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl" />
    </div>
  );
}
