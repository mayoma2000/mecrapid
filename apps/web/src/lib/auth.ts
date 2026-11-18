import { betterAuth } from 'better-auth'
import { expo } from '@better-auth/expo'
import { admin } from 'better-auth/plugins'
import { Pool } from '@neondatabase/serverless'
import { createAuthMiddleware } from 'better-auth/api'
import { ensureCustomerForSignup } from '@/src/lib/me'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env['DATABASE_URL']! }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      phone: { type: 'string', required: false },
    },
  },
  plugins: [expo(), admin()],
  hooks: {
    // Solo el registro público (app del cliente). Las cuentas que crea un admin
    // (mecánicos, administradores) usan otra ruta y no pasan por aquí.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      const user = ctx.context.newSession?.user
      if (!user) return
      const phone = typeof ctx.body?.phone === 'string' ? ctx.body.phone.trim() || null : null
      try {
        await ensureCustomerForSignup({ name: user.name, email: user.email }, phone)
      } catch (err) {
        // Si falla, la ficha se crea igual al pedir la primera cita o asistencia
        console.error('[signup] no se pudo vincular la ficha de cliente', err)
      }
    }),
  },
  trustedOrigins: [
    process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
    ...(process.env['VERCEL_URL'] ? [`https://${process.env['VERCEL_URL']}`] : []),
    ...(process.env['VERCEL_BRANCH_URL'] ? [`https://${process.env['VERCEL_BRANCH_URL']}`] : []),
    'mecrapid://',
    'null',       // React Native sends Origin: null from native context
    'exp://',     // Expo Go dev client origin
  ],
})

export type Session = typeof auth.$Infer.Session
