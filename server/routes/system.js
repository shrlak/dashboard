import fs from 'node:fs'
import os from 'node:os'
import { Router } from 'express'

export const systemRouter = Router()

// CPU usage is measured between consecutive requests by diffing the
// cumulative per-core tick counters.
function cpuSnapshot() {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    for (const [kind, ms] of Object.entries(cpu.times)) {
      total += ms
      if (kind === 'idle') idle += ms
    }
  }
  return { idle, total }
}

let lastCpu = cpuSnapshot()
let lastCpuPct = null

function cpuUsage() {
  const cur = cpuSnapshot()
  const dTotal = cur.total - lastCpu.total
  const dIdle = cur.idle - lastCpu.idle
  if (dTotal > 0) {
    lastCpu = cur
    lastCpuPct = Math.min(100, Math.max(0, (1 - dIdle / dTotal) * 100))
  }
  return lastCpuPct
}

// /proc/meminfo's MemAvailable excludes reclaimable caches, which matches
// what activity monitors report; os.freemem() does not on Linux.
function memoryPct() {
  try {
    const info = fs.readFileSync('/proc/meminfo', 'utf8')
    const get = (key) => +(info.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))?.[1] ?? 0)
    const total = get('MemTotal')
    const avail = get('MemAvailable')
    if (total && avail) return (1 - avail / total) * 100
  } catch {}
  return (1 - os.freemem() / os.totalmem()) * 100
}

function diskPct() {
  try {
    const { blocks, bavail } = fs.statfsSync('/')
    return blocks ? (1 - bavail / blocks) * 100 : null
  } catch {
    return null
  }
}

function batteryPct() {
  try {
    const dir = fs
      .readdirSync('/sys/class/power_supply')
      .find((d) => d.startsWith('BAT'))
    if (!dir) return null
    return +fs.readFileSync(`/sys/class/power_supply/${dir}/capacity`, 'utf8').trim()
  } catch {
    return null
  }
}

function netSnapshot() {
  try {
    const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\n').slice(2)
    let rx = 0
    let tx = 0
    for (const line of lines) {
      const [iface, rest] = line.split(':')
      if (!rest || iface.trim() === 'lo') continue
      const fields = rest.trim().split(/\s+/)
      rx += +fields[0]
      tx += +fields[8]
    }
    return { rx, tx, at: Date.now() }
  } catch {
    return null
  }
}

let lastNet = netSnapshot()

function netRates() {
  const cur = netSnapshot()
  if (!cur || !lastNet) return { down: null, up: null }
  const seconds = (cur.at - lastNet.at) / 1000
  const rates =
    seconds > 0.5
      ? {
          down: ((cur.rx - lastNet.rx) * 8) / seconds / 1e6, // Mbps
          up: ((cur.tx - lastNet.tx) * 8) / seconds / 1e6,
        }
      : { down: null, up: null }
  if (seconds > 0.5) lastNet = cur
  return rates
}

systemRouter.get('/', (req, res) => {
  const { down, up } = netRates()
  res.json({
    source: 'live',
    host: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    cpu: cpuUsage(),
    memory: memoryPct(),
    disk: diskPct(),
    battery: batteryPct(),
    netDown: down,
    netUp: up,
  })
})
