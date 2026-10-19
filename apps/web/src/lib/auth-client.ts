import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // No baseURL — uses window.location.origin, always same-origin
})

export const { signIn, signOut, signUp, useSession } = authClient
