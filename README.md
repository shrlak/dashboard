# Personal Dashboard · 내 대시보드

A personal dashboard with a React frontend and a small Node/Express backend:

- **✉️ Inbox** — unified view across multiple email accounts (personal Gmail, work Gmail, iCloud) with per-account tabs and unread counts
- **📅 Calendar** — Google Calendar + iCloud events merged into one month view and agenda, color-coded by source
- **💻 System health** — CPU, memory, disk, battery, and network throughput with a live CPU sparkline
- **💱 KRW / USD** — current exchange rate, daily change, quick conversions, and a 30-day chart
- **📰 News briefing** — headlines in Korean and English with language filters
- **🔌 Connections** — a dedicated tab to connect/disconnect accounts and see the status of every integration

Dark theme, responsive 12-column grid, no UI/chart libraries — React, Vite, Express, and hand-rolled SVG charts. Every panel falls back to sample data when its integration isn't connected, so the app always renders something sensible.

## Getting started

```bash
npm install
npm run dev:server   # backend on http://localhost:8787
npm run dev          # frontend on http://localhost:5173 (proxies /api to 8787)
```

Production build (backend serves the built frontend):

```bash
npm run build
npm start            # http://localhost:8787
```

## Connecting real data

Open the **Connections** tab in the dashboard — it shows the status of every integration and walks you through setup. In short:

| Integration | How |
|---|---|
| Gmail (personal + work) | Create a Google OAuth client, set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env`, then click **Connect** on each account card |
| Google Calendar | Comes with the Gmail sign-in (same Google token, calendar scope included) |
| iCloud Calendar | Make calendars public in iCloud and list the share links in `ICLOUD_ICS_URLS` |
| iCloud Mail | Not wired up yet (needs an IMAP bridge with an app-specific password) |
| News | Built-in — Google News RSS (ko + en), no key; override via `NEWS_FEEDS_KO`/`NEWS_FEEDS_EN` |
| KRW/USD | Built-in — [frankfurter.app](https://www.frankfurter.app/), fetched by the browser, no key |
| System health | Built-in — real stats from the machine running the backend |

Copy `.env.example` to `.env` for the full list of settings. OAuth tokens are stored only on the backend (`server/.data/`, gitignored) and never reach the browser.

### Google OAuth client (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: *Web application*) and enable the **Gmail API** and **Google Calendar API**.
2. Add the authorized redirect URI: `<your-origin>/api/auth/google/callback` (e.g. `http://localhost:5173/api/auth/google/callback` for dev, plus your production URL).
3. Put the client ID/secret in `.env` and restart the backend.

## Deploying from GitHub

- **GitHub Pages (frontend only)** — on every push to `main`, `.github/workflows/deploy-pages.yml` builds the frontend and pushes `dist/` to the `gh-pages` branch. One-time setup: repo **Settings → Pages → Source: Deploy from a branch → `gh-pages` / (root)**. Pages is static hosting, so panels show sample data there (the FX rate is still live — it's fetched by the browser).
- **Full stack (backend + frontend)** — the included `Dockerfile` builds one image that serves everything on port 8787. Hosts like Render, Railway, or Fly.io can deploy it straight from this GitHub repo and redeploy on every push. Set `PUBLIC_URL` to your public URL and mount a volume at `/data` so OAuth tokens survive restarts. Or on your own machine/home server: `npm run build && npm start`.

> ⚠️ The dashboard has no login of its own. Once real email/calendar accounts are connected, don't expose it to the public internet unprotected — keep it on your LAN/VPN (e.g. Tailscale) or put basic auth in front.

## Project structure

```
server/
  index.js                   # Express app — API + serves dist/ in production
  env.js                     # tiny .env loader (no dotenv dependency)
  store.js                   # OAuth token store (server/.data/tokens.json)
  google.js                  # Google OAuth flow + authenticated API fetch
  ics.js                     # minimal ICS parser for iCloud calendar feeds
  routes/
    auth.js                  # /api/auth/google, callback, disconnect
    emails.js                # /api/emails — Gmail inboxes, unified shape
    calendar.js              # /api/calendar — Google + ICS, next 14 days
    news.js                  # /api/news — Google News RSS, 5-min cache
    system.js                # /api/system — real CPU/mem/disk/net stats
    integrations.js          # /api/integrations — status for Connections tab
src/
  App.jsx                    # tab switching: Overview / Connections
  components/
    Header.jsx               # greeting + nav tabs + live clock (en/ko)
    EmailPanel.jsx
    CalendarPanel.jsx
    SystemHealthPanel.jsx
    ExchangePanel.jsx
    NewsPanel.jsx
    ConnectionsPanel.jsx     # integration cards, connect/disconnect
    Panel.jsx                # shared card chrome
    widgets/Sparkline.jsx    # dependency-free SVG line chart
  hooks/
    useApi.js                # fetch /api/* with sample-data fallback
    useClock.js
    useExchangeRate.js       # frankfurter.app fetch + fallback
    useSystemStats.js        # /api/system, simulated when backend is off
  data/mock.js               # sample data + the shapes panels expect
```
