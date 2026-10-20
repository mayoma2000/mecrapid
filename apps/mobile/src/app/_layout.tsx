import '../../global.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useSession } from '../lib/auth-client'
import { LoadingScreen } from '../components/LoadingScreen'

const queryClient = new QueryClient()

function AuthGuard() {
  const { data: session, isPending } = useSession()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuth) {
      router.replace('/(tabs)')
    }
  }, [isPending, session, segments])

  if (isPending) return <LoadingScreen />

  return <Slot />
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGuard />
    </QueryClientProvider>
  )
}
