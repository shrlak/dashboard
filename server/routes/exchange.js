import { Router } from 'express'

export const exchangeRouter = Router()

// KRW per 1 USD with ~30 days of history. Primary source is Naver Finance
// (the rate Koreans actually see); frankfurter.app (ECB) is the fallback.
// Naver's endpoints send no CORS headers, so this has to be a server proxy —
// the browser can't fetch them directly.

const CACHE_MS = 10 * 60 * 1000
let cache = { at: 0, payload: null }

// Naver mobile finance: recent daily closes for USD/KRW.
const NAVER_PRICES =
  'https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&page=1&pageSize=31'

function toNumber(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

async function fromNaver() {
  const res = await fetch(NAVER_PRICES, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      accept: 'application/json',
      referer: 'https://m.stock.naver.com/',
    },
  })
  if (!res.ok) throw new Error(`Naver ${res.status}`)
  const data = await res.json()
  // Be lenient about the exact field names — Naver has changed them before.
  const rows = data.result ?? data.datas ?? data.list ?? (Array.isArray(data) ? data : [])
  const series = rows
    .map((r) => ({
      date: String(r.localTradedAt ?? r.tradeDate ?? r.date ?? '').slice(0, 10),
      rate: toNumber(r.closePrice ?? r.close ?? r.price ?? r.value),
    }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.rate != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!series.length) throw new Error('Naver: empty series')
  return { source: 'Naver 금융', rate: series[series.length - 1].rate, series }
}

async function fromFrankfurter() {
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const res = await fetch(
    `https://api.frankfurter.app/${start.toISOString().slice(0, 10)}..?from=USD&to=KRW`
  )
  if (!res.ok) throw new Error(`frankfurter ${res.status}`)
  const data = await res.json()
  const series = Object.entries(data.rates ?? {})
    .map(([date, r]) => ({ date, rate: r.KRW }))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!series.length) throw new Error('frankfurter: empty series')
  return { source: 'frankfurter.app', rate: series[series.length - 1].rate, series }
}

exchangeRouter.get('/', async (req, res) => {
  if (cache.payload && Date.now() - cache.at < CACHE_MS) return res.json(cache.payload)

  const errors = []
  for (const source of [fromNaver, fromFrankfurter]) {
    try {
      const out = await source()
      const payload = { ...out, updatedAt: new Date().toISOString() }
      cache = { at: Date.now(), payload }
      return res.json(payload)
    } catch (e) {
      errors.push(String(e.message ?? e))
    }
  }
  console.error('Exchange fetch errors:', errors)
  res.status(502).json({ error: 'exchange unavailable', errors })
})
