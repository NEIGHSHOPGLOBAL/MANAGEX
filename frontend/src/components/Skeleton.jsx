export function Skeleton({ className = '', style }) {
  return <div className={`skeleton animate-shimmer ${className}`} style={style} />;
}

export function SkeletonMetricCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-metric p-4 border-l-4 border-l-slate-200">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 3 }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? 'flex-1' : 'w-24'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ type = 'donut' }) {
  return (
    <div className="card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-center justify-center py-4">
        {type === 'donut' ? (
          <Skeleton className="h-36 w-36 rounded-full" />
        ) : (
          <Skeleton className="h-40 w-full rounded-xl" />
        )}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTabs() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="flex gap-4 mb-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-24 rounded-lg" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <SkeletonMetricCards />
      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          <SkeletonTabs />
          <SkeletonTable rows={4} cols={3} />
        </div>
        <div className="space-y-5">
          <SkeletonChart type="donut" />
          <div className="card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
          <SkeletonChart type="pie" />
        </div>
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
  );
}
