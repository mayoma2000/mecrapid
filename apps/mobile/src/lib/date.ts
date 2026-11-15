// La API devuelve timestamptz en formato Postgres ("2026-11-17 17:00:00+00"),
// que Hermes no parsea con new Date() → "Invalid Date". Normaliza a ISO 8601.
export function safeDate(str: string): Date {
  return new Date(str.replace(' ', 'T'))
}
