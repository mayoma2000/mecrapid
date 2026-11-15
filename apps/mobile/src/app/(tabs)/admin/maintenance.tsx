import { CatalogEditor } from '../../../components/CatalogEditor'

const every = (km: unknown, months: unknown) =>
  [km != null ? `${Number(km).toLocaleString('es-HN')} km` : null, months != null ? `${String(months)} meses` : null].filter(Boolean).join(' o ')

// Mantenimientos preventivos que la app le recuerda a cada cliente (lo que llegue primero: km o meses)
export default function MaintenanceRulesScreen() {
  return (
    <CatalogEditor
      title="Mantenimientos"
      listPath="/api/v1/maintenance-rules"
      itemPath="/api/v1/maintenance-rules/:id"
      intro="La app avisa al cliente cuando a su carro le toca, por kilometraje o por tiempo, lo que llegue primero."
      fields={[
        { key: 'name', label: 'Nombre', placeholder: 'Cambio de aceite' },
        { key: 'intervalKm', label: 'Cada cuántos km', placeholder: '5000', keyboard: 'number-pad', number: true },
        { key: 'intervalMonths', label: 'Cada cuántos meses', placeholder: '3', keyboard: 'number-pad', number: true },
        {
          key: 'keywords', label: 'Palabras clave', placeholder: 'aceite',
          hint: 'Separadas por coma. Si aparecen en un servicio o repuesto de una orden completada, cuenta como hecho.',
        },
      ]}
      subtitle={(r) => `Cada ${every(r['intervalKm'], r['intervalMonths'])} · detecta: ${String(r['keywords'] ?? '')}`}
    />
  )
}
