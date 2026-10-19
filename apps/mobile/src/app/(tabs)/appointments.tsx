import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApi } from '../../lib/api'

interface Appointment {
  id: string
  scheduledAt: string
  serviceType: string
  duration: number
  status: string
  customer: { name: string; phone: string }
  vehicle?: { make: string; model: string; licensePlate: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  confirmed:   'bg-green-100 text-green-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-neutral-100 text-neutral-500',
  cancelled:   'bg-red-100 text-red-500',
  no_show:     'bg-red-100 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled:   'Programada',
  confirmed:   'Confirmada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No se presentó',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const color = STATUS_COLORS[appt.status] ?? 'bg-neutral-100 text-neutral-500'
  const label = STATUS_LABELS[appt.status] ?? appt.status
  return (
    <TouchableOpacity className="bg-white dark:bg-neutral-900 rounded-2xl p-4 mb-3 border border-neutral-100 dark:border-neutral-800">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-3">
          <View className="bg-blue-50 dark:bg-blue-900/30 rounded-xl px-3 py-2 items-center">
            <Text className="text-xs text-blue-500 font-medium">{formatDate(appt.scheduledAt)}</Text>
            <Text className="text-base font-bold text-blue-700 dark:text-blue-400">{formatTime(appt.scheduledAt)}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-neutral-900 dark:text-white">{appt.customer.name}</Text>
            <Text className="text-sm text-neutral-500 mt-0.5">{appt.serviceType}</Text>
          </View>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${color}`}>
          <Text className={`text-xs font-medium ${color}`}>{label}</Text>
        </View>
      </View>
      {appt.vehicle && (
        <Text className="text-xs text-neutral-400 mt-1">
          {appt.vehicle.make} {appt.vehicle.model} · {appt.vehicle.licensePlate}
        </Text>
      )}
      <Text className="text-xs text-neutral-400 mt-0.5">⏱ {appt.duration} min</Text>
    </TouchableOpacity>
  )
}

function getWeekRange(offset: number) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { from: monday.toISOString(), to: sunday.toISOString(), label: `${monday.getDate()}–${sunday.getDate()} ${sunday.toLocaleDateString('es-HN', { month: 'short' })}` }
}

export default function AppointmentsScreen() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { request } = useApi()
  const { from, to, label } = getWeekRange(weekOffset)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['appointments', from, to],
    queryFn: () =>
      request<{ data: Appointment[] }>(`/api/v1/appointments?from=${from}&to=${to}&limit=100`),
  })

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Citas</Text>
        <View className="flex-row items-center justify-between bg-white dark:bg-neutral-900 rounded-2xl px-2 py-1 border border-neutral-100 dark:border-neutral-800">
          <TouchableOpacity
            onPress={() => setWeekOffset((w) => w - 1)}
            className="p-2"
          >
            <Text className="text-neutral-600 dark:text-neutral-300 text-lg">‹</Text>
          </TouchableOpacity>
          <Text className="font-medium text-neutral-700 dark:text-neutral-200">{label}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((w) => w + 1)}
            className="p-2"
          >
            <Text className="text-neutral-600 dark:text-neutral-300 text-lg">›</Text>
          </TouchableOpacity>
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
          renderItem={({ item }) => <AppointmentCard appt={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-3">📅</Text>
              <Text className="text-neutral-500 dark:text-neutral-400">Sin citas esta semana</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
