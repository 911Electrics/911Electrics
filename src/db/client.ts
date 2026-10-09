import 'server-only'

import { Pool } from 'pg'

/**
 * Payload-free database client.
 *
 * Uses `pg` (node-postgres) — the same driver Payload's postgres adapter uses
 * against this exact DATABASE_URL, which is proven to work on Vercel. We tried
 * postgres.js first but its queries hung against Supabase's transaction pooler
 * (connections authenticated but queries never returned), stalling the build.
 *
 * A single pool is reused across the serverless lambda / build worker.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Fail a stuck query fast rather than hanging a page render to the 60s limit.
    statement_timeout: 15_000,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool
}

/** Run a parameterized query and return the rows. */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params as unknown[])
  return res.rows as T[]
}
