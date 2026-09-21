# Personal Dashboard · 내 대시보드

A personal dashboard with a React frontend and a small Node/Express backend. Everything runs hosted — nothing needs to be running on your own computer.

- **✉️ Inbox** — unified view across **as many Google accounts as you like**, with per-account tabs and unread counts
- **📅 Calendar** — every calendar from every linked Google account, plus iCloud, merged into one month view and agenda, colour-coded per account/calendar
- **💱 KRW / USD** — current rate, daily change, quick conversions, and a 30-day chart
- **📰 News briefing** — headlines in Korean and English with language filters
- **🔌 Connections** — a dedicated tab to link/rename/disconnect accounts and see the status of every integration

Dark theme, responsive 12-column grid, no UI/chart libraries — React, Vite, Express, and hand-rolled SVG charts. Every panel falls back to sample data when its integration isn't connected, so the app always renders something sensible.

## Linking Google accounts

Open the **Connections** tab and press **Sign in with Google**. Whichever account you pick in Google's chooser gets linked, and its Gmail inbox *and* all of its visible calendars start syncing. Press it again to add another account — up to 8, each with its own inbox tab, colour and (renameable) label.

One OAuth client covers every account, so the setup below is done once.

| Integration | How |
|---|---|
| Gmail (any number of accounts) | Create a Google OAuth client, set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` on the backend, then **Sign in with Google** once per account |
| Google Calendar | Comes with the same sign-in — syncs **all calendars you have visible** in Google Calendar, primary + secondary/shared |
| iCloud Calendar | Make calendars public in iCloud and list the share links in `ICLOUD_ICS_URLS` |
| iCloud Mail | Not wired up yet (needs an IMAP bridge with an app-specific password) |
| News | Built-in — Google News RSS (ko + en), no key; override via `NEWS_FEEDS_KO`/`NEWS_FEEDS_EN` |
| KRW/USD | Built-in — Naver Finance via the backend (`/api/exchange`), with [frankfurter.app](https://www.frankfurter.app/) (ECB) as fallback; no key |

OAuth tokens are stored only on the backend (its KV store or data volume) and never reach the browser. `.env.example` lists every setting.

### Google OAuth client (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: *Web application*) and enable the **Gmail API** and **Google Calendar API**.
2. Add the authorized redirect URI `<PUBLIC_URL>/api/auth/google/callback` — your deployed backend's URL, e.g. `https://your-dashboard.vercel.app/api/auth/google/callback`.
3. Set the client ID/secret in your host's environment variables and redeploy.

## Deploying from GitHub

The whole thing deploys from this repo and keeps running whether or not your computer is on. Pick one of the two setups below.

### A. GitHub Pages frontend + Vercel serverless API (free, recommended)

The backend runs as **Vercel serverless functions** — no server to manage, redeployed on every push. `vercel.json` + `api/index.js` hand every request to the same Express app. The frontend is published to GitHub Pages by `.github/workflows/deploy-pages.yml`.

1. **Import the repo on [Vercel](https://vercel.com/new)** → it picks up `vercel.json` and deploys `api/index.js`. You get a URL like `https://<project>.vercel.app`.
2. **Add a Redis KV for tokens** (serverless has no disk): create a **Vercel KV** / **Upstash Redis** (free) and set its REST env vars (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). Without it, linked accounts won't persist between requests.
3. **Set the other env vars** on the Vercel project: `PUBLIC_URL` = the Vercel URL, `ALLOWED_ORIGINS=https://<user>.github.io`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `DASHBOARD_PASSWORD` + `SESSION_SECRET`, and `ICLOUD_ICS_URLS` if used. Secrets stay server-side — never shipped to the browser.
4. **Publish the frontend:** push to `main`; the workflow builds and pushes to the `gh-pages` branch. One-time: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / (root)** → site at `https://<user>.github.io/dashboard/`.
5. **Point Pages at the API:** set the repository variable `API_BASE` to the Vercel URL (**Settings → Secrets and variables → Actions → Variables**) and re-run the workflow — or just paste the URL into the **Backend URL** field on the Connections tab.
6. **Register the OAuth redirect** `https://<project>.vercel.app/api/auth/google/callback` in the Google Cloud Console.

### B. One hosted container (single URL, no CORS)

The `Dockerfile` builds the frontend *and* serves it, so one container is the whole app at a single URL — no separate Pages site, no `API_BASE`, no cross-origin setup. `.github/workflows/deploy-backend.yml` builds the image for you:

1. **Push to `main`** → GitHub Actions publishes the image to GHCR as `ghcr.io/<owner>/<repo>:latest`. One-time: make the package public or grant your host pull access under **Settings → Packages**.
2. **Create a service on any container host** (Render/Railway/Fly/a VPS — all browser-driven) running that image, with env vars set in the host's dashboard:
   - `PUBLIC_URL` = the service's own public URL (used to build the OAuth redirect)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `ICLOUD_ICS_URLS` (optional) — public iCloud calendar links, comma-separated
   - `DASHBOARD_PASSWORD` — **set this**, since a public URL is otherwise wide open
   - a **persistent volume mounted at `/data`** (`DATA_DIR` already points there) so linked accounts survive restarts
   - `ALLOWED_ORIGINS` is **not** needed — the container serves its own frontend, so requests are same-origin
3. **Auto-redeploy on every push (optional):** add your host's deploy-hook URL as the repo secret `DEPLOY_HOOK_URL`; the workflow pings it after each push. Otherwise enable the host's "auto-deploy on new image" toggle.
4. **Register the OAuth redirect** `<PUBLIC_URL>/api/auth/google/callback` in the Google Cloud Console.
5. Open `PUBLIC_URL` and link accounts from the **Connections** tab.

> GHCR stores the image but doesn't run it — a container host is still required (GitHub doesn't host long-running app containers). Everything above is configured in web dashboards; no local commands.

> ⚠️ The dashboard has no auth of its own. Once real accounts are linked, **set `DASHBOARD_PASSWORD`** — it turns on a master-password login backed by a signed, HttpOnly session cookie that works even when the frontend and backend are on different origins. `/api/health` and the login endpoints stay open so the screen can load and hosts can health-check; the data API stays gated. Optionally set `SESSION_SECRET` (a long random value) to sign cookies independently of the password.

## Developing locally (optional)

Only needed to change the code — a deployed dashboard doesn't depend on it.

```bash
npm install
cp .env.example .env
npm run dev:server   # backend on http://localhost:8787
npm run dev          # frontend on http://localhost:5173 (proxies /api to 8787)
```

Add `http://localhost:5173/api/auth/google/callback` as a second authorized redirect URI to test Google sign-in. `npm run build && npm start` serves the built frontend from the backend at http://localhost:8787.

## Project structure

```
server/
  index.js                   # Express app — API + serves dist/ in production
  env.js                     # tiny .env loader (no dotenv dependency)
  store.js                   # record store: Redis KV, else DATA_DIR/tokens.json
  google.js                  # linked-account registry + OAuth + API fetch
  session.js                 # master-password login, signed session cookie
  ics.js                     # minimal ICS parser for iCloud calendar feeds
  routes/
    auth.js                  # login + /api/auth/google connect/disconnect/rename
    emails.js                # /api/emails — all linked inboxes, unified shape
    calendar.js              # /api/calendar — Google + ICS, next 14 days
    news.js                  # /api/news — Google News RSS, 5-min cache
    exchange.js              # /api/exchange — Naver Finance, frankfurter fallback
    integrations.js          # /api/integrations — cards for the Connections tab
api/index.js                 # Vercel serverless entry (wraps the Express app)
src/
  App.jsx                    # tab switching: Overview / Connections
  components/
    Header.jsx               # greeting + nav tabs + live clock (en/ko)
    EmailPanel.jsx
    CalendarPanel.jsx
    ExchangePanel.jsx
    NewsPanel.jsx
    ConnectionsPanel.jsx     # account cards: link, rename, disconnect
    LoginGate.jsx            # master-password screen
    Panel.jsx                # shared card chrome
    widgets/Sparkline.jsx    # dependency-free SVG line chart
  hooks/
    useApi.js                # fetch /api/* with sample-data fallback
    useClock.js / useTimezone.js
    useExchangeRate.js       # /api/exchange, frankfurter fallback in-browser
  lib/apiBase.js             # backend URL resolution (+ Connections override)
  data/mock.js               # sample data + the shapes panels expect
```
