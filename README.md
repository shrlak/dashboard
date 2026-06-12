# Personal Dashboard · 내 대시보드

A single-page React dashboard that brings together:

- **✉️ Inbox** — unified view across multiple email accounts (personal Gmail, work Gmail, iCloud) with per-account tabs and unread counts
- **📅 Calendar** — Google Calendar + iCloud events merged into one month view and agenda, color-coded by source
- **💻 System health** — CPU, memory, disk, battery, and network throughput with a live CPU sparkline
- **💱 KRW / USD** — current exchange rate, daily change, quick conversions, and a 30-day chart
- **📰 News briefing** — headlines in Korean and English with language filters

Dark theme, responsive 12-column grid, no UI/chart libraries — just React, Vite, and hand-rolled SVG charts.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What's live vs. sample data

| Panel | Data source |
|---|---|
| KRW/USD rate | **Live** — [frankfurter.app](https://www.frankfurter.app/) (free, no API key; ECB reference rates), auto-refreshes every 10 min, falls back to sample data offline |
| Clock / greeting | Live |
| System health | Simulated in-browser (browsers can't read OS stats) |
| Email, Calendar, News | Sample data in `src/data/mock.js` |

## Wiring up real integrations

Each panel reads a simple data shape, so you only need to replace the source:

- **Email** — swap `EMAILS` in `src/data/mock.js` for the [Gmail API](https://developers.google.com/gmail/api) (OAuth per account) and iCloud via an app-specific password + IMAP bridge. A small backend is required to keep tokens off the client.
- **Calendar** — Google Calendar API for Google events; iCloud exposes CalDAV (or subscribe to the public ICS link of each calendar and parse it server-side).
- **System health** — run a tiny local agent (Node: `systeminformation` package, ~20 lines) that serves `GET /stats` as JSON, then fetch it in `src/hooks/useSystemStats.js`.
- **News** — Naver News Open API for Korean headlines, NewsAPI/RSS for English; replace `NEWS` in `src/data/mock.js`.

## Project structure

```
src/
  App.jsx                    # layout grid
  components/
    Header.jsx               # greeting + live clock (en/ko)
    EmailPanel.jsx
    CalendarPanel.jsx
    SystemHealthPanel.jsx
    ExchangePanel.jsx
    NewsPanel.jsx
    Panel.jsx                # shared card chrome
    widgets/Sparkline.jsx    # dependency-free SVG line chart
  hooks/
    useClock.js
    useExchangeRate.js       # frankfurter.app fetch + fallback
    useSystemStats.js        # simulated random-walk stats
  data/mock.js               # sample emails, events, headlines
```
