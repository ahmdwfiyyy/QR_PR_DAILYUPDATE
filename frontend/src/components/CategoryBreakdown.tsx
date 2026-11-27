import type { Summary } from "../api/types";

/** Count by buyer and category, like the second pivot on each *_SUMMARY sheet. */
export default function CategoryBreakdown({ summary }: { summary: Summary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summary.categories.map((b) => (
        <div key={b.buyer} className="rounded-xl border border-blue-100 bg-brand-ice/40 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-extrabold text-brand-navy">{b.buyer}</p>
            <p className="text-sm font-bold tabular-nums text-slate-500">{b.total}</p>
          </div>
          <div className="space-y-2">
            {b.categories.map((c) => (
              <div key={c.category} className="grid grid-cols-[1fr_72px_28px] items-center gap-2 text-xs">
                <span className="truncate text-slate-600" title={c.category}>
                  {c.category}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <span className="block h-full rounded-full bg-brand-blue" style={{ width: `${(100 * c.count) / b.total}%` }} />
                </span>
                <span className="text-right font-bold tabular-nums text-slate-700">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
