import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Runs sql_detective.sql in a throwaway in-memory database (not recruiter-bot.sqlite) and prints
// each answer as a table. Each answer starts with a "-- Q<n>." comment and is one statement, so
// splitting on those markers gives the dataset first, then one query per question.

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql_detective.sql')
const [dataset = '', ...queries] = readFileSync(file, 'utf8').split(/^(?=-- Q\d\.)/m)

const db = new Database(':memory:')
db.exec(dataset)
for (const query of queries) {
  console.log(`\n${query.split('\n')[0]}`)
  console.table(db.prepare(query).all())
}
