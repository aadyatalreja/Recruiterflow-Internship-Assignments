import { runSqlFile } from './runSqlFile.ts'

// Drops and recreates every table, so this also resets the database.
runSqlFile('schema.sql')
