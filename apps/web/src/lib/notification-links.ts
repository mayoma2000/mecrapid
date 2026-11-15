// Los avisos guardan la ruta de la app móvil (expo-router). En el backoffice se abren en la página equivalente.
export function webUrlFor(mobileUrl: string | null): string | null {
  if (!mobileUrl) return null
  const routes: [RegExp, (id: string) => string][] = [
    [/^\/\(tabs\)\/orders\/quotes\/([^/?#]+)/, (id) => `/quotes/${id}`],
    [/^\/\(tabs\)\/orders\/([^/?#]+)/, (id) => `/work-orders/${id}`],
    [/^\/\(tabs\)\/assistance\/([^/?#]+)/, (id) => `/assistance-requests/${id}`],
    [/^\/\(tabs\)\/appointments\/([^/?#]+)/, (id) => `/appointments/${id}`],
    [/^\/\(tabs\)\/customers\/vehicle\/([^/?#]+)/, (id) => `/vehicles/${id}`],
    [/^\/\(tabs\)\/customers\/([^/?#]+)/, (id) => `/customers/${id}`],
  ]
  for (const [re, to] of routes) {
    const m = mobileUrl.match(re)
    if (m?.[1]) return to(m[1])
  }
  return null
}
