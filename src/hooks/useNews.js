import { usePolledApi } from '../lib/api.js'
import { NEWS } from '../data/mock.js'

const FALLBACK = { items: NEWS }

export function useNews() {
  const { isLive, data } = usePolledApi('/api/news', 5 * 60_000, FALLBACK)
  return { isLive, items: data.items }
}
