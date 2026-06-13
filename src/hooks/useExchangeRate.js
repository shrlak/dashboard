import { useCallback, useEffect, useState } from 'react'
import { fallbackFxSeries } from '../data/mock.js'
import { apiFetch } from '../lib/apiBase.js'

const FRANKFURTER = 'https://api.frankfurter.app'

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * KRW per 1 USD, latest rate plus a 30-day history.
 * Source order:
 *   1. the backend `/api/exchange` — Naver Finance (frankfurter fallback)
 *   2. frankfurter.app fetched directly in the browser (works with no backend)
 *   3. a generated sample series (flagged `isLive: false`)
 */
export function useExchangeRate() {
  const [state, setState] = useState({
    loading: true,
    isLive: false,
    source: null,
    rate: null,
    series: [],
    updatedAt: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))

    // 1. Backend (Naver, server-side — Naver can't be fetched from the browser).
    try {
      const res = await apiFetch('/api/exchange')
      if (res.ok) {
        const data = await res.json()
        const series = (data.series ?? []).map((p) => ({ date: p.date, rate: p.rate }))
        if (series.length) {
          setState({
            loading: false,
            isLive: true,
            source: data.source ?? 'Naver',
            rate: data.rate ?? series[series.length - 1].rate,
            series,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          })
          return
        }
      }
    } catch {
      // backend unreachable — fall through to the direct frankfurter call
    }

    // 2. frankfurter.app directly (keeps the panel live on a static deploy).
    try {
      const res = await fetch(`${FRANKFURTER}/${isoDaysAgo(30)}..?from=USD&to=KRW`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const series = Object.entries(data.rates)
        .map(([date, r]) => ({ date, rate: r.KRW }))
        .sort((a, b) => a.date.localeCompare(b.date))
      if (!series.length) throw new Error('empty series')
      setState({
        loading: false,
        isLive: true,
        source: 'frankfurter.app',
        rate: series[series.length - 1].rate,
        series,
        updatedAt: new Date(),
      })
      return
    } catch {
      // fall through to sample data
    }

    // 3. Sample series.
    const series = fallbackFxSeries()
    setState({
      loading: false,
      isLive: false,
      source: 'sample',
      rate: series[series.length - 1].rate,
      series,
      updatedAt: new Date(),
    })
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(id)
  }, [load])

  return { ...state, refresh: load }
}
