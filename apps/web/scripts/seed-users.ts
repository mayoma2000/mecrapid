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
    return res.user
  } else {
    console.log(`⚠ ${email}: already exists or error`)
    return null
  }
}

async function setRole(userId: string, role: string) {
  await auth.api.setRole({ body: { userId, role } })
  console.log(`✓ Role '${role}' set for user ${userId}`)
}

const adminUser = await createUser('Admin', 'admin@mecrapid.com', 'Admin1234!')
const mecanicoUser = await createUser('Mecánico Demo', 'mecanico@mecrapid.com', 'Mecanico1234!')
await createUser('Demo', 'demo@mecrapid.com', 'Demo1234!')

if (adminUser) await setRole(adminUser.id, 'admin')
if (mecanicoUser) await setRole(mecanicoUser.id, 'mecanico')
// demo@mecrapid.com keeps the default 'user' role

console.log('Done')
process.exit(0)
