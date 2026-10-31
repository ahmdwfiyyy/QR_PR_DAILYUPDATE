import { useMemo, useState } from 'react'
import { AGED_DAYS, api, DATASETS, formatDate, useLoad } from '../api'

const PR_COLUMNS = [
  { key: 'doc_no', label: 'PR No' },
  { key: 'doc_date', label: 'Created', render: (r) => formatDate(r.doc_date) },
  { key: 'description', label: 'Remarks', className: 'wrap' },
  { key: 'category', label: 'Category' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'requestor', label: 'Requestor' },
  { key: 'department', label: 'Dept' },
  { key: 'total_price', label: 'Total Price', className: 'num',
    render: (r) => r.total_price == null ? '' : `${r.currency ?? ''} ${r.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'vendor', label: 'Vendor Recommended', className: 'wrap' },
  { key: 'aging_days', label: 'Aging', className: 'num' },
]

const QR_COLUMNS = [
  { key: 'doc_no', label: 'QR No' },
  { key: 'doc_date', label: 'QR Date', render: (r) => formatDate(r.doc_date) },
  { key: 'expenditure_type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description', className: 'wrap' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'requestor', label: 'Requestor' },
  { key: 'approver', label: 'Current Approver', className: 'wrap small' },
  { key: 'vendor', label: 'Quoted Vendors', className: 'wrap small' },
  { key: 'last_operate', label: 'Last Operate' },
  { key: 'aging_days', label: 'Elapsed', className: 'num' },
]

function heat(count, max) {
  if (!count) return undefined
  const alpha = 0.12 + 0.6 * (count / max)
  return { background: `rgba(42, 120, 214, ${alpha.toFixed(2)})`, color: alpha > 0.5 ? '#fff' : undefined }
}

function AgingPivot({ summary, buyerFilter, onBuyer }) {
  const max = Math.max(1, ...summary.buyers.flatMap((b) => Object.values(b.counts)))
  const cols = summary.aging_columns
  return (
    <div className="scroll-x">
      <table className="table pivot">
        <thead>
          <tr>
            <th>Buyer \ {DATASETS[summary.dataset].agingLabel}</th>
            {cols.map((c) => <th key={c} className={`num ${c > AGED_DAYS ? 'aged' : ''}`}>{c}</th>)}
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {summary.buyers.map((b) => (
            <tr key={b.buyer} className={`clickable ${buyerFilter === b.buyer ? 'selected' : ''}`}
                onClick={() => onBuyer(buyerFilter === b.buyer ? '' : b.buyer)} title="Click to filter the list below">
              <td>{b.buyer}</td>
              {cols.map((c) => (
                <td key={c} className="num cell" style={heat(b.counts[c], max)}>{b.counts[c] ?? ''}</td>
              ))}
              <td className="num strong">{b.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Grand Total</td>
            {cols.map((c) => <td key={c} className="num">{summary.column_totals[c] ?? ''}</td>)}
            <td className="num">{summary.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function CategoryBreakdown({ summary }) {
  return (
    <div className="category-grid">
      {summary.categories.map((b) => (
        <div key={b.buyer} className="category-card">
          <div className="category-head"><b>{b.buyer}</b><span>{b.total}</span></div>
          {b.categories.map((c) => (
            <div key={c.category} className="category-row">
              <span>{c.category}</span>
              <span className="bar-wrap"><span className="bar" style={{ width: `${(100 * c.count) / b.total}%` }} /></span>
              <span className="num">{c.count}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ItemTable({ columns, rows, newFlag = true }) {
  return (
    <div className="scroll-x">
      <table className="table items">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.className?.includes('num') ? 'num' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.doc_no} className={(r.aging_days ?? 0) > AGED_DAYS ? 'row-aged' : ''}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render ? c.render(r) : r[c.key]}
                  {newFlag && c.key === 'doc_no' && r.is_new && <span className="badge">NEW</span>}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="muted center">No matching items</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default function DatasetView({ dataset, date }) {
  const summary = useLoad(() => api.summary(dataset, date), [dataset, date])
  const list = useLoad(() => api.items(dataset, date), [dataset, date])
  const [buyer, setBuyer] = useState('')
  const [search, setSearch] = useState('')
  const [onlyNew, setOnlyNew] = useState(false)
  const [onlyAged, setOnlyAged] = useState(false)

  const columns = dataset === 'PR' ? PR_COLUMNS : QR_COLUMNS
  const filtered = useMemo(() => {
    if (!list.data) return []
    const q = search.trim().toLowerCase()
    return list.data.items.filter((r) =>
      (!buyer || r.buyer === buyer) &&
      (!onlyNew || r.is_new) &&
      (!onlyAged || (r.aging_days ?? 0) > AGED_DAYS) &&
      (!q || columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))))
  }, [list.data, buyer, search, onlyNew, onlyAged, columns])

  const error = summary.error || list.error
  if (error) return <div className="alert error">{error}</div>
  if (!summary.data || !list.data) return <div className="loading">Loading…</div>

  const buyers = summary.data.buyers.map((b) => b.buyer)
  const { prev_date: prevDate, cleared } = list.data

  return (
    <div className="stack">
      <h2>{DATASETS[dataset].label} <span className="muted">· {formatDate(summary.data.date)} · {summary.data.total} items</span></h2>

      <section className="panel">
        <h3>Count by buyer × {DATASETS[dataset].agingLabel.toLowerCase()}</h3>
        <AgingPivot summary={summary.data} buyerFilter={buyer} onBuyer={setBuyer} />
        <p className="muted small">Columns above {AGED_DAYS} days are highlighted. Click a buyer row to filter the list.</p>
      </section>

      <section className="panel">
        <h3>Count by buyer and category</h3>
        <CategoryBreakdown summary={summary.data} />
      </section>

      <section className="panel">
        <div className="toolbar">
          <h3>Items ({filtered.length})</h3>
          <input type="search" placeholder="Search number, description, vendor…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={buyer} onChange={(e) => setBuyer(e.target.value)}>
            <option value="">All buyers</option>
            {buyers.map((b) => <option key={b}>{b}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={onlyAged} onChange={(e) => setOnlyAged(e.target.checked)} /> &gt; {AGED_DAYS} days</label>
          {prevDate && <label className="check"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> New since {formatDate(prevDate, { day: '2-digit', month: 'short' })}</label>}
        </div>
        <ItemTable columns={columns} rows={filtered} />
      </section>

      {prevDate && (
        <details className="panel">
          <summary><b>Cleared since {formatDate(prevDate)}</b> ({cleared.length}). These were open in the previous upload and are not in this one.</summary>
          <ItemTable columns={columns} rows={cleared} newFlag={false} />
        </details>
      )}
    </div>
  )
}
