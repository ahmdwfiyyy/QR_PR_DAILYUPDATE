import type { CSSProperties } from "react";
import { DATASETS } from "../api/format";
import type { Summary } from "../api/types";
import { tableHead, td, th } from "./ui";

// Brand blue, stronger for bigger counts
function heat(count: number | undefined, max: number): CSSProperties | undefined {
  if (!count) return undefined;
  const alpha = 0.1 + 0.65 * (count / max);
  return { background: `rgba(11, 60, 145, ${alpha.toFixed(2)})`, color: alpha > 0.45 ? "#fff" : undefined };
}

/** Count by buyer x aging days, like the pivot on each *_SUMMARY sheet. Click a buyer to filter. */
export default function AgingPivot({
  summary,
  selected,
  onSelect,
}: {
  summary: Summary;
  selected: string;
  onSelect: (buyer: string) => void;
}) {
  const max = Math.max(1, ...summary.buyers.flatMap((b) => Object.values(b.counts)));
  const cols = summary.aging_columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={tableHead}>
          <tr>
            <th className={`${th} text-left`}>Buyer \ {DATASETS[summary.dataset].agingLabel}</th>
            {cols.map((c) => (
              <th key={c} className={`px-2 py-3 text-center font-semibold ${c > summary.aged_days ? "text-brand-red" : ""}`}>
                {c}
              </th>
            ))}
            <th className={`${th} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {summary.buyers.map((b) => (
            <tr
              key={b.buyer}
              onClick={() => onSelect(selected === b.buyer ? "" : b.buyer)}
              title="Click to filter the list below"
              className={`cursor-pointer transition hover:bg-brand-ice/60 ${selected === b.buyer ? "bg-brand-ice" : ""}`}
            >
              <td className={`${td} whitespace-nowrap font-bold ${selected === b.buyer ? "text-brand-blue" : "text-slate-800"}`}>
                {b.buyer}
              </td>
              {cols.map((c) => (
                <td key={c} className="min-w-10 px-1 py-1.5 text-center tabular-nums">
                  <span className="block rounded-md py-1.5 font-semibold" style={heat(b.counts[c], max)}>
                    {b.counts[c] ?? ""}
                  </span>
                </td>
              ))}
              <td className={`${td} text-right font-extrabold tabular-nums text-brand-navy`}>{b.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-blue-100 font-extrabold text-brand-navy">
          <tr>
            <td className={td}>Grand total</td>
            {cols.map((c) => (
              <td key={c} className="px-2 py-3 text-center tabular-nums">
                {summary.column_totals[String(c)] ?? ""}
              </td>
            ))}
            <td className={`${td} text-right tabular-nums`}>{summary.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
