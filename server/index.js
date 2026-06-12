import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './lib/config.js'
import authRouter from './routes/auth.js'
import statsRouter from './routes/stats.js'
import emailsRouter from './routes/emails.js'
import calendarRouter from './routes/calendar.js'
import newsRouter from './routes/news.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.locals.config = loadConfig()

// CORS so a GitHub Pages-hosted frontend can call this local backend.
app.use(cors())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/stats', statsRouter)
app.use('/api/emails', emailsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/news', newsRouter)
app.use('/auth', authRouter)

// Serve the built frontend when available, so `npm start` is a single process.
const dist = path.resolve(__dirname, '../dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 8787)
// Bind to loopback by default — this API exposes personal data, so don't
// listen on the network unless explicitly asked to (HOST=0.0.0.0).
const host = process.env.HOST ?? '127.0.0.1'
app.listen(port, host, () => {
  console.log(`Dashboard backend on http://${host}:${port}`)
  console.log(`Authorize Google accounts at http://localhost:${port}/auth/google/<account-id>`)
})
