import { useEffect, useState } from 'react'
import { api, formatDate } from './api'
import Dashboard from './components/Dashboard'
import DatasetView from './components/DatasetView'
import TrendView from './components/TrendView'
import UploadView from './components/UploadView'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'PR', label: 'PR' },
  { id: 'BU', label: 'QR Buyer Update' },
  { id: 'BV', label: 'QR Buyer Verify' },
  { id: 'trend', label: 'Monthly Trend' },
  { id: 'upload', label: 'Upload' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [snapshots, setSnapshots] = useState([])
  const [date, setDate] = useState(null)
  const [error, setError] = useState(null)

  const refreshSnapshots = (selectLatest = false) =>
    api.snapshots()
      .then((list) => {
        setSnapshots(list)
        setError(null)
        setDate((current) => (selectLatest || !list.some((s) => s.date === current) ? list[0]?.date ?? null : current))
        if (list.length === 0) setTab('upload')
      })
      .catch((e) => setError(`Cannot reach the backend: ${e.message}`))

  useEffect(() => { refreshSnapshots() }, [])

  const showDatePicker = !['trend', 'upload'].includes(tab) && snapshots.length > 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">QR&amp;PR</span>
          <div>
            <h1>Daily Update QR &amp; PR</h1>
            <p className="muted">Open PRs and pending QRs by buyer</p>
          </div>
        </div>
        {showDatePicker && (
          <label className="date-picker">
            <span>Snapshot</span>
            <select value={date ?? ''} onChange={(e) => setDate(e.target.value)}>
              {snapshots.map((s) => (
                <option key={s.date} value={s.date}>
                  {formatDate(s.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  {!s.PR ? ' (QR only)' : !s.QR ? ' (PR only)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {error && <div className="alert error">{error}</div>}
        {tab === 'upload' && <UploadView snapshots={snapshots} onChange={refreshSnapshots} />}
        {tab !== 'upload' && snapshots.length === 0 && !error && (
          <div className="empty">No data yet. Go to <b>Upload</b> and add today&apos;s PR and QR files.</div>
        )}
        {snapshots.length > 0 && (
          <>
            {tab === 'dashboard' && <Dashboard date={date} onOpen={setTab} />}
            {['PR', 'BU', 'BV'].includes(tab) && <DatasetView key={tab} dataset={tab} date={date} />}
            {tab === 'trend' && <TrendView />}
          </>
        )}
      </main>
    </div>
  )
}
