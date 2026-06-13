import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/apiBase.js'

/**
 * Fetch JSON from the backend with a fallback (usually sample data from
 * src/data/mock.js) so the dashboard keeps working when no backend is
 * running — e.g. on a static GitHub Pages deploy.
 */
export function useApi(path, { fallback = null, refreshMs = 0 } = {}) {
  const [state, setState] = useState({ loading: true, live: false, data: fallback, error: null })

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(path)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState({ loading: false, live: true, data, error: null })
    } catch (e) {
      setState((s) => ({ loading: false, live: false, data: s.data ?? fallback, error: e.message }))
    }
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    if (!refreshMs) return undefined
    const id = setInterval(load, refreshMs)
    return () => clearInterval(id)
  }, [load, refreshMs])

  return { ...state, refresh: load }
}
