import { Router } from 'express'
import si from 'systeminformation'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [load, mem, fsSize, battery, nets] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.battery(),
      si.networkStats(),
    ])
    const rootFs = fsSize.find((f) => f.mount === '/') ?? fsSize[0]
    const net = nets[0]
    res.json({
      live: true,
      cpu: load.currentLoad,
      memory: ((mem.total - mem.available) / mem.total) * 100,
      disk: rootFs ? rootFs.use : 0,
      battery: battery.hasBattery ? battery.percent : null,
      // rx_sec/tx_sec are bytes per second; convert to Mbps.
      netDown: Math.max(0, (net?.rx_sec ?? 0) * 8) / 1e6,
      netUp: Math.max(0, (net?.tx_sec ?? 0) * 8) / 1e6,
    })
  } catch (e) {
    res.status(500).json({ live: false, error: e.message })
  }
})

export default router
