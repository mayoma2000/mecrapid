import { CatalogEditor } from '../../../components/CatalogEditor'

const money = (n: unknown) => (typeof n === 'number' ? `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : 'sin precio')

// Catálogo de servicios: lo que el cliente elige al agendar y lo que se agrega rápido a las cotizaciones
export default function ServicesScreen() {
  return (
    <CatalogEditor
      title="Servicios"
      listPath="/api/v1/service-types?all=1"
      itemPath="/api/v1/service-types/:id"
      invalidate={[['service-types']]}
      intro="Los activos aparecen al agendar citas y como atajo en las cotizaciones."
      fields={[
        { key: 'name', label: 'Nombre', placeholder: 'Cambio de aceite' },
        { key: 'price', label: 'Precio sugerido (L, sin ISV)', placeholder: '650', keyboard: 'decimal-pad', number: true },
        { key: 'durationMinutes', label: 'Duración (minutos)', placeholder: '60', keyboard: 'number-pad', number: true },
        { key: 'description', label: 'Descripción', placeholder: 'Opcional', multiline: true },
      ]}
      subtitle={(s) => `${money(s['price'])} · ${String(s['durationMinutes'] ?? 60)} min`}
    />
  )
}
