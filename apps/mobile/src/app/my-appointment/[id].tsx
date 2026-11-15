import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../lib/api'
import { safeDate } from '../../lib/date'

interface MyAppointment {
  id: string
  scheduledAt: string
  serviceType: string
  duration: number
  notes: string | null
  status: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; hint: string }> = {
  scheduled:   { label: 'Programada',     bg: '#EEF0FD', color: '#5E72E4', hint: 'El taller revisará tu solicitud y te confirmará.' },
  confirmed:   { label: 'Confirmada',     bg: '#E6FAF3', color: '#2DCE89', hint: 'El taller confirmó tu cita. ¡Te esperamos!' },
  in_progress: { label: 'En proceso',     bg: '#FFF5EC', color: '#FB6340', hint: 'Tu vehículo está siendo atendido.' },
  completed:   { label: 'Completada',     bg: '#E6FAF3', color: '#2DCE89', hint: 'Esta cita ya fue atendida.' },
  cancelled:   { label: 'Cancelada',      bg: '#FEE8EC', color: '#F5365C', hint: 'Esta cita fue cancelada.' },
  no_show:     { label: 'No se presentó', bg: '#FEE8EC', color: '#F5365C', hint: 'No se registró asistencia a esta cita.' },
}

const CLOSED = ['completed', 'cancelled', 'no_show']

export default function MyAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointment', id],
    queryFn: () => request<{ data: MyAppointment }>(`/api/v1/me/appointments/${id}`),
  })

  const cancel = useMutation({
    mutationFn: () =>
      request(`/api/v1/me/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-appointment', id] })
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cancelar la cita.'),
  })

  const appt = data?.data

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    )
  }

  if (!appt) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <Text style={{ color: '#8898AA' }}>Cita no encontrada</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, bg: '#F8F9FA', color: '#8898AA', hint: '' }
  const when = safeDate(appt.scheduledAt)
  const editable = !CLOSED.includes(appt.status)

  function handleCancel() {
    Alert.alert('Cancelar cita', '¿Seguro que quieres cancelar esta cita?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancel.mutate() },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mi cita</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{appt.serviceType || 'Cita de servicio'}</Text>
            <Text style={styles.heroDate}>
              {when.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <Text style={styles.heroTime}>
              {when.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })} · {appt.duration} min
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {!!cfg.hint && (
          <View style={styles.hintCard}>
            <Text style={styles.hintText}>ℹ️  {cfg.hint}</Text>
          </View>
        )}

        {appt.notes && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Notas</Text>
            <Text style={styles.fieldValue}>{appt.notes}</Text>
          </View>
        )}

        {editable && (
          <View style={{ gap: 10, marginTop: 6 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#5E72E4', shadowColor: '#5E72E4' }]}
              onPress={() => router.push(`/book-appointment?id=${appt.id}`)}
              disabled={cancel.isPending}
            >
              <Text style={styles.actionBtnText}>📅  Reagendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending
                ? <ActivityIndicator color="#F5365C" />
                : <Text style={[styles.actionBtnText, { color: '#F5365C' }]}>Cancelar cita</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#172B4D' },
  heroDate: { fontSize: 14, color: '#525F7F', marginTop: 6, textTransform: 'capitalize' },
  heroTime: { fontSize: 13, color: '#8898AA', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  hintCard: { backgroundColor: '#EEF0FD', borderRadius: 16, padding: 14, marginBottom: 14 },
  hintText: { fontSize: 13, color: '#525F7F', lineHeight: 19 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  fieldLabel: { fontSize: 11, color: '#8898AA', fontWeight: '600', marginBottom: 4 },
  fieldValue: { fontSize: 14, color: '#172B4D', lineHeight: 20 },
  link: { fontSize: 14, color: '#5E72E4', fontWeight: '700' },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F5365C55',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
