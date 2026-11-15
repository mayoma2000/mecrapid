import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { NavHeader, ui } from '../../../components/ui'

const ITEMS = [
  { href: '/(tabs)/admin/mechanics', icon: '👷', title: 'Mecánicos', sub: 'Cuentas, activar/desactivar, contraseñas' },
  { href: '/(tabs)/admin/services', icon: '⚙️', title: 'Servicios', sub: 'Catálogo y precios sugeridos' },
  { href: '/(tabs)/admin/assistance-types', icon: '🔖', title: 'Tipos de asistencia', sub: 'Lo que el cliente puede pedir' },
  { href: '/(tabs)/admin/schedule', icon: '🕐', title: 'Horario', sub: 'Días y horas para agendar' },
  { href: '/(tabs)/admin/maintenance', icon: '🛢️', title: 'Mantenimientos', sub: 'Recordatorios por km o meses' },
] as const

// Configuración del taller (solo admin): lo mismo que el backoffice web
export default function AdminScreen() {
  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title="Administración" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {ITEMS.map((it) => (
          <TouchableOpacity key={it.href} style={styles.item} onPress={() => router.push(it.href)}>
            <Text style={{ fontSize: 24 }}>{it.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ui.title}>{it.title}</Text>
              <Text style={ui.sub}>{it.sub}</Text>
            </View>
            <Text style={{ fontSize: 24, color: '#C9CED6' }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
})
