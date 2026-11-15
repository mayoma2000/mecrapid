// Aplica en orden los archivos de sql/ que todavía no se corrieron.
// El historial de `prisma migration` quedó desfasado (tablas creadas a mano después
// del init), así que los cambios de esquema van aquí, versionados y con registro.
//   node scripts/sql-migrate.ts          → aplica pendientes
//   node scripts/sql-migrate.ts --dry    → solo lista pendientes
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from '@neondatabase/serverless'

const dir = join(import.meta.dirname, '..', 'sql')
const dry = process.argv.includes('--dry')
const pool = new Pool({ connectionString: process.env['DATABASE_URL']! })

await pool.query(`CREATE TABLE IF NOT EXISTS "_sql_migrations" (
  "name" text PRIMARY KEY,
  "appliedAt" timestamptz NOT NULL DEFAULT now()
)`)
const { rows } = await pool.query<{ name: string }>('SELECT "name" FROM "_sql_migrations"')
const applied = new Set(rows.map((r) => r.name))
const pending = readdirSync(dir).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort()

if (pending.length === 0) console.log('Sin migraciones pendientes')

for (const file of pending) {
  if (dry) { console.log(`pendiente: ${file}`); continue }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(readFileSync(join(dir, file), 'utf8'))
    await client.query('INSERT INTO "_sql_migrations" ("name") VALUES ($1)', [file])
    await client.query('COMMIT')
    console.log(`✓ ${file}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`✗ ${file}:`, (err as Error).message)
    process.exitCode = 1
    break
  } finally {
    client.release()
  }
}

await pool.end()
