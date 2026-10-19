import { authClient } from './auth-client'

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'

export function useApi() {
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const cookie = await authClient.getCookie()
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
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
