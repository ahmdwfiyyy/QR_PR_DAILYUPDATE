import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getOverview } from "../api/client";
import { DATASETS, DATASET_COLORS, DATASET_IDS, fmtLongDate } from "../api/format";
import { useApi } from "../api/useApi";
import KpiCard from "../components/KpiCard";
import { Banner, Card, Loading, tableHead, td, th } from "../components/ui";
import { useSelectedDate } from "../context/SnapshotContext";

export default function DashboardPage() {
  const [date] = useSelectedDate();
  const { data, error } = useApi(() => getOverview(date), [date]);
  if (error) return <Banner notice={{ type: "error", text: error }} />;
  if (!data) return <Loading />;

  const search = date ? `?date=${date}` : "";
  const totals = Object.fromEntries(DATASET_IDS.map((d) => [d, data.buyers.reduce((s, b) => s + (b[d] ?? 0), 0)]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-red">Daily summary</p>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-brand-navy">{fmtLongDate(data.date)}</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {DATASET_IDS.map((d) => (
          <KpiCard key={d} dataset={d} info={data.datasets[d]} agedDays={data.aged_days} search={search} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card title="By buyer" description="Open items per buyer on this day" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={`${th} text-left`}>Buyer</th>
                {DATASET_IDS.map((d) => (
                  <th key={d} className={`${th} text-right`}>
                    {DATASETS[d].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {data.buyers.map((b) => (
                <tr key={b.buyer} className="hover:bg-brand-ice/50">
                  <td className={`${td} font-bold text-slate-800`}>{b.buyer}</td>
                  {DATASET_IDS.map((d) => (
                    <td key={d} className={`${td} text-right tabular-nums`}>
                      {b[d] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-blue-100 font-extrabold text-brand-navy">
              <tr>
                <td className={td}>Total</td>
                {DATASET_IDS.map((d) => (
                  <td key={d} className={`${td} text-right tabular-nums`}>
                    {data.datasets[d] ? totals[d] : "—"}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card title="Workload by buyer" description="PR, Buyer Update and Buyer Verify side by side">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.buyers} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
              <XAxis dataKey="buyer" tick={{ fontSize: 12, fill: "#475569" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
              <Tooltip cursor={{ fill: "#f3f7ff" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {DATASET_IDS.map((d) => (
                <Bar key={d} dataKey={d} name={DATASETS[d].label} fill={DATASET_COLORS[d]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
