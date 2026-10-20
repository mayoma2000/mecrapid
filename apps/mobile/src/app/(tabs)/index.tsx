import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
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

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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

  const userName = session?.user.name ?? 'Usuario'
  const userEmail = session?.user.email ?? ''
  const initials = getInitials(userName)

  function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => { void signOut() } },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Tablero</Text>
          <Text style={styles.pageDate}>
            {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* KPI Cards */}
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <QuickAction
              icon="🔧"
              label="Órdenes"
              color="#5E72E4"
              onPress={() => router.push('/(tabs)/orders')}
            />
            <QuickAction
              icon="📅"
              label="Citas"
              color="#2DCE89"
              onPress={() => router.push('/(tabs)/appointments')}
            />
            <QuickAction
              icon="👤"
              label="Clientes"
              color="#11CDEF"
              onPress={() => router.push('/(tabs)/customers')}
            />
          </View>
        </View>
      </ScrollView>

      {/* Custom bottom bar: usuario | 📊 | cerrar sesión */}
      <View style={styles.bottomBar}>
        {/* Usuario */}
        <View style={styles.userPill}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
          </View>
        </View>

        {/* Tablero icon centrado */}
        <View style={styles.centerIcon}>
          <View style={styles.centerIconInner}>
            <Text style={{ fontSize: 22 }}>📊</Text>
          </View>
          <Text style={styles.centerIconLabel}>Tablero</Text>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
          <Text style={styles.signOutText}>Salir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172B4D',
  },
  pageDate: {
    fontSize: 13,
    color: '#8898AA',
    marginTop: 2,
    textTransform: 'capitalize',
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

  /* ── Bottom bar ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  userPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5E72E4',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#172B4D',
  },
  userEmail: {
    fontSize: 10,
    color: '#8898AA',
    marginTop: 1,
  },
  centerIcon: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  centerIconInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  centerIconLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E72E4',
    marginTop: 3,
  },
  signOutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    gap: 2,
  },
  signOutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8898AA',
  },
})
