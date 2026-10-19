import { betterAuth } from 'better-auth'
import { expo } from '@better-auth/expo'
import { Pool } from '@neondatabase/serverless'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env['DATABASE_URL']! }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [expo()],
  trustedOrigins: [
    process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
    'mecrapid://',
  ],
})

export type Session = typeof auth.$Infer.Session
