import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/apiBase.js'

// Prefers real stats from the backend (`GET /api/system`); when no backend
// is reachable it falls back to the original in-browser simulation so the
// panel still demos nicely on a static deploy.
const SIM = {
  cpu: 23,
  memory: 58,
  disk: 71,
  battery: 86,
  netDown: 42, // Mbps
  netUp: 11,
}

const browserOnline = () => (typeof navigator === 'undefined' ? null : navigator.onLine)

const INITIAL = {
  ...SIM,
  live: false,
  host: null,
  uptime: null,
  online: browserOnline(),
  latencyMs: null,
  history: Array.from({ length: 40 }, (_, i) => 20 + Math.sin(i / 3) * 8),
}

function walk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step
  return Math.min(max, Math.max(min, next))
}

function simulateStep(s) {
  const cpu = walk(s.cpu ?? SIM.cpu, 14, 4, 96)
  return {
    live: false,
    host: null,
    uptime: null,
    online: browserOnline(),
    latencyMs: null,
    cpu,
    memory: walk(s.memory ?? SIM.memory, 4, 35, 90),
    disk: s.disk ?? SIM.disk,
    battery: Math.max(5, (s.battery ?? SIM.battery) - (Math.random() < 0.05 ? 1 : 0)),
    netDown: walk(s.netDown ?? SIM.netDown, 18, 2, 480),
    netUp: walk(s.netUp ?? SIM.netUp, 6, 1, 90),
    history: [...s.history.slice(1), cpu],
  }
}

export function useSystemStats() {
  const [stats, setStats] = useState(INITIAL)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const res = await apiFetch('/api/system')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        if (cancelled) return
        setStats((s) => ({
          live: true,
          host: d.host,
          uptime: d.uptime ?? null,
          online: d.online ?? null,
          latencyMs: d.latencyMs ?? null,
          cpu: d.cpu,
          memory: d.memory,
          disk: d.disk,
          battery: d.battery,
          netDown: d.netDown,
          netUp: d.netUp,
          history: [...s.history.slice(1), d.cpu ?? s.cpu ?? 0],
        }))
      } catch {
        if (cancelled) return
        setStats((s) => simulateStep(s))
      }
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return stats
}
