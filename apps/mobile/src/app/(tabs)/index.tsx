import { useAuth, useUser } from '@clerk/expo'
import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApi } from '../../lib/api'
import { router } from 'expo-router'

interface KPIData {
  data: { totalCustomers: number; ordersInProgress: number; todayAppointments: number }
}

function KPICard({ label, value, onPress }: { label: string; value?: number; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800"
    >
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
        {value ?? '—'}
      </Text>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const { signOut } = useAuth()
  const { user } = useUser()
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

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Tablero</Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {user?.firstName ?? 'Usuario'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => signOut()}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800"
          >
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">Salir</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
          Resumen
        </Text>

        <View className="gap-3 mb-6">
          <View className="flex-row gap-3">
            <KPICard
              label="Clientes"
              value={customersAgg?.meta.total}
              onPress={() => router.push('/(tabs)/customers')}
            />
            <KPICard
              label="Órdenes activas"
              value={ordersAgg?.meta.total}
              onPress={() => router.push('/(tabs)/orders')}
            />
          </View>
          <KPICard
            label="Citas para hoy"
            value={appointmentsAgg?.meta.total}
            onPress={() => router.push('/(tabs)/appointments')}
          />
        </View>

        <Text className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
          Acciones rápidas
        </Text>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/orders')}
            className="flex-1 bg-blue-600 rounded-2xl p-4"
          >
            <Text className="text-white text-xl mb-1">🔧</Text>
            <Text className="text-white font-semibold">Nueva orden</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            className="flex-1 bg-neutral-800 dark:bg-neutral-700 rounded-2xl p-4"
          >
            <Text className="text-white text-xl mb-1">📅</Text>
            <Text className="text-white font-semibold">Nueva cita</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
