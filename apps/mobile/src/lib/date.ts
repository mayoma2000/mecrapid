// La API devuelve timestamptz en formato Postgres ("2026-11-17 17:00:00.123+00").
// Hermes/V8 no lo parsean de forma confiable: con espacio falla en Hermes y con
// "T" + offset "+00" (sin minutos) falla en V8. Se normaliza a ISO 8601 completo.
export function safeDate(str: string): Date {
  return new Date(str.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))
}
