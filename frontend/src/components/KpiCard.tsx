import { Link } from "react-router-dom";
import { DATASETS, DATASET_COLORS, fmtShortDate } from "../api/format";
import type { Dataset, DatasetHeadline } from "../api/types";
import { ArrowIcon, ClockIcon, panel } from "./ui";

function Change({ info }: { info: DatasetHeadline }) {
  if (info.prev_total === null) return <p className="text-xs text-slate-400">No earlier upload to compare</p>;
  const diff = info.total - info.prev_total;
  // More open items is worse, so an increase is red
  const tone = diff > 0 ? "text-brand-red" : diff < 0 ? "text-emerald-600" : "text-slate-500";
  return (
    <p className="text-xs text-slate-500">
      <span className={`font-extrabold ${tone}`}>
        {diff > 0 ? "▲" : diff < 0 ? "▼" : "="} {Math.abs(diff)}
      </span>{" "}
      vs {fmtShortDate(info.prev_date)} · <span className="font-semibold text-slate-700">+{info.new}</span> new ·{" "}
      <span className="font-semibold text-slate-700">−{info.cleared}</span> cleared
    </p>
  );
}

/** Headline number for one dataset; links to its page. */
export default function KpiCard({
  dataset,
  info,
  agedDays,
  search,
}: {
  dataset: Dataset;
  info: DatasetHeadline | null | undefined;
  agedDays: number;
  search: string;
}) {
  return (
    <Link
      to={`${DATASETS[dataset].path}${search}`}
      className={`${panel} group flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(7,27,85,0.12)]`}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: DATASET_COLORS[dataset] }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{DATASETS[dataset].label}</p>
        <ArrowIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-blue" />
      </div>
      {info ? (
        <>
          <p className="text-4xl font-extrabold tracking-[-0.03em] text-brand-navy tabular-nums">{info.total}</p>
          <Change info={info} />
          <div className="mt-1 flex items-center gap-1.5 border-t border-blue-50 pt-3 text-xs">
            <ClockIcon className={`h-4 w-4 ${info.aged ? "text-brand-red" : "text-slate-400"}`} />
            <span className={info.aged ? "font-bold text-brand-red" : "text-slate-500"}>
              {info.aged} older than {agedDays} days
            </span>
            <span className="text-slate-400">· oldest {info.oldest}d</span>
          </div>
        </>
      ) : (
        <p className="py-4 text-sm text-slate-400">Not uploaded for this day</p>
      )}
    </Link>
  );
}
