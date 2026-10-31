import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, BUYER_COLORS, DATASETS, formatDate, useLoad } from '../api'

export default function TrendView() {
  const [dataset, setDataset] = useState('PR')
  const [month, setMonth] = useState(null)
  const months = useLoad(() => api.months(), [])
  const trend = useLoad(() => api.trend(dataset, month), [dataset, month])

  useEffect(() => {
    if (!month && months.data?.length) setMonth(months.data[0])
  }, [months.data, month])

  const t = trend.data
  const chartData = t
    ? t.snapshot_days.map((d) => ({
        day: formatDate(d, { day: '2-digit', month: 'short' }),
        Total: t.total.values[d],
        ...Object.fromEntries(t.buyers.map((b) => [b.buyer, b.values[d]])),
      }))
    : []

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Monthly trend</h2>
        <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
          {Object.entries(DATASETS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
        </select>
        <select value={month ?? ''} onChange={(e) => setMonth(e.target.value)}>
          {(months.data ?? []).map((m) => (
            <option key={m} value={m}>{formatDate(`${m}-01`, { month: 'long', year: 'numeric' })}</option>
          ))}
        </select>
      </div>

      {trend.error && <div className="alert error">{trend.error}</div>}
      {t && (
        <>
          <section className="panel">
            <h3>{t.label}: open items per upload day</h3>
            {t.snapshot_days.length < 2 && <p className="muted small">Upload more days to see a trend line.</p>}
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#333" strokeWidth={2.5} dot={{ r: 3 }} />
                {t.buyers.map((b, i) => (
                  <Line key={b.buyer} type="monotone" dataKey={b.buyer} stroke={BUYER_COLORS[i % BUYER_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="panel">
            <h3>Summary {DATASETS[dataset].short} by buyer for {formatDate(`${t.month}-01`, { month: 'long', year: 'numeric' })}</h3>
            <div className="scroll-x">
              <table className="table month">
                <thead>
                  <tr>
                    <th>Buyer</th>
                    {t.days.map((d) => {
                      const dow = new Date(`${d}T00:00:00`).getDay()
                      return <th key={d} className={`num ${dow === 0 || dow === 6 ? 'weekend' : ''}`}>{Number(d.slice(8))}</th>
                    })}
                    <th className="num">Avg/day</th>
                  </tr>
                </thead>
                <tbody>
                  {t.buyers.map((b) => (
                    <tr key={b.buyer}>
                      <td>{b.buyer}</td>
                      {t.days.map((d) => <td key={d} className="num">{b.values[d] ?? <span className="muted">-</span>}</td>)}
                      <td className="num strong">{b.avg ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    {t.days.map((d) => <td key={d} className="num">{t.total.values[d] ?? '-'}</td>)}
                    <td className="num">{t.total.avg ?? '-'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="muted small">“-” means no file was uploaded for that day. Avg/day only counts days that have an upload.</p>
          </section>
        </>
      )}
    </div>
  )
}
