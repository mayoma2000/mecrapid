import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../lib/api'

interface AppointmentDetail {
  id: string
  scheduledAt: string
  serviceType: string
  duration: number
  status: string
  notes: string | null
  customer: { id: string; name: string; phone: string }
  vehicle?: { make: string; model: string; year: number; licensePlate: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:   { label: 'Programada',     bg: '#EEF0FD', color: '#5E72E4' },
  confirmed:   { label: 'Confirmada',     bg: '#E6FAF3', color: '#2DCE89' },
  in_progress: { label: 'En curso',       bg: '#FFF5EC', color: '#FB6340' },
  completed:   { label: 'Completada',     bg: '#F8F9FA', color: '#8898AA' },
  cancelled:   { label: 'Cancelada',      bg: '#FEE8EC', color: '#F5365C' },
  no_show:     { label: 'No se presentó', bg: '#FEE8EC', color: '#F5365C' },
}

const NEXT_STATUS: Record<string, { label: string; next: string; color: string }[]> = {
  scheduled:   [{ label: 'Confirmar', next: 'confirmed', color: '#2DCE89' }, { label: 'Cancelar', next: 'cancelled', color: '#F5365C' }],
  confirmed:   [{ label: 'Iniciar', next: 'in_progress', color: '#FB6340' }, { label: 'No se presentó', next: 'no_show', color: '#F5365C' }],
  in_progress: [{ label: 'Completar', next: 'completed', color: '#2DCE89' }],
}

function formatDateTime(iso: string) {
  const d = new Date(iso.replace(' ', 'T'))
  return {
    date: d.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const [rescheduleVisible, setRescheduleVisible] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => request<{ data: AppointmentDetail }>(`/api/v1/appointments/${id}`),
  })

  const mutation = useMutation({
    mutationFn: (status: string) =>
      request(`/api/v1/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  const appt = data?.data

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    )
  }

  if (!appt) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8898AA' }}>Cita no encontrada</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, bg: '#F8F9FA', color: '#8898AA' }
  const transitions = NEXT_STATUS[appt.status] ?? []
  const { date, time } = formatDateTime(appt.scheduledAt)

  function handleTransition(next: string, label: string) {
    Alert.alert('Cambiar estado', `¿${label} esta cita?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: label, onPress: () => mutation.mutate(next), style: next === 'cancelled' || next === 'no_show' ? 'destructive' : 'default' },
    ])
  }

  async function handleReschedule() {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/) || !newTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Formato inválido', 'Fecha: AAAA-MM-DD · Hora: HH:MM')
      return
    }
    setRescheduling(true)
    try {
      await request(`/api/v1/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledAt: `${newDate}T${newTime}:00.000Z` }),
      })
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setRescheduleVisible(false)
      Alert.alert('Reprogramada', 'La cita fue reprogramada correctamente.')
    } catch {
      Alert.alert('Error', 'No se pudo reprogramar la cita.')
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Cita</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Status + time */}
        <View style={styles.heroCard}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeHour}>{time}</Text>
            <Text style={styles.timeDate}>{date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.card}>
          <InfoRow icon="👤" label="Cliente" value={appt.customer.name} />
          <Divider />
          <InfoRow icon="📞" label="Teléfono" value={appt.customer.phone} />
          <Divider />
          <InfoRow icon="🔧" label="Servicio" value={appt.serviceType} />
          <Divider />
          <InfoRow icon="⏱" label="Duración" value={`${appt.duration} min`} />
          {appt.vehicle && (
            <>
              <Divider />
              <InfoRow
                icon="🚗"
                label="Vehículo"
                value={`${appt.vehicle.make} ${appt.vehicle.model} ${appt.vehicle.year} · ${appt.vehicle.licensePlate}`}
              />
            </>
          )}
          {appt.notes && (
            <>
              <Divider />
              <InfoRow icon="📝" label="Notas" value={appt.notes} multiline />
            </>
          )}
        </View>

        {/* Action buttons */}
        {transitions.length > 0 && (
          <View style={{ gap: 10, marginTop: 4 }}>
            {transitions.map((t) => (
              <TouchableOpacity
                key={t.next}
                style={[styles.actionBtn, { backgroundColor: t.color, shadowColor: t.color }]}
                onPress={() => handleTransition(t.next, t.label)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>{t.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reprogramar */}
        {appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'no_show' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#8898AA', shadowColor: '#8898AA', marginTop: 8 }]}
            onPress={() => {
              const d = new Date(appt.scheduledAt)
              setNewDate(d.toISOString().slice(0, 10))
              setNewTime(d.toISOString().slice(11, 16))
              setRescheduleVisible(true)
            }}
          >
            <Text style={styles.actionBtnText}>📅 Reprogramar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal reprogramar */}
      <Modal visible={rescheduleVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#172B4D' }}>Reprogramar cita</Text>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#525F7F' }}>Fecha (AAAA-MM-DD)</Text>
              <TextInput
                value={newDate}
                onChangeText={setNewDate}
                placeholder="2026-10-25"
                placeholderTextColor="#8898AA"
                keyboardType="numeric"
                style={{ backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' }}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#525F7F' }}>Hora (HH:MM)</Text>
              <TextInput
                value={newTime}
                onChangeText={setNewTime}
                placeholder="09:00"
                placeholderTextColor="#8898AA"
                keyboardType="numeric"
                style={{ backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRescheduleVisible(false)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F8F9FE', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#8898AA' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleReschedule()}
                disabled={rescheduling}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#5E72E4', alignItems: 'center' }}
              >
                {rescheduling
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Confirmar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value, multiline }: { icon: string; label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, multiline && { lineHeight: 20 }]}>{value}</Text>
      </View>
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F2F6', marginVertical: 2 }} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
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
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBlock: { flex: 1 },
  timeHour: { fontSize: 32, fontWeight: '800', color: '#172B4D' },
  timeDate: { fontSize: 13, color: '#8898AA', marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 12 },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: '#8898AA', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#172B4D' },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
