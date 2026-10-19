import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { auth } from '../src/lib/auth.ts'

async function createUser(name: string, email: string, password: string) {
  const res = await auth.api.signUpEmail({
    body: { name, email, password },
  })
  if (res.user) {
    console.log(`✓ Created: ${email}`)
  } else {
    console.log(`⚠ ${email}: already exists or error`)
  }
}

await createUser('Admin', 'admin@mecrapid.com', 'Admin1234!')
await createUser('Demo', 'demo@mecrapid.com', 'Demo1234!')
console.log('Done')
process.exit(0)
