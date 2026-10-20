import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Pressable, Image } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useApi } from '../../lib/api'
import { useSession, signOut } from '../../lib/auth-client'
import { router } from 'expo-router'

const logo = require('../../../assets/logo.jpg') as number

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

function statusColor(status: string) {
  if (status === 'completed' || status === 'done') return '#2DCE89'
  if (status === 'cancelled') return '#F5365C'
  if (status === 'in_progress' || status === 'confirmed' || status === 'active') return '#FB6340'
  if (status === 'scheduled') return '#5E72E4'
  return '#8898AA'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    active: 'Activa',
    completed: 'Completado',
    done: 'Completado',
    cancelled: 'Cancelado',
    confirmed: 'Confirmada',
    scheduled: 'Programada',
  }
  return map[status] ?? status
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
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'ordenes' | 'citas'>('solicitudes')
  const today = new Date().toISOString().split('T')[0]!
  const role = (session?.user as { role?: string })?.role ?? 'user'
  const isStaff = role === 'admin' || role === 'mecanico'

  // Staff KPIs
  const { data: customersAgg } = useQuery({
    queryKey: ['customers-count'],
    queryFn: () => request<{ meta: { total: number } }>('/api/v1/customers?limit=1'),
    enabled: isStaff,
  })
  const { data: ordersAgg } = useQuery({
    queryKey: ['orders-active'],
    queryFn: () => request<{ meta: { total: number } }>('/api/v1/work-orders?status=active&limit=1'),
    enabled: isStaff,
  })
  const { data: appointmentsAgg } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => request<{ meta: { total: number } }>(`/api/v1/appointments?from=${today}T00:00:00.000Z&to=${today}T23:59:59.999Z&limit=1`),
    enabled: isStaff,
  })

  // Cliente final: mis órdenes, citas y solicitudes de asistencia
  const { data: myOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => request<{ data: { id: string; status: string; complaint: string; createdAt: string }[] }>('/api/v1/me/orders'),
    enabled: !isStaff,
  })
  const { data: myAppointments } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => request<{ data: { id: string; status: string; scheduledAt: string; serviceType: string }[] }>('/api/v1/me/appointments'),
    enabled: !isStaff,
  })
  const { data: myAssistance } = useQuery({
    queryKey: ['my-assistance'],
    queryFn: () => request<{ data: { id: string; status: string; detail: string; createdAt: string; assistanceType: { name: string } | null }[] }>('/api/v1/me/assistance-requests'),
    enabled: !isStaff,
  })

  const rawName = session?.user.name ?? ''
  const userEmail = session?.user.email ?? ''
  // If name was accidentally stored as an email address, use the local part
  const userName = rawName.includes('@') ? (rawName.split('@')[0] ?? 'Usuario') : (rawName || 'Usuario')
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

        {isStaff ? (
          <>
            {/* KPI Cards — staff view */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <KPICard
                  label="Clientes"
                  value={customersAgg?.meta.total}
                  icon="👥"
                  color="#5E72E4"
                  onPress={() => router.navigate('/customers')}
                />
                <KPICard
                  label="Órdenes activas"
                  value={ordersAgg?.meta.total}
                  icon="🔧"
                  color="#FB6340"
                  onPress={() => router.navigate('/orders')}
                />
              </View>
              <View style={{ marginTop: 12 }}>
                <KPICard
                  label="Citas para hoy"
                  value={appointmentsAgg?.meta.total}
                  icon="📅"
                  color="#11CDEF"
                  onPress={() => router.navigate('/appointments')}
                />
              </View>
            </View>

            {/* Quick Actions — staff view */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones rápidas</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <QuickAction
                  icon="🔧"
                  label="Órdenes"
                  color="#5E72E4"
                  onPress={() => router.navigate('/orders')}
                />
                <QuickAction
                  icon="📅"
                  label="Citas"
                  color="#2DCE89"
                  onPress={() => router.navigate('/appointments')}
                />
                <QuickAction
                  icon="👤"
                  label="Clientes"
                  color="#11CDEF"
                  onPress={() => router.navigate('/customers')}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* CTAs principales — cliente */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => router.navigate('/assistance-request')} style={styles.ctaCard}>
                  <Text style={styles.ctaIcon}>🆘</Text>
                  <Text style={styles.ctaTitle}>Solicitar Asistencia</Text>
                  <Text style={styles.ctaSub}>Mecánico en tu ubicación</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.navigate('/book-appointment')} style={[styles.ctaCard, styles.ctaCardSecondary]}>
                  <Text style={styles.ctaIcon}>📅</Text>
                  <Text style={[styles.ctaTitle, { color: '#5E72E4' }]}>Agendar Cita</Text>
                  <Text style={styles.ctaSub}>Trae tu vehículo al taller</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mi Actividad — sección tabulada */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi Actividad</Text>

              {/* Tab chips */}
              <View style={styles.tabRow}>
                {(
                  [
                    { key: 'solicitudes', label: 'Solicitudes', count: myAssistance?.data.length ?? 0 },
                    { key: 'ordenes', label: 'Órdenes', count: myOrders?.data.length ?? 0 },
                    { key: 'citas', label: 'Citas', count: myAppointments?.data.length ?? 0 },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.key
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      style={[styles.actTab, active && styles.actTabActive]}
                    >
                      <Text style={[styles.actTabText, active && styles.actTabTextActive]}>
                        {tab.label}
                      </Text>
                      {tab.count > 0 && (
                        <View style={[styles.actTabBadge, active && styles.actTabBadgeActive]}>
                          <Text style={[styles.actTabBadgeText, active && styles.actTabBadgeTextActive]}>
                            {tab.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Contenido del tab activo */}
              {activeTab === 'solicitudes' && (
                (myAssistance?.data.length ?? 0) === 0 ? (
                  <View style={styles.emptyCompact}>
                    <Text style={styles.emptyCompactText}>Sin solicitudes de asistencia aún</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {myAssistance?.data.map((a) => (
                      <View key={a.id} style={styles.listCard}>
                        <View style={styles.listCardLeft}>
                          <Text style={styles.listCardTitle} numberOfLines={1}>
                            {a.assistanceType?.name ?? 'Asistencia'}
                          </Text>
                          <Text style={styles.listCardSub} numberOfLines={1}>{a.detail}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(a.status) + '22' }]}>
                          <Text style={[styles.statusText, { color: statusColor(a.status) }]}>
                            {statusLabel(a.status)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              )}

              {activeTab === 'ordenes' && (
                (myOrders?.data.length ?? 0) === 0 ? (
                  <View style={styles.emptyCompact}>
                    <Text style={styles.emptyCompactText}>Sin órdenes de trabajo aún</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {myOrders?.data.map((order) => (
                      <View key={order.id} style={styles.listCard}>
                        <View style={styles.listCardLeft}>
                          <Text style={styles.listCardTitle} numberOfLines={1}>
                            {order.complaint || 'Orden de trabajo'}
                          </Text>
                          <Text style={styles.listCardSub}>
                            {new Date(order.createdAt).toLocaleDateString('es-HN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) + '22' }]}>
                          <Text style={[styles.statusText, { color: statusColor(order.status) }]}>
                            {statusLabel(order.status)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              )}

              {activeTab === 'citas' && (
                (myAppointments?.data.length ?? 0) === 0 ? (
                  <View style={styles.emptyCompact}>
                    <Text style={styles.emptyCompactText}>Sin citas programadas aún</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {myAppointments?.data.map((appt) => (
                      <View key={appt.id} style={styles.listCard}>
                        <View style={styles.listCardLeft}>
                          <Text style={styles.listCardTitle} numberOfLines={1}>
                            {appt.serviceType || 'Cita de servicio'}
                          </Text>
                          <Text style={styles.listCardSub}>
                            {new Date(appt.scheduledAt).toLocaleDateString('es-HN', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}{' · '}{new Date(appt.scheduledAt).toLocaleTimeString('es-HN', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(appt.status) + '22' }]}>
                          <Text style={[styles.statusText, { color: statusColor(appt.status) }]}>
                            {statusLabel(appt.status)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom bar: Tablero | Logo | Admin */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>

        {/* Izquierda: Tablero tab */}
        <View style={styles.tabItem}>
          <View style={styles.tabIconBox}>
            <Text style={{ fontSize: 22 }}>📊</Text>
          </View>
          <Text style={styles.tabLabel}>Tablero</Text>
        </View>

        {/* Centro: Logo elevado */}
        <View style={styles.centerLogoWrap}>
          <View style={styles.centerLogoOuter}>
            <Image source={logo} style={styles.logoImg} resizeMode="cover" />
          </View>
        </View>

        {/* Derecha: Admin */}
        <TouchableOpacity onPress={() => setAdminVisible(true)} style={styles.tabItem}>
          <View style={styles.adminIconBox}>
            <Text style={{ fontSize: 22 }}>⚙️</Text>
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

          {/* Logo circular */}
          <View style={styles.modalAvatar}>
            <Image source={logo} style={styles.modalLogoImg} resizeMode="cover" />
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
            <InfoRow icon="🔑" label="Rol" value={role === 'admin' ? 'Administrador' : role === 'mecanico' ? 'Mecánico' : 'Cliente'} />
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
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  /* tab items izq/der */
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E72E4',
  },
  adminIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E72E4',
  },
  /* logo central elevado */
  centerLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,          // sube el logo sobre la barra
  },
  centerLogoOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#EEF0FD',
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  logoImg: {
    width: 120,
    height: 120,
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  modalLogoImg: {
    width: 90,
    height: 90,
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

  /* ── CTA cards (cliente) ── */
  ctaCard: {
    flex: 1,
    backgroundColor: '#F5365C',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#F5365C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaCardSecondary: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.07,
  },
  ctaIcon: { fontSize: 28, marginBottom: 8 },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 },
  ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  /* ── Tab activity section ── */
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8EAF0',
  },
  actTabActive: {
    backgroundColor: '#5E72E4',
    borderColor: '#5E72E4',
  },
  actTabText: { fontSize: 12, fontWeight: '700', color: '#8898AA' },
  actTabTextActive: { color: '#fff' },
  actTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8EAF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actTabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  actTabBadgeText: { fontSize: 10, fontWeight: '800', color: '#5E72E4' },
  actTabBadgeTextActive: { color: '#fff' },
  emptyCompact: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F4',
  },
  emptyCompactText: { fontSize: 13, color: '#8898AA', fontWeight: '600' },

  /* ── Cliente final cards ── */
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  listCardLeft: { flex: 1, marginRight: 10 },
  listCardTitle: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  listCardSub: { fontSize: 11, color: '#8898AA', marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
})
