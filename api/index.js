// Vercel serverless entry: every request is routed here (see vercel.json) and
// handed to the same Express app the standalone/Docker server uses.
import app from '../server/index.js'

export default app
