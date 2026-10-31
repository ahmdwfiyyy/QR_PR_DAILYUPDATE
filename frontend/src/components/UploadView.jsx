import { useState } from 'react'
import { api, formatDate } from '../api'

// "(261026)" in the filename -> 2026-10-26, same rule as the backend
function dateFromFilename(name) {
  const m = name?.match(/\((\d{2})(\d{2})(\d{2})\)/)
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : null
}

function FileDrop({ label, hint, file, onFile }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className={`drop ${over ? 'over' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0] ?? null) }}
    >
      <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => onFile(e.target.files[0] ?? null)} />
      <b>{label}</b>
      {file ? (
        <span>
          {file.name}
          <br />
          <span className="muted small">
            {dateFromFilename(file.name) ? `Date: ${formatDate(dateFromFilename(file.name))}` : 'No date found in the filename. Set it below.'}
          </span>
        </span>
      ) : (
        <span className="muted">{hint}</span>
      )}
    </label>
  )
}

export default function UploadView({ snapshots, onChange }) {
  const [prFile, setPrFile] = useState(null)
  const [qrFile, setQrFile] = useState(null)
  const [overrideDate, setOverrideDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const existingDates = new Set(snapshots.map((s) => s.date))
  const targetDates = [prFile, qrFile].filter(Boolean).map((f) => overrideDate || dateFromFilename(f.name)).filter(Boolean)
  const willReplace = targetDates.some((d) => existingDates.has(d))

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    if (prFile) form.append('pr_file', prFile)
    if (qrFile) form.append('qr_file', qrFile)
    if (overrideDate) form.append('snapshot_date', overrideDate)
    setBusy(true)
    setMessage(null)
    try {
      const { results } = await api.upload(form)
      setMessage({
        type: 'ok',
        lines: results.map((r) =>
          `${r.kind} ${formatDate(r.date)}: ${Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ')}${r.replaced ? ' (replaced the earlier upload)' : ''}`),
      })
      setPrFile(null)
      setQrFile(null)
      setOverrideDate('')
      e.target.reset()
      onChange(true)
    } catch (err) {
      setMessage({ type: 'error', lines: [err.message] })
    } finally {
      setBusy(false)
    }
  }

  async function remove(kind, date) {
    if (!window.confirm(`Delete the ${kind} upload for ${formatDate(date)}?`)) return
    try {
      await api.deleteSnapshot(kind, date)
      onChange()
    } catch (err) {
      setMessage({ type: 'error', lines: [err.message] })
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Upload today&apos;s files</h2>
        <form onSubmit={submit} className="stack">
          <div className="grid-2">
            <FileDrop label="PR file" hint="ERP PR List by Buyer (DDMMYY).xlsx" file={prFile} onFile={setPrFile} />
            <FileDrop label="QR file" hint="ERP QR List by Buyer (DDMMYY).xlsx" file={qrFile} onFile={setQrFile} />
          </div>
          <div className="toolbar">
            <label className="field">
              <span>Date (optional, overrides the filename)</span>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
            </label>
            <button type="submit" className="primary" disabled={busy || (!prFile && !qrFile)}>
              {busy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          {willReplace && <div className="alert warn">Data already exists for this date. Uploading will replace it.</div>}
          {message && (
            <div className={`alert ${message.type === 'ok' ? 'ok' : 'error'}`}>
              {message.lines.map((l) => <div key={l}>{l}</div>)}
            </div>
          )}
        </form>
      </section>

      <section className="panel">
        <h3>Upload history ({snapshots.length} days)</h3>
        <table className="table">
          <thead>
            <tr><th>Date</th><th>PR</th><th>QR Buyer Update</th><th>QR Buyer Verify</th><th /></tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.date}>
                <td>{formatDate(s.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>{s.PR ? s.PR.counts.PR ?? 0 : <span className="muted">missing</span>}</td>
                <td>{s.QR ? s.QR.counts.BU ?? 0 : <span className="muted">missing</span>}</td>
                <td>{s.QR ? s.QR.counts.BV ?? 0 : <span className="muted">missing</span>}</td>
                <td className="actions">
                  {s.PR && <button className="link danger" onClick={() => remove('PR', s.date)}>Delete PR</button>}
                  {s.QR && <button className="link danger" onClick={() => remove('QR', s.date)}>Delete QR</button>}
                </td>
              </tr>
            ))}
            {snapshots.length === 0 && <tr><td colSpan={5} className="muted center">Nothing uploaded yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}
