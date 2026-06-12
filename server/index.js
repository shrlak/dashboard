import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { loadEnv } from './env.js'
import { authRouter } from './routes/auth.js'
import { calendarRouter } from './routes/calendar.js'
import { emailsRouter } from './routes/emails.js'
import { integrationsRouter } from './routes/integrations.js'
import { newsRouter } from './routes/news.js'
import { systemRouter } from './routes/system.js'

loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.set('trust proxy', 1)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRouter)
app.use('/api/emails', emailsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/news', newsRouter)
app.use('/api/system', systemRouter)
app.use('/api/integrations', integrationsRouter)
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }))

// eslint-disable-next-line no-unused-vars
app.use('/api', (err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

// In production the backend also serves the built frontend; in development
// run `npm run dev` and Vite proxies /api here instead.
const dist = path.resolve(__dirname, '../dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const port = +(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`Dashboard backend listening on http://localhost:${port}`)
  if (!fs.existsSync(dist)) {
    console.log('No dist/ found — run `npm run build` to serve the frontend from here,')
    console.log('or keep using `npm run dev` (Vite proxies /api to this server).')
  }
})
