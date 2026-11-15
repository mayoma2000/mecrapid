import '../../global.css'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSession } from '../lib/auth-client'
import { LoadingScreen } from '../components/LoadingScreen'
import { usePushNotifications } from '../lib/push'

// Datos "casi en tiempo real": cada pantalla montada vuelve a pedir sus datos
// cada 15 s mientras la app está en primer plano, y al volver del segundo plano.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 15_000,
      staleTime: 5_000,
    },
  },
})

// React Native no tiene eventos de foco de ventana: se los damos a React Query
// con AppState, así pausa el polling en segundo plano y refresca al regresar.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'))
  return () => sub.remove()
})

function AuthGuard() {
  const { data: session, isPending } = useSession()
  const segments = useSegments()
  const router = useRouter()
  usePushNotifications(session?.user.id)

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
