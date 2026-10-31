import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, DATASETS, formatDate, useLoad } from '../api'

const SERIES_COLORS = { PR: '#2a78d6', BU: '#e07b39', BV: '#2f9e6b' }

function Delta({ info }) {
  if (info.prev_total == null) return <span className="muted small">No earlier upload to compare</span>
  const diff = info.total - info.prev_total
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : ''
  return (
    <span className="small">
      <span className={`delta ${cls}`}>{diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {Math.abs(diff)}</span>{' '}
      <span className="muted">vs {formatDate(info.prev_date, { day: '2-digit', month: 'short' })}</span>
      <br />
      <span className="muted">+{info.new} new · −{info.cleared} cleared</span>
    </span>
  )
}

export default function Dashboard({ date, onOpen }) {
  const { data, error, loading } = useLoad(() => api.overview(date), [date])
  if (error) return <div className="alert error">{error}</div>
  if (loading || !data) return <div className="loading">Loading…</div>

  const datasetIds = Object.keys(DATASETS)
  const totals = Object.fromEntries(datasetIds.map((d) => [d, data.buyers.reduce((s, b) => s + (b[d] ?? 0), 0)]))

  return (
    <div className="stack">
      <h2>Summary for {formatDate(data.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h2>

      <div className="cards">
        {datasetIds.map((id) => {
          const info = data.datasets[id]
          return (
            <button key={id} className="card kpi" onClick={() => onOpen(id)} style={{ borderTopColor: SERIES_COLORS[id] }}>
              <div className="kpi-label">{DATASETS[id].label}</div>
              {info ? (
                <>
                  <div className="kpi-value">{info.total}</div>
                  <Delta info={info} />
                  <div className="kpi-foot">
                    <span className={info.aged ? 'warn' : ''}>{info.aged} older than {data.aged_days} days</span>
                    <span className="muted"> · oldest {info.oldest}d</span>
                  </div>
                </>
              ) : (
                <div className="muted">Not uploaded for this date</div>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h3>By buyer</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Buyer</th>
                {datasetIds.map((d) => <th key={d} className="num">{DATASETS[d].short}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.buyers.map((b) => (
                <tr key={b.buyer}>
                  <td>{b.buyer}</td>
                  {datasetIds.map((d) => <td key={d} className="num">{b[d] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {datasetIds.map((d) => <td key={d} className="num">{data.datasets[d] ? totals[d] : '—'}</td>)}
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="panel">
          <h3>Workload by buyer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.buyers} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="buyer" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {datasetIds.map((d) => (
                <Bar key={d} dataKey={d} name={DATASETS[d].label} fill={SERIES_COLORS[d]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  )
}
