import { CatalogEditor } from '../../../components/CatalogEditor'

// Tipos de asistencia que el cliente puede pedir desde la app (grúa, batería, llanta…)
export default function AssistanceTypesScreen() {
  return (
    <CatalogEditor
      title="Tipos de asistencia"
      listPath="/api/v1/assistance-types"
      itemPath="/api/v1/assistance-types/:id"
      intro="Los activos aparecen cuando el cliente pide asistencia desde la app."
      fields={[
        { key: 'name', label: 'Nombre', placeholder: 'Grúa' },
        { key: 'description', label: 'Descripción', placeholder: 'Opcional', multiline: true },
      ]}
      subtitle={(t) => (t['description'] ? String(t['description']) : 'Sin descripción')}
    />
  )
}
