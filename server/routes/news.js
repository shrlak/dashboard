import { Router } from 'express'
import Parser from 'rss-parser'
import { cached } from '../lib/cache.js'

const router = Router()
const parser = new Parser({ timeout: 8000 })
const PER_FEED = 4
const MAX_ITEMS = 16

function timeAgo(date, lang) {
  const mins = Math.max(0, Math.round((Date.now() - date) / 60000))
  if (lang === 'ko') {
    if (mins < 1) return '방금 전'
    if (mins < 60) return `${mins}분 전`
    if (mins < 24 * 60) return `${Math.round(mins / 60)}시간 전`
    return `${Math.round(mins / 1440)}일 전`
  }
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

async function fetchFeed(feed) {
  const parsed = await parser.parseURL(feed.url)
  return (parsed.items ?? []).slice(0, PER_FEED).map((item, i) => {
    const ts = item.isoDate ? new Date(item.isoDate).getTime() : Date.now()
    return {
      id: `${feed.source}-${i}-${ts}`,
      lang: feed.lang,
      source: feed.source,
      category: feed.category,
      headline: (item.title ?? '').trim(),
      url: item.link ?? '',
      ts,
      time: timeAgo(ts, feed.lang),
    }
  })
}

router.get('/', async (req, res) => {
  const { newsFeeds } = req.app.locals.config
  if (!newsFeeds.length) return res.json({ configured: false, items: [] })

  try {
    const items = await cached('news', 5 * 60_000, async () => {
      const settled = await Promise.allSettled(newsFeeds.map(fetchFeed))
      for (const s of settled) {
        if (s.status === 'rejected') console.warn('[news]', s.reason?.message ?? s.reason)
      }
      return settled
        .flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
        .filter((n) => n.headline)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, MAX_ITEMS)
    })
    // If every feed failed (e.g. offline) let the frontend fall back to samples.
    res.json({ configured: items.length > 0, items })
  } catch (e) {
    res.status(500).json({ configured: false, error: e.message, items: [] })
  }
})

export default router
