import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApi } from '../../lib/api'
import { useSession, signOut } from '../../lib/auth-client'
import { router } from 'expo-router'

interface KPICardProps {
  label: string
  value?: number
  icon: string
  color: string
  onPress?: () => void
}

function KPICard({ label, value, icon, color, onPress }: KPICardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.kpiCard, { flex: 1 }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: color + '22' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.kpiValue}>{value ?? '—'}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.quickAction, { backgroundColor: color, shadowColor: color }]}>
      <Text style={{ fontSize: 28, marginBottom: 8 }}>{icon}</Text>
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const { data: session } = useSession()
  const { request } = useApi()
  const today = new Date().toISOString().split('T')[0]!

  const { data: customersAgg } = useQuery({
    queryKey: ['customers-count'],
    queryFn: () => request<{ meta: { total: number } }>('/api/v1/customers?limit=1'),
  })
  const { data: ordersAgg } = useQuery({
    queryKey: ['orders-active'],
    queryFn: () => request<{ meta: { total: number } }>('/api/v1/work-orders?status=active&limit=1'),
  })
  const { data: appointmentsAgg } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => request<{ meta: { total: number } }>(`/api/v1/appointments?from=${today}T00:00:00.000Z&to=${today}T23:59:59.999Z&limit=1`),
  })

  const firstName = session?.user.name?.split(' ')[0] ?? 'Usuario'

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { void signOut() }}
            style={styles.signOutBtn}
          >
            <Text style={styles.signOutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <KPICard
              label="Clientes"
              value={customersAgg?.meta.total}
              icon="👥"
              color="#5E72E4"
              onPress={() => router.push('/(tabs)/customers')}
            />
            <KPICard
              label="Órdenes activas"
              value={ordersAgg?.meta.total}
              icon="🔧"
              color="#FB6340"
              onPress={() => router.push('/(tabs)/orders')}
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <KPICard
              label="Citas para hoy"
              value={appointmentsAgg?.meta.total}
              icon="📅"
              color="#11CDEF"
              onPress={() => router.push('/(tabs)/appointments')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <QuickAction
              icon="🔧"
              label="Nueva orden"
              color="#5E72E4"
              onPress={() => router.push('/(tabs)/orders')}
            />
            <QuickAction
              icon="📅"
              label="Nueva cita"
              color="#2DCE89"
              onPress={() => router.push('/(tabs)/appointments')}
            />
            <QuickAction
              icon="👤"
              label="Nuevo cliente"
              color="#11CDEF"
              onPress={() => router.push('/(tabs)/customers')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172B4D',
  },
  dateText: {
    fontSize: 13,
    color: '#8898AA',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  signOutBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontSize: 13,
    color: '#525F7F',
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8898AA',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  kpiIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#172B4D',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
    fontWeight: '600',
  },
  quickAction: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
})
