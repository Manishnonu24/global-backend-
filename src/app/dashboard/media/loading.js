export default function MediaLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
        </div>
      </div>

      {/* Filter / search bar */}
      <div className="flex gap-3">
        <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Media grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-2.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
