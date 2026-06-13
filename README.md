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
| Google Calendar | Comes with the Gmail sign-in (same token); syncs **all calendars you have visible** in Google Calendar — primary + secondary/shared — color-coded per calendar |
| iCloud Calendar | Make calendars public in iCloud and list the share links in `ICLOUD_ICS_URLS` |
| iCloud Mail | Not wired up yet (needs an IMAP bridge with an app-specific password) |
| News | Built-in — Google News RSS (ko + en), no key; override via `NEWS_FEEDS_KO`/`NEWS_FEEDS_EN` |
| KRW/USD | Built-in — **Naver Finance** via the backend (`/api/exchange`), with [frankfurter.app](https://www.frankfurter.app/) (ECB) as fallback; no key |
| System health | Built-in — real stats from the machine running the backend, plus internet connectivity + uptime |

Copy `.env.example` to `.env` for the full list of settings. OAuth tokens are stored only on the backend (`server/.data/`, gitignored) and never reach the browser.

### Google OAuth client (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: *Web application*) and enable the **Gmail API** and **Google Calendar API**.
2. Add the authorized redirect URI: `<your-origin>/api/auth/google/callback` (e.g. `http://localhost:5173/api/auth/google/callback` for dev, plus your production URL).
3. Put the client ID/secret in `.env` and restart the backend.

## Deploying from GitHub

GitHub Pages hosts the **frontend**; the **backend** runs wherever you want (Pages can't run servers). The Pages build is preconfigured to look for the backend at `http://localhost:8787` — i.e. on the computer you're viewing the dashboard from — so live Gmail/Calendar/news/system data works with the backend running locally.

1. Push to `main` → the workflow builds and publishes to the `gh-pages` branch. One-time: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / (root)** → site at `https://<user>.github.io/dashboard/`.
2. On your computer: `npm install && npm run build && npm start` (backend on :8787).
3. In `.env`, set `ALLOWED_ORIGINS` to your Pages origin (e.g. `https://<user>.github.io`) so the Pages site may fetch data cross-origin, and register `http://localhost:8787/api/auth/google/callback` as the Google OAuth redirect URI.
4. Open the Pages site — news and system stats are live immediately; connect Gmail/Calendar from the **Connections** tab. (Chrome/Edge/Firefox allow an https page to call `http://localhost`; Safari may block it.)

**Hosted backend instead:** deploy the included `Dockerfile` (Render/Railway/Fly can build straight from this repo and redeploy on every push), set `PUBLIC_URL` and `ALLOWED_ORIGINS` on it, and mount a volume at `/data` so OAuth tokens survive restarts. Then point the frontend at it: set the repository variable `API_BASE` (Settings → Secrets and variables → Actions → Variables) for Pages builds, or paste the URL into the **Backend URL** field on the Connections tab.

### Run everything in the cloud — no local terminal

The Docker image builds the frontend *and* serves it, so one hosted container is the whole app at a single URL (no separate Pages site, no CORS, no `localhost`). The **`Build & publish backend image`** workflow (`.github/workflows/deploy-backend.yml`) does the build for you:

1. **Push to `main`** → GitHub Actions builds the image and publishes it to GHCR as `ghcr.io/<owner>/<repo>:latest` (also tagged with the commit SHA). Nothing runs on your machine. One-time: make the package public or grant your host pull access under **Settings → Packages**.
2. **Create a service on any container host** (Render/Railway/Fly/a VPS — all browser-driven) that runs the published image. Set its env vars in the host's dashboard:
   - `PUBLIC_URL` = the service's own public URL (used to build the OAuth redirect)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Gmail + Calendar
   - `ICLOUD_ICS_URLS` (optional) — public iCloud calendar links, comma-separated
   - `DASHBOARD_PASSWORD` — **set this**, since a public URL is otherwise wide open; it turns on the master-password login (see the auth note below)
   - mount a **persistent volume at `/data`** (`DATA_DIR` already points there) so OAuth tokens survive restarts
   - `ALLOWED_ORIGINS` is **not** needed — the container serves its own frontend, so requests are same-origin
3. **Auto-redeploy on every push (optional):** copy your host's deploy-hook URL and add it as the repo secret `DEPLOY_HOOK_URL` (**Settings → Secrets and variables → Actions → Secrets**). The workflow pings it after each push so the host pulls the new image. Without it, enable the host's own "auto-deploy on new image" toggle instead.
4. In the Google Cloud Console, register `<PUBLIC_URL>/api/auth/google/callback` as the OAuth redirect URI.
5. Open `PUBLIC_URL` and connect accounts from the **Connections** tab. News and system stats are live immediately.

> GHCR stores the image but doesn't run it — a container host is still required (GitHub doesn't host long-running app containers). Everything above is configured in web dashboards; no local commands.

> ⚠️ The dashboard has no auth of its own. Once real email/calendar accounts are connected, don't expose it to the public internet unprotected — keep it on your LAN/VPN (e.g. Tailscale), or set **`DASHBOARD_PASSWORD`** to turn on the built-in **master-password login**. It shows a login screen, then keeps you in via a signed, HttpOnly session cookie that works even when the frontend (e.g. GitHub Pages) and backend are on different origins. `/api/health` and the login endpoints stay open so the screen can load and hosts can health-check; the static frontend loads but its data API stays gated. Optionally set `SESSION_SECRET` (a long random value) to sign cookies independently of the password. Unset `DASHBOARD_PASSWORD` and the login is disabled, so local/LAN use is unchanged.

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
