import { useEffect, useState } from 'react'

// Browsers can't read real CPU/disk stats, so this simulates a live feed
// with a bounded random walk. Swap `tick` for a fetch to a local agent
// (e.g. a small Node/Go service exposing os stats) to make it real.
const INITIAL = {
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

export function useSystemStats() {
  const [stats, setStats] = useState(INITIAL)

  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => {
        const cpu = walk(s.cpu, 14, 4, 96)
        return {
          cpu,
          memory: walk(s.memory, 4, 35, 90),
          disk: s.disk,
          battery: Math.max(5, s.battery - (Math.random() < 0.05 ? 1 : 0)),
          netDown: walk(s.netDown, 18, 2, 480),
          netUp: walk(s.netUp, 6, 1, 90),
          history: [...s.history.slice(1), cpu],
        }
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return stats
}
