import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { getMigrations } from 'better-auth/db/migration'
import { auth } from '../src/lib/auth.ts'

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log('Auth tables already up to date')
  process.exit(0)
}

if (toBeCreated.length > 0) {
  console.log('Creating tables:', toBeCreated.map((t) => t.table).join(', '))
}
if (toBeAdded.length > 0) {
  console.log('Adding columns in:', toBeAdded.map((t) => t.table).join(', '))
}

await runMigrations()
console.log('Auth migration complete')
process.exit(0)
