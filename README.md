# Personal Dashboard · 내 대시보드

A personal dashboard with a React frontend on **GitHub Pages** and an API backend on **Cloudflare Workers** — both deploy straight from this repo on every push, and nothing has to run on your own computer.

- **✉️ Inbox** — unified view across **as many Google accounts as you like**, with per-account tabs and unread counts
- **📅 Calendar** — every calendar from every linked Google account, plus iCloud, merged into one month view and agenda, colour-coded per account/calendar
- **💱 KRW / USD** — current rate, daily change, quick conversions, and a 30-day chart
- **📰 News briefing** — headlines in Korean and English with language filters
- **🔌 Connections** — a dedicated tab to link/rename/disconnect accounts and see the status of every integration

Dark theme, responsive 12-column grid, no UI/chart libraries — React, Vite, Hono, and hand-rolled SVG charts. Every panel falls back to sample data when its integration isn't connected, so the app always renders something sensible.

## Architecture

```
Browser ──> GitHub Pages (static frontend, dist/)
   │
   └──> Cloudflare Worker (worker/index.js) ── everything the backend does:
          ├── /api/auth/google   OAuth flow; tokens in Workers KV
          ├── /api/emails        Gmail REST, all linked accounts merged
          ├── /api/calendar      Google Calendar REST + iCloud ICS feeds
          ├── /api/news          Google News RSS (ko + en)
          ├── /api/exchange      Naver Finance, frankfurter.app fallback
          └── /api/integrations  status for the Connections tab
```

The Worker is the whole backend — no separate database, no container, no server to keep running. Linked-account tokens live in a Workers KV namespace, which is Cloudflare's key-value store.

## One-time setup

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and the `wrangler` CLI (already a dev dependency — `npx wrangler login` after `npm install`).

### 1. Create the KV namespace

```bash
npm install
npx wrangler login
npx wrangler kv namespace create TOKENS
```

This prints an `id`. Paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TOKENS"
id = "paste-the-id-here"
```

### 2. Set the Worker's secrets

```bash
npx wrangler secret put DASHBOARD_PASSWORD   # required once real accounts are linked — see note below
npx wrangler secret put GOOGLE_CLIENT_ID     # after step 4
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Non-secret settings (allowed frontend origins, iCloud feeds, news overrides) go in `wrangler.toml` under `[vars]` instead — edit them directly, no command needed.

### 3. Deploy the Worker

```bash
npx wrangler deploy
```

This prints the Worker's URL, e.g. `https://personal-dashboard-api.<you>.workers.dev`. You'll need it for the next two steps.

### 4. Create the Google OAuth client

- [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID** → type **Web application**.
- Enable the **Gmail API** and **Google Calendar API** first if you haven't (APIs & Services → Library).
- Authorized redirect URI: `<your Worker URL>/api/auth/google/callback`.
- Copy the client ID/secret into the two `wrangler secret put` commands from step 2, then `npx wrangler deploy` again.

### 5. Point GitHub Pages at the Worker

- Repo **Settings → Pages → Source → "Deploy from a branch" → Branch: `gh-pages` / `(root)`**
  (one-time). The workflow publishes the built frontend to the `gh-pages` branch, so the
  "GitHub Actions" source setting is *not* the right one here.
- Repo **Settings → Secrets and variables → Actions → Variables → New repository variable**: `API_BASE` = your Worker's URL.
- Push to `main` (or re-run the "Publish to gh-pages" workflow) — the frontend is now live at `https://<user>.github.io/<repo>/` and calling your Worker for live data.

### 6. Keep the Worker deploying automatically

- Repo **Settings → Secrets and variables → Actions → Secrets**, add:
  - `CLOUDFLARE_API_TOKEN` — create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) using the **"Edit Cloudflare Workers"** template.
  - `CLOUDFLARE_ACCOUNT_ID` — shown on the right sidebar of any page in the Cloudflare dashboard.
- Every push to `main` that touches `worker/` now redeploys automatically via `.github/workflows/deploy-worker.yml`.

### 7. Link your accounts

Open the dashboard's **Connections** tab, click **Sign in with Google**, and pick an account. Repeat for each additional Gmail account (up to 8) — each becomes its own inbox tab with its calendars synced.

## Configuration reference

| Setting | Where | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `wrangler secret put` | Enables Gmail + Calendar. One client covers every linked account. |
| `DASHBOARD_PASSWORD` | `wrangler secret put` | Turns on the login screen. **Set this** — a public Worker URL with real accounts linked is otherwise readable by anyone who finds it. |
| `SESSION_SECRET` | `wrangler secret put` (optional) | Signs session cookies independently of the password, so changing it isn't the only way to invalidate sessions. |
| `ALLOWED_ORIGINS` | `wrangler.toml` `[vars]` | Your Pages origin, e.g. `https://shrlak.github.io` — required for the cross-origin login cookie and OAuth return redirect. |
| `ICLOUD_ICS_URLS` | `wrangler.toml` `[vars]` | Comma-separated `webcal://` share links for iCloud calendars. |
| `NEWS_FEEDS_KO` / `NEWS_FEEDS_EN` | `wrangler.toml` `[vars]` | Override the default Google News RSS feeds. |
| `PUBLIC_URL` | `wrangler.toml` `[vars]` (optional) | Only needed behind a custom domain that hides the Worker's real URL from it; otherwise the Worker derives its own origin from each request. |

## Developing locally

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in what you need; gitignored
npm run worker:dev               # Worker on http://localhost:8787
npm run dev                      # frontend on http://localhost:5173 (proxies /api to 8787)
```

`wrangler dev` emulates Workers KV locally — no Cloudflare account needed just to develop. Add `http://localhost:8787/api/auth/google/callback` as a second authorized redirect URI to test Google sign-in locally.

## Project structure

```
worker/
  index.js                   # Hono app — CORS, session gate, route mounting
  lib/
    crypto.js                # Web Crypto helpers (HMAC signing, hashing, base64url)
    kv.js                    # tiny get/set/delete over the TOKENS KV binding
    google.js                # linked-account registry + OAuth + Gmail/Calendar fetch
    session.js                # master-password login, signed session cookie
    ics.js                   # minimal ICS parser for iCloud calendar feeds
    util.js                  # formatting helpers shared by routes
  routes/
    auth.js                  # login + /api/auth/google connect/disconnect/rename
    emails.js                # /api/emails — all linked inboxes, unified shape
    calendar.js               # /api/calendar — Google + ICS, next 14 days
    news.js                   # /api/news — Google News RSS, 5-min cache
    exchange.js               # /api/exchange — Naver Finance, frankfurter fallback
    integrations.js          # /api/integrations — cards for the Connections tab
wrangler.toml                 # Worker config: KV binding + non-secret vars
.dev.vars.example             # template for local secrets (copy to .dev.vars)
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
.github/workflows/
  deploy-pages.yml           # builds the frontend, publishes to gh-pages
  deploy-worker.yml           # deploys worker/ to Cloudflare on every push
```
