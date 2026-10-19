import { createAuthClient } from 'better-auth/react'
import { expoClient, storageAdapter } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

const storage = storageAdapter(SecureStore)

export const authClient = createAuthClient({
  baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000',
  plugins: [
    expoClient({
      scheme: 'mecrapid',
      storage,
    }),
  ],
})

export const { useSession, signIn, signOut, signUp } = authClient
