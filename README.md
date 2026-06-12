# Personal Dashboard · 내 대시보드

A personal dashboard that brings together:

- **✉️ Inbox** — unified view across multiple email accounts (Gmail via OAuth, iCloud via IMAP) with per-account tabs and unread counts
- **📅 Calendar** — Google Calendar + iCloud events merged into one month view and agenda, color-coded by source
- **💻 System health** — real CPU, memory, disk, battery, and network throughput from your machine
- **💱 KRW / USD** — current exchange rate, daily change, quick conversions, and a 30-day chart
- **📰 News briefing** — live RSS headlines in Korean and English with language filters

**Architecture:** a React + Vite frontend (deployable to GitHub Pages) and a small
Express backend (`server/`) that runs on **your computer**. The backend has to be
local: it reads your machine's health stats, and it keeps your email tokens and
passwords off GitHub. Every panel falls back to sample data when the backend is
offline, so the UI always renders.

```
Browser ──> GitHub Pages (static frontend)
   │
   └──> http://localhost:8787 (backend on your machine)
          ├── /api/stats     systeminformation (CPU, RAM, disk, battery, net)
          ├── /api/emails    Gmail REST (OAuth) + iCloud IMAP
          ├── /api/calendar  Google Calendar REST + iCloud ICS subscriptions
          ├── /api/news      RSS (연합뉴스, 매일경제, BBC, Guardian, NYT…)
          └── /auth/google   OAuth flow, tokens stored in server/.data/
```

## Quick start

```bash
npm install
npm run server   # backend on http://localhost:8787
npm run dev      # frontend on http://localhost:5173 (proxies /api to backend)
```

With just that, **system health and news are already live** (no keys needed).
Email and calendar need the one-time setup below.

`npm start` builds the frontend and serves everything from the backend as a
single process at http://localhost:8787.

## Connecting your accounts

Copy the config template first:

```bash
cp server/config.example.json server/config.json   # gitignored
```

### Gmail + Google Calendar (per Google account)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project,
   enable the **Gmail API** and **Google Calendar API**.
2. Create an **OAuth client ID** (type: Web application) with redirect URI
   `http://localhost:8787/auth/google/callback`, and put the client ID/secret
   into `server/config.json` under `google`.
3. List each account under `googleAccounts` (the two sample entries show the shape).
4. Start the backend and visit `http://localhost:8787/auth/google/gmail-personal`
   (and `/auth/google/gmail-work`, …) to authorize each account. Tokens are
   saved to `server/.data/` (gitignored) and refreshed automatically.

### iCloud Mail

1. At [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security →
   App-Specific Passwords, generate one.
2. Fill in `icloud.address` and `icloud.appPassword` in `server/config.json`.

### iCloud Calendar

In the Calendar app (or iCloud.com), share each calendar you want
(**public link** is simplest) and paste the `webcal://…` URLs into
`icloudCalendarUrls` in `server/config.json`.

### News feeds

Live out of the box. Edit `newsFeeds` in `server/config.json` to change
sources — any RSS feed works; each entry sets its language (`ko`/`en`),
display name, and category. Defaults are in `server/lib/config.js`.

Secrets can also come from env vars instead of the file: `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `ICLOUD_ADDRESS`, `ICLOUD_APP_PASSWORD`.

## Deploying with GitHub

`.github/workflows/deploy.yml` builds the frontend and publishes it to
**GitHub Pages** on every push.

1. One-time: repo **Settings → Pages → Source → GitHub Actions**.
2. Push. Your dashboard appears at `https://<user>.github.io/dashboard/`.
3. Run the backend locally (`npm run server`) — the Pages site calls it at
   `http://localhost:8787`. Browsers allow this because localhost is a
   trusted origin; your data never leaves your machine.

GitHub Pages only hosts static files, so the backend itself can't run on
GitHub — and wouldn't make sense to, since it reports *your computer's*
health and holds your credentials. If you later host the backend somewhere
else, set the repository variable `API_BASE` to its URL.

> The backend binds to `127.0.0.1` only. Set `HOST=0.0.0.0` if you want to
> reach it from another device on your network (consider the privacy
> implications first).

## What's live vs. sample data

| Panel | Without setup | After setup |
|---|---|---|
| System health | Simulated walk | **Live** local stats, polled every 2s |
| News | Sample headlines | **Live** RSS, refreshed every 5 min |
| KRW/USD | Live (frankfurter.app, client-side) | same |
| Email | Sample messages | **Live** Gmail + iCloud, refreshed every 60s |
| Calendar | Sample events | **Live** Google + iCloud, refreshed every 5 min |

## Project structure

```
server/
  index.js                   # Express app (binds 127.0.0.1:8787)
  config.example.json        # copy to config.json (gitignored)
  lib/config.js              # config + defaults + env overrides
  lib/google.js              # OAuth + token refresh + authed fetch
  lib/cache.js               # tiny TTL cache
  routes/{stats,emails,calendar,news,auth}.js
src/
  App.jsx                    # layout grid
  lib/api.js                 # API base + polling hook with mock fallback
  components/                # one panel per file + shared Panel/Sparkline
  hooks/                     # useEmails / useCalendar / useNews / useSystemStats / useExchangeRate / useClock
  data/mock.js               # sample data used as offline fallback
.github/workflows/deploy.yml # GitHub Pages deployment
```
