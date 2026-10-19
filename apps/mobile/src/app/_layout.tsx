// @ts-expect-error — CSS side-effect import for NativeWind
import '../../../global.css'
import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'

const queryClient = new QueryClient()
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    const inAuth = segments[0] === '(auth)'
    if (!isSignedIn && !inAuth) {
      router.replace('/(auth)/sign-in')
    } else if (isSignedIn && inAuth) {
      router.replace('/(tabs)')
    }
  }, [isLoaded, isSignedIn, segments])

  return <Slot />
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <AuthGuard />
      </QueryClientProvider>
    </ClerkProvider>
  )
}
