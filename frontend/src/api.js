import { useEffect, useState } from 'react'

async function request(path, options) {
  const res = await fetch(path, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`)
  return body
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  const s = new URLSearchParams(clean).toString()
  return s ? `?${s}` : ''
}

export const api = {
  snapshots: () => request('/api/snapshots'),
  months: () => request('/api/months'),
  overview: (date) => request(`/api/overview${qs({ date })}`),
  summary: (dataset, date) => request(`/api/summary${qs({ dataset, date })}`),
  items: (dataset, date) => request(`/api/items${qs({ dataset, date })}`),
  trend: (dataset, month) => request(`/api/trend${qs({ dataset, month })}`),
  upload: (formData) => request('/api/upload', { method: 'POST', body: formData }),
  deleteSnapshot: (kind, date) => request(`/api/snapshots/${kind}/${date}`, { method: 'DELETE' }),
}

export const DATASETS = {
  PR: { label: 'PR Open', short: 'PR', kind: 'PR', agingLabel: 'Days Aging' },
  BU: { label: 'QR Buyer Update', short: 'Buyer Update', kind: 'QR', agingLabel: 'Elapsed Days' },
  BV: { label: 'QR Buyer Verify', short: 'Buyer Verify', kind: 'QR', agingLabel: 'Elapsed Days' },
}

// Items older than this many days are flagged (keep in sync with AGED_DAYS in backend/app/main.py)
export const AGED_DAYS = 3

export const BUYER_COLORS = ['#2a78d6', '#e07b39', '#2f9e6b', '#c2477e', '#7b61c9', '#b8902b', '#3aa0b0', '#8a8f98']

export function formatDate(iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', opts)
}

// Small data-loading hook used by every view
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error: error.message, loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
