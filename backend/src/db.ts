import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Thin wrapper around better-sqlite3. Every query in this service is a hand-written SQL
 * string passed through query() or run(); there is no ORM or query builder. Values are
 * always bound as parameters (? or @name), never concatenated into the SQL.
 */

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Override with DB_PATH (e.g. ':memory:' in tests). */
export const DB_PATH = process.env.DB_PATH ?? path.join(backendRoot, 'recruiter-bot.sqlite')

/** Positional (`?`) values as an array, or named (`@name`) values as an object. */
export type SqlParams = readonly unknown[] | Readonly<Record<string, unknown>>

export const db = new Database(DB_PATH)
// SQLite leaves foreign keys off unless asked, per connection.
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

function bind(params: SqlParams): unknown[] {
  return Array.isArray(params) ? [...params] : [params]
}

/**
 * Runs a SELECT and returns every row. better-sqlite3 returns rows as `unknown`, so the
 * caller states the row shape with T; it must match the columns the SQL selects.
 */
export function query<T>(sql: string, params: SqlParams = []): T[] {
  // Cast: the driver can't know the row shape; T documents what this SQL returns.
  return db.prepare(sql).all(...bind(params)) as T[]
}

/** Runs an INSERT / UPDATE / DELETE and reports how many rows changed. */
export function run(sql: string, params: SqlParams = []): { changes: number; lastInsertRowid: number } {
  const result = db.prepare(sql).run(...bind(params))
  return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }
}

/** Runs a script of several statements with no parameters (schema and seed files). */
export function exec(sql: string): void {
  db.exec(sql)
}

/** Runs fn inside a transaction: everything commits together or nothing does. */
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)()
}
