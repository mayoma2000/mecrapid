import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'
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

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[infoRowStyles.row, !last && infoRowStyles.border]}>
      <View style={infoRowStyles.iconBox}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={infoRowStyles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  )
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F1F2F6' },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEF0FD', alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, color: '#8898AA', fontWeight: '600', marginBottom: 1 },
  value: { fontSize: 13, color: '#172B4D', fontWeight: '600' },
})

export default function DashboardScreen() {
  const { data: session } = useSession()
  const { request } = useApi()
  const insets = useSafeAreaInsets()
  const [adminVisible, setAdminVisible] = useState(false)
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
  const userCreatedAt = session?.user.createdAt
  const initials = getInitials(userName)

  function handleSignOut() {
    setAdminVisible(false)
    setTimeout(() => {
      Alert.alert('Cerrar sesión', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => { void signOut() } },
      ])
    }, 300)
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
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

      {/* Custom bottom bar: usuario | 📊 Tablero | Admin */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
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

        {/* Admin */}
        <TouchableOpacity onPress={() => setAdminVisible(true)} style={styles.adminBtn}>
          <View style={styles.adminIconBox}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </View>
          <Text style={styles.adminText}>Admin</Text>
        </TouchableOpacity>
      </View>

      {/* Admin modal */}
      <Modal
        visible={adminVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdminVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAdminVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Avatar grande */}
          <View style={styles.modalAvatar}>
            <Text style={styles.modalAvatarText}>{initials}</Text>
          </View>

          {/* Nombre */}
          <Text style={styles.modalName}>{userName}</Text>

          {/* Filas de datos */}
          <View style={styles.infoCard}>
            <InfoRow icon="✉️" label="Correo" value={userEmail} />
            {userCreatedAt && (
              <InfoRow
                icon="📅"
                label="Miembro desde"
                value={new Date(userCreatedAt).toLocaleDateString('es-HN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
            <InfoRow icon="🔑" label="Rol" value="Administrador" />
            <InfoRow icon="🆔" label="ID" value={session?.user.id?.slice(0, 8).toUpperCase() ?? '—'} last />
          </View>

          {/* Cerrar sesión */}
          <TouchableOpacity style={styles.signOutBtnFull} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>🚪  Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
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
  adminBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    gap: 2,
  },
  adminIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E72E4',
  },

  /* ── Admin modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  modalAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5E72E4',
  },
  modalName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172B4D',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#F8F9FE',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  signOutBtnFull: {
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5365C',
  },
})
