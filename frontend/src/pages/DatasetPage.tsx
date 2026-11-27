import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getItems, getSummary } from "../api/client";
import { DATASETS, fmtDate, fmtShortDate } from "../api/format";
import type { Dataset } from "../api/types";
import { useApi } from "../api/useApi";
import AgingPivot from "../components/AgingPivot";
import CategoryBreakdown from "../components/CategoryBreakdown";
import ItemTable, { columnsFor } from "../components/ItemTable";
import { Banner, Card, Loading, SearchIcon, Select, inputCls } from "../components/ui";
import { useSelectedDate } from "../context/SnapshotContext";

const checkCls = "flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600";

// One page per list (PR, QR Buyer Update, QR Buyer Verify). Filters live in the URL, so a filtered list can be bookmarked.
export default function DatasetPage({ dataset }: { dataset: Dataset }) {
  const [date] = useSelectedDate();
  const [params, setParams] = useSearchParams();
  const summary = useApi(() => getSummary(dataset, date), [dataset, date]);
  const list = useApi(() => getItems(dataset, date), [dataset, date]);

  const filters = {
    q: params.get("q") ?? "",
    buyer: params.get("buyer") ?? "",
    aged: params.get("aged") === "1",
    new: params.get("new") === "1",
  };
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const columns = columnsFor(dataset);
  const agedDays = list.data?.aged_days ?? 3;
  const filtered = useMemo(() => {
    if (!list.data) return [];
    const q = filters.q.trim().toLowerCase();
    return list.data.items.filter(
      (r) =>
        (!filters.buyer || r.buyer === filters.buyer) &&
        (!filters.new || r.is_new) &&
        (!filters.aged || (r.aging_days ?? 0) > agedDays) &&
        (!q || columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))),
    );
  }, [list.data, filters.q, filters.buyer, filters.new, filters.aged, agedDays, columns]);

  const error = summary.error || list.error;
  if (error) return <Banner notice={{ type: "error", text: error }} />;
  if (!summary.data || !list.data) return <Loading />;

  const info = DATASETS[dataset];
  const { prev_date: prevDate, cleared } = list.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-red">{fmtDate(summary.data.date)}</p>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-brand-navy">
          {info.label} <span className="text-slate-400">· {summary.data.total} items</span>
        </h1>
      </div>

      <Card
        title={`Count by buyer × ${info.agingLabel.toLowerCase()}`}
        description={`Columns above ${agedDays} days are in red. Click a buyer to filter the list below.`}
      >
        <AgingPivot summary={summary.data} selected={filters.buyer} onSelect={(b) => setFilter("buyer", b)} />
      </Card>

      <Card title="Count by buyer and category">
        <CategoryBreakdown summary={summary.data} />
      </Card>

      <Card
        title={`Items (${filtered.length})`}
        description={prevDate ? `"New" means not in the previous upload (${fmtDate(prevDate)}).` : undefined}
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-50 px-5 py-4 sm:px-7">
          <div className="relative min-w-60 flex-1 sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search number, description, vendor…"
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              className={`${inputCls} pl-11`}
            />
          </div>
          <div className="w-48">
            <Select value={filters.buyer} onChange={(e) => setFilter("buyer", e.target.value)} aria-label="Buyer">
              <option value="">All buyers</option>
              {summary.data.buyers.map((b) => (
                <option key={b.buyer}>{b.buyer}</option>
              ))}
            </Select>
          </div>
          <label className={checkCls}>
            <input type="checkbox" checked={filters.aged} onChange={(e) => setFilter("aged", e.target.checked ? "1" : "")} className="h-4 w-4 accent-brand-red" />
            Older than {agedDays} days
          </label>
          {prevDate && (
            <label className={checkCls}>
              <input type="checkbox" checked={filters.new} onChange={(e) => setFilter("new", e.target.checked ? "1" : "")} className="h-4 w-4 accent-brand-blue" />
              New since {fmtShortDate(prevDate)}
            </label>
          )}
        </div>
        <ItemTable columns={columns} rows={filtered} agedDays={agedDays} />
      </Card>

      {prevDate && (
        <details className="group rounded-2xl border border-blue-100 bg-white shadow-[0_12px_35px_rgba(7,27,85,0.08)]">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm sm:px-7">
            <span className="font-extrabold text-brand-navy">Cleared since {fmtDate(prevDate)} ({cleared.length})</span>
            <span className="ml-2 text-slate-500">These were open in the previous upload and are not in this one.</span>
            <span className="float-right font-bold text-brand-blue group-open:hidden">Show</span>
            <span className="float-right hidden font-bold text-brand-blue group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-blue-50">
            <ItemTable columns={columns} rows={cleared} agedDays={agedDays} showNew={false} />
          </div>
        </details>
      )}
    </div>
  );
}
