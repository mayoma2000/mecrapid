import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApi } from '../../lib/api'

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

const TABS: { key: string; label: string; filter: string }[] = [
  { key: 'active',        label: 'Activas',     filter: 'active' },
  { key: 'pending',       label: 'Pendientes',  filter: 'pending' },
  { key: 'completed',     label: 'Completadas', filter: 'completed' },
  { key: 'cancelled',     label: 'Canceladas',  filter: 'cancelled' },
]

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending:       'Pendiente',
  assigned:      'Asignada',
  in_progress:   'En proceso',
  quality_check: 'Control calidad',
  completed:     'Completada',
  cancelled:     'Cancelada',
}

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  pending:       'bg-yellow-100 text-yellow-700',
  assigned:      'bg-blue-100 text-blue-700',
  in_progress:   'bg-orange-100 text-orange-700',
  quality_check: 'bg-purple-100 text-purple-700',
  completed:     'bg-green-100 text-green-700',
  cancelled:     'bg-neutral-100 text-neutral-500',
}

function OrderCard({ order }: { order: WorkOrder }) {
  const colors = STATUS_COLORS[order.status]
  const label = STATUS_LABELS[order.status]
  return (
    <TouchableOpacity className="bg-white dark:bg-neutral-900 rounded-2xl p-4 mb-3 border border-neutral-100 dark:border-neutral-800">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-neutral-900 dark:text-white" numberOfLines={1}>
            {order.customer.name}
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {order.vehicle.make} {order.vehicle.model} {order.vehicle.year} · {order.vehicle.licensePlate}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${colors}`}>
          <Text className={`text-xs font-medium ${colors}`}>{label}</Text>
        </View>
      </View>
      <Text className="text-sm text-neutral-600 dark:text-neutral-300" numberOfLines={2}>
        {order.complaint}
      </Text>
      {order.estimatedCost != null && (
        <Text className="text-sm font-semibold text-blue-600 mt-2">
          L {order.estimatedCost.toLocaleString()}
        </Text>
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          Órdenes de servicio
        </Text>
        <View className="flex-row gap-2">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full ${activeTab === tab.key ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-800'}`}
            >
              <Text className={`text-xs font-medium ${activeTab === tab.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-3">🔧</Text>
              <Text className="text-neutral-500 dark:text-neutral-400">Sin órdenes en esta categoría</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
