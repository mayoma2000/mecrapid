import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { MAINT_STATUS, everyLabel, nextLabel, type Maintenance } from '../lib/maintenance'

// Estado de mantenimiento del vehículo; con `canBook` muestra "Agendar" en lo que ya toca o está cerca
export function MaintenanceList({ maintenance, canBook }: { maintenance: Maintenance; canBook?: boolean }) {
  if (maintenance.items.length === 0) return null
  return (
    <View style={styles.card}>
      <Text style={styles.section}>Mantenimiento</Text>
      {maintenance.estimatedKm != null && (
        <Text style={styles.hint}>
          ~{maintenance.estimatedKm.toLocaleString('es-HN')} km hoy (estimado con {maintenance.kmPerDay} km/día
          {maintenance.estimatedFromHistory ? ' según su historial' : ' de uso promedio'})
        </Text>
      )}
      {maintenance.items.map((m, i) => {
        const st = MAINT_STATUS[m.status]
        const urgent = m.status === 'due' || m.status === 'soon'
        return (
          <View key={m.ruleId} style={[styles.row, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.sub}>Cada {everyLabel(m.intervalKm, m.intervalMonths)}</Text>
              <Text style={styles.sub}>{nextLabel(m)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
              {canBook && urgent && (
                <TouchableOpacity onPress={() => router.push(`/book-appointment?service=${encodeURIComponent(m.name)}`)}>
                  <Text style={styles.link}>Agendar ›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5,
  },
  section: { fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2 },
  hint: { fontSize: 12, color: '#8898AA', marginTop: 4, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F2F6' },
  name: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  sub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  link: { fontSize: 13, fontWeight: '800', color: '#5E72E4' },
})
