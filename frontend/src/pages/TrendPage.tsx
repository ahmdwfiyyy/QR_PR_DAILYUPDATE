import { useSearchParams } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMonths, getTrend } from "../api/client";
import { BUYER_COLORS, DATASETS, DATASET_IDS, fmtMonth, fmtShortDate, isWeekend } from "../api/format";
import type { Dataset } from "../api/types";
import { useApi } from "../api/useApi";
import { Banner, Card, Loading, Select, tableHead } from "../components/ui";

// Like the old monthly Summary sheet: per-buyer count for every day of the month, plus Avg/day.
export default function TrendPage() {
  const [params, setParams] = useSearchParams();
  const dataset = (DATASET_IDS.includes(params.get("dataset") as Dataset) ? params.get("dataset") : "PR") as Dataset;
  const month = params.get("month");
  const months = useApi(getMonths, []);
  const trend = useApi(() => getTrend(dataset, month), [dataset, month]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const t = trend.data;
  const chartData =
    t?.snapshot_days.map((d) => ({
      day: fmtShortDate(d),
      Total: t.total.values[d],
      ...Object.fromEntries(t.buyers.map((b) => [b.buyer, b.values[d]])),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-red">Monthly trend</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-brand-navy">
            {t ? `${t.label} · ${fmtMonth(t.month)}` : "Monthly trend"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-52">
            <Select value={dataset} onChange={(e) => setParam("dataset", e.target.value)} aria-label="List">
              {DATASET_IDS.map((d) => (
                <option key={d} value={d}>
                  {DATASETS[d].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select value={t?.month ?? month ?? ""} onChange={(e) => setParam("month", e.target.value)} aria-label="Month">
              {(months.data ?? []).map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {trend.error && <Banner notice={{ type: "error", text: trend.error }} />}
      {trend.loading && <Loading />}
      {t && (
        <>
          <Card
            title="Open items per upload day"
            description={t.snapshot_days.length < 2 ? "Upload more days to see a trend line." : undefined}
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Total" stroke="#071b55" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                {t.buyers.map((b, i) => (
                  <Line
                    key={b.buyer}
                    type="monotone"
                    dataKey={b.buyer}
                    stroke={BUYER_COLORS[i % BUYER_COLORS.length]}
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title={`Summary ${DATASETS[dataset].short} by buyer for ${fmtMonth(t.month)}`}
            description="“-” means no file was uploaded that day. Avg/day only counts days with an upload."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className="sticky left-0 bg-brand-ice px-4 py-3 text-left font-semibold">Buyer</th>
                    {t.days.map((d) => (
                      <th key={d} className={`px-1.5 py-3 text-center font-semibold ${isWeekend(d) ? "text-slate-300" : ""}`}>
                        {Number(d.slice(8))}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-semibold">Avg/day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {t.buyers.map((b) => (
                    <tr key={b.buyer} className="hover:bg-brand-ice/50">
                      <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-2.5 font-bold text-slate-800">{b.buyer}</td>
                      {t.days.map((d) => (
                        <td key={d} className="px-1.5 py-2.5 text-center tabular-nums">
                          {b.values[d] ?? <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-extrabold tabular-nums text-brand-navy">{b.avg ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-blue-100 font-extrabold text-brand-navy">
                  <tr>
                    <td className="sticky left-0 bg-white px-4 py-3">Total</td>
                    {t.days.map((d) => (
                      <td key={d} className="px-1.5 py-3 text-center tabular-nums">
                        {t.total.values[d] ?? <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums">{t.total.avg ?? "-"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
