import { Router } from 'express'
import { NEWS } from '../../src/data/mock.js'
import { decodeEntities, relativeTime } from '../util.js'

export const newsRouter = Router()

// Google News RSS needs no API key. Override per language with a
// comma-separated list of RSS URLs in NEWS_FEEDS_KO / NEWS_FEEDS_EN.
const DEFAULT_FEEDS = {
  ko: ['https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'],
  en: ['https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'],
}

const PER_FEED = 6
const CACHE_MS = 5 * 60 * 1000
let cache = { at: 0, payload: null }

function feedsFor(lang) {
  const env = process.env[`NEWS_FEEDS_${lang.toUpperCase()}`]
  if (!env) return DEFAULT_FEEDS[lang]
  return env.split(',').map((s) => s.trim()).filter(Boolean)
}

function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))
  return m ? decodeEntities(m[1].trim()) : ''
}

function parseRss(xml, lang) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, block]) => {
    const source = tagText(block, 'source')
    let headline = tagText(block, 'title')
    // Google News appends " - Source" to titles; drop it when we already
    // have the source element.
    if (source && headline.endsWith(` - ${source}`)) {
      headline = headline.slice(0, -` - ${source}`.length)
    }
    const date = new Date(tagText(block, 'pubDate'))
    return { lang, source, headline, date: Number.isNaN(date.getTime()) ? new Date() : date }
  })
}

async function fetchAll() {
  const jobs = ['ko', 'en'].flatMap((lang) =>
    feedsFor(lang).map(async (url) => {
      const res = await fetch(url, { headers: { 'user-agent': 'personal-dashboard' } })
      if (!res.ok) throw new Error(`RSS ${res.status} for ${url}`)
      return parseRss(await res.text(), lang).slice(0, PER_FEED)
    })
  )
  const results = await Promise.allSettled(jobs)
  const items = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => b.date - a.date)
    .slice(0, 12)
    .map((n, i) => ({
      id: i + 1,
      lang: n.lang,
      source: n.source || (n.lang === 'ko' ? '뉴스' : 'News'),
      time: relativeTime(n.date, n.lang),
      category: null,
      headline: n.headline,
    }))
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason))
  return { items, errors }
}

newsRouter.get('/', async (req, res) => {
  if (cache.payload && Date.now() - cache.at < CACHE_MS) {
    return res.json(cache.payload)
  }
  const { items, errors } = await fetchAll()
  if (errors.length) console.error('News fetch errors:', errors)
  const payload = items.length
    ? { source: 'live', items, errors }
    : { source: 'sample', items: NEWS, errors }
  if (items.length) cache = { at: Date.now(), payload }
  res.json(payload)
})
