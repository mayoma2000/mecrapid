import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'

type AssistanceStatus = 'pending' | 'active' | 'completed' | 'cancelled'

interface AssistanceRequest {
  id: string
  detail: string
  phone: string
  status: AssistanceStatus
  createdAt: string
  customer: { name: string; email: string | null } | null
  assistanceType: { name: string } | null
}

const TABS = [
  { key: 'pending',   label: 'Pendientes' },
  { key: 'active',    label: 'Activas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'all',       label: 'Todas' },
]

const ASSISTANCE_STATUS: Record<AssistanceStatus, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: '#FFF5EC', color: '#FB6340' },
  active:    { label: 'Activa',     bg: '#EEF0FD', color: '#5E72E4' },
  completed: { label: 'Completada', bg: '#E6FAF3', color: '#2DCE89' },
  cancelled: { label: 'Cancelada',  bg: '#F8F9FA', color: '#8898AA' },
}

function RequestCard({ item }: { item: AssistanceRequest }) {
  const cfg = ASSISTANCE_STATUS[item.status] ?? ASSISTANCE_STATUS.pending
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/assistance/${item.id}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customer?.name ?? '—'}</Text>
          <Text style={styles.subText} numberOfLines={1}>
            {item.assistanceType?.name ?? 'Asistencia'} · {item.phone}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={styles.detail} numberOfLines={2}>{item.detail}</Text>
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  )
}

export default function AssistanceScreen() {
  const [activeTab, setActiveTab] = useState('pending')
  const { request } = useApi()
  const qs = activeTab === 'all' ? '' : `status=${activeTab}&`

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['assistance-requests', activeTab],
    queryFn: () =>
      request<{ data: AssistanceRequest[]; meta: { total: number } }>(`/api/v1/assistance-requests?${qs}limit=50`),
  })

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.navigate('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Asistencia</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch() }}
              tintColor="#5E72E4"
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🚨</Text>
              <Text style={{ color: '#8898AA', fontSize: 15 }}>Sin solicitudes en esta categoría</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#172B4D' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: '#5E72E4',
    shadowColor: '#5E72E4',
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#8898AA' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  customerName: { fontSize: 16, fontWeight: '700', color: '#172B4D' },
  subText: { fontSize: 12, color: '#8898AA', marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 14, color: '#525F7F', lineHeight: 20 },
  date: { fontSize: 11, color: '#8898AA', marginTop: 10 },
})
