import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'

interface Appointment {
  id: string
  scheduledAt: string
  serviceType: string
  duration: number
  status: string
  customer: { name: string; phone: string }
  vehicle?: { make: string; model: string; licensePlate: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:   { label: 'Programada',     bg: '#EEF0FD', color: '#5E72E4' },
  confirmed:   { label: 'Confirmada',     bg: '#E6FAF3', color: '#2DCE89' },
  in_progress: { label: 'En curso',       bg: '#FFF5EC', color: '#FB6340' },
  completed:   { label: 'Completada',     bg: '#F8F9FA', color: '#8898AA' },
  cancelled:   { label: 'Cancelada',      bg: '#FEE8EC', color: '#F5365C' },
  no_show:     { label: 'No se presentó', bg: '#FEE8EC', color: '#F5365C' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, bg: '#F8F9FA', color: '#8898AA' }
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/appointments/${appt.id}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeDate}>{formatDate(appt.scheduledAt)}</Text>
          <Text style={styles.timeHour}>{formatTime(appt.scheduledAt)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.customerName}>{appt.customer.name}</Text>
          <Text style={styles.serviceType}>{appt.serviceType}</Text>
          {appt.vehicle && (
            <Text style={styles.vehicleText}>
              {appt.vehicle.make} {appt.vehicle.model} · {appt.vehicle.licensePlate}
            </Text>
          )}
          <Text style={styles.durationText}>⏱ {appt.duration} min</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
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
  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
    label: `${monday.getDate()}–${sunday.getDate()} ${sunday.toLocaleDateString('es-HN', { month: 'short' })}`,
  }
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Citas</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setWeekOffset((w) => w - 1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{label}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((w) => w + 1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AppointmentCard appt={item} />}
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
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📅</Text>
              <Text style={{ color: '#8898AA', fontSize: 15 }}>Sin citas esta semana</Text>
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
    marginBottom: 14,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 24,
    color: '#5E72E4',
    lineHeight: 28,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#172B4D',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  timeBlock: {
    backgroundColor: '#EEF0FD',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 74,
  },
  timeDate: {
    fontSize: 10,
    color: '#5E72E4',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  timeHour: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5E72E4',
    marginTop: 2,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172B4D',
  },
  serviceType: {
    fontSize: 13,
    color: '#525F7F',
    marginTop: 2,
  },
  vehicleText: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  durationText: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
})
