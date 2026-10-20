import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'

type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'

interface WorkOrder {
  id: string
  complaint: string
  status: WorkOrderStatus
  customer: { name: string }
  vehicle: { make: string; model: string; year: number; licensePlate: string }
  estimatedCost: number | null
  createdAt: string
}

const TABS = [
  { key: 'active',    label: 'Activas',     filter: 'active' },
  { key: 'pending',   label: 'Pendientes',  filter: 'pending' },
  { key: 'completed', label: 'Completadas', filter: 'completed' },
  { key: 'cancelled', label: 'Canceladas',  filter: 'cancelled' },
]

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; color: string }> = {
  pending:       { label: 'Pendiente',       bg: '#FFF5EC', color: '#FB6340' },
  assigned:      { label: 'Asignada',        bg: '#EEF0FD', color: '#5E72E4' },
  in_progress:   { label: 'En proceso',      bg: '#FFF5EC', color: '#FB6340' },
  quality_check: { label: 'Control calidad', bg: '#F5E8FF', color: '#9B59B6' },
  completed:     { label: 'Completada',      bg: '#E6FAF3', color: '#2DCE89' },
  cancelled:     { label: 'Cancelada',       bg: '#F8F9FA', color: '#8898AA' },
}

function OrderCard({ order }: { order: WorkOrder }) {
  const cfg = STATUS_CONFIG[order.status]
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/orders/${order.id}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.customerName} numberOfLines={1}>{order.customer.name}</Text>
          <Text style={styles.vehicleText} numberOfLines={1}>
            {order.vehicle.make} {order.vehicle.model} {order.vehicle.year} · {order.vehicle.licensePlate}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={styles.complaint} numberOfLines={2}>{order.complaint}</Text>
      {order.estimatedCost != null && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Estimado</Text>
          <Text style={styles.costValue}>L {order.estimatedCost.toLocaleString()}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('active')
  const { request } = useApi()
  const filter = TABS.find((t) => t.key === activeTab)?.filter ?? 'active'

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['work-orders', filter],
    queryFn: () =>
      request<{ data: WorkOrder[]; meta: { total: number } }>(`/api/v1/work-orders?status=${filter}&limit=50`),
  })

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Órdenes</Text>
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
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch() }}
              tintColor="#5E72E4"
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔧</Text>
              <Text style={{ color: '#8898AA', fontSize: 15 }}>Sin órdenes en esta categoría</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#172B4D',
  },
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
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8898AA',
  },
  tabTextActive: {
    color: '#fff',
  },
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
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172B4D',
  },
  vehicleText: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  complaint: {
    fontSize: 14,
    color: '#525F7F',
    lineHeight: 20,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  costLabel: {
    fontSize: 12,
    color: '#8898AA',
    fontWeight: '600',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5E72E4',
  },
})
