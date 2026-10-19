import { useAuth } from '@clerk/expo'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function useApi() {
  const { getToken } = useAuth()

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  return { request }
}
