// In dev, Vite proxies /api and /auth to the local backend (vite.config.js).
// On GitHub Pages, VITE_API_BASE points at the backend running on your
// machine (default http://localhost:8787).
export const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Polls an endpoint and falls back to `fallback` while the backend is
// unreachable or the integration isn't configured yet.
import { useEffect, useState } from 'react'

export function usePolledApi(path, intervalMs, fallback) {
  const [state, setState] = useState({ isLive: false, data: fallback })

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const data = await apiGet(path)
        if (!active) return
        setState(data.configured ? { isLive: true, data } : { isLive: false, data: fallback })
      } catch {
        if (active) setState({ isLive: false, data: fallback })
      }
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [path, intervalMs])

  return state
}
