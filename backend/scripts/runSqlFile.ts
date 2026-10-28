import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DB_PATH, exec, transaction } from '../src/db.ts'

const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql')

/** Runs one hand-written .sql file from backend/sql in a single transaction. */
export function runSqlFile(fileName: string): void {
  const sql = readFileSync(path.join(sqlDir, fileName), 'utf8')
  transaction(() => exec(sql))
  console.log(`Ran sql/${fileName} against ${DB_PATH}`)
}
