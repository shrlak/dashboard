import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api.js'

// Polls the local backend (GET /api/stats) for real OS metrics. When the
// backend is unreachable, falls back to a bounded random walk so the panel
// still demonstrates the design.
const INITIAL = {
  isLive: false,
  cpu: 23,
  memory: 58,
  disk: 71,
  battery: 86,
  netDown: 42, // Mbps
  netUp: 11,
  history: Array.from({ length: 40 }, (_, i) => 20 + Math.sin(i / 3) * 8),
}

function walk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step
  return Math.min(max, Math.max(min, next))
}

function simulateStep(s) {
  const cpu = walk(s.cpu, 14, 4, 96)
  return {
    isLive: false,
    cpu,
    memory: walk(s.memory, 4, 35, 90),
    disk: s.disk,
    battery: s.battery == null ? null : Math.max(5, s.battery - (Math.random() < 0.05 ? 1 : 0)),
    netDown: walk(s.netDown, 18, 2, 480),
    netUp: walk(s.netUp, 6, 1, 90),
    history: [...s.history.slice(1), cpu],
  }
}

export function useSystemStats() {
  const [stats, setStats] = useState(INITIAL)

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const d = await apiGet('/api/stats')
        if (!active) return
        setStats((s) => ({
          isLive: true,
          cpu: d.cpu,
          memory: d.memory,
          disk: d.disk,
          battery: d.battery,
          netDown: d.netDown,
          netUp: d.netUp,
          history: [...s.history.slice(1), d.cpu],
        }))
      } catch {
        if (active) setStats(simulateStep)
      }
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return stats
}
