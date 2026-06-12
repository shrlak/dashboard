import { useCallback, useEffect, useState } from 'react'
import { fallbackFxSeries } from '../data/mock.js'

const API = 'https://api.frankfurter.app'

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * KRW per 1 USD, latest rate plus a 30-day history.
 * Uses the free, key-less frankfurter.app API; falls back to a generated
 * series (flagged with `isLive: false`) when the network is unavailable.
 */
export function useExchangeRate() {
  const [state, setState] = useState({
    loading: true,
    isLive: false,
    rate: null,
    series: [],
    updatedAt: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch(`${API}/${isoDaysAgo(30)}..?from=USD&to=KRW`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const series = Object.entries(data.rates)
        .map(([date, r]) => ({ date, rate: r.KRW }))
        .sort((a, b) => a.date.localeCompare(b.date))
      if (!series.length) throw new Error('empty series')
      setState({
        loading: false,
        isLive: true,
        rate: series[series.length - 1].rate,
        series,
        updatedAt: new Date(),
      })
    } catch {
      const series = fallbackFxSeries()
      setState({
        loading: false,
        isLive: false,
        rate: series[series.length - 1].rate,
        series,
        updatedAt: new Date(),
      })
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(id)
  }, [load])

  return { ...state, refresh: load }
}
