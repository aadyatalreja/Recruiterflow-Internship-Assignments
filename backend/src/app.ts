import express, { type NextFunction, type Request, type Response } from 'express'
import { query } from './db.ts'

/** Builds the Express app without starting it, so tests can use it directly. */
export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    const [row] = query<{ ok: number }>('SELECT 1 AS ok')
    res.json({ status: 'ok', db: row?.ok === 1 })
  })

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Express needs all four parameters to recognise this as the error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
