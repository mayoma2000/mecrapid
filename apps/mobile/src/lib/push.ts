import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { AndroidImportance } from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from './auth-client'

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'
const TOKEN_KEY = 'mecrapid.pushToken'

// Con la app abierta el aviso también se muestra como banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function api(path: string, method: string, body: unknown) {
  const cookie = await authClient.getCookie()
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
}

// Pide permiso, obtiene el token de Expo de este teléfono y lo registra en la cuenta.
// En simulador o en Expo Go de Android no hay push remoto: se sigue usando la bandeja.
async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos del taller',
      importance: AndroidImportance.HIGH,
    })
  }

  const current = await Notifications.getPermissionsAsync()
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return

  const projectId = Constants.expoConfig?.extra?.['eas']?.projectId ?? Constants.easConfig?.projectId
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  const res = await api('/api/v1/me/push-tokens', 'POST', { token, platform: Platform.OS })
  if (res.ok) await SecureStore.setItemAsync(TOKEN_KEY, token)
}

// Llamar ANTES de cerrar sesión: este teléfono deja de recibir avisos de la cuenta
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (!token) return
    await api('/api/v1/me/push-tokens', 'DELETE', { token })
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    // Sin red: el servidor borra el token solo cuando Expo lo reporte como inválido
  }
}

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.['url']
  if (typeof url === 'string' && url) router.push(url as never)
}

// Registra el teléfono al iniciar sesión, abre la pantalla del aviso al tocarlo
// y refresca los datos cuando llega uno con la app abierta
export function usePushNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    registerPushToken().catch((err) => console.warn('[push] no se pudo registrar', err))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    // App cerrada: se abrió tocando un aviso. Se limpia para no volver a abrirlo en cada inicio.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      void Notifications.clearLastNotificationResponseAsync()
      setTimeout(() => openFromNotification(response), 300)
    })
    const tapped = Notifications.addNotificationResponseReceivedListener(openFromNotification)
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries()
    })
    return () => {
      tapped.remove()
      received.remove()
    }
  }, [userId, queryClient])
}
