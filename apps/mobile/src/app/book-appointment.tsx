import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../lib/api'

type ServiceType = { id: string; name: string; durationMinutes: number }
type ScheduleRow = { dayOfWeek: number; startHour: number; endHour: number; active: boolean }

const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function buildDays(count: number): Date[] {
  const days: Date[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 1; i <= count; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(d)
  }
  return days
}

function buildSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = []
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

export default function BookAppointmentScreen() {
  const { request } = useApi()
  const insets = useSafeAreaInsets()
  const dateScrollRef = useRef<ScrollView>(null)

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [customService, setCustomService] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const DAYS = buildDays(21)

  useEffect(() => {
    void Promise.all([
      fetch(`${process.env['EXPO_PUBLIC_API_URL'] ?? ''}/api/v1/service-types`)
        .then((r) => r.json() as Promise<{ data: ServiceType[] }>)
        .then(({ data }) => setServiceTypes(data ?? [])),
      fetch(`${process.env['EXPO_PUBLIC_API_URL'] ?? ''}/api/v1/work-schedule`)
        .then((r) => r.json() as Promise<{ data: ScheduleRow[] }>)
        .then(({ data }) => setSchedule(data ?? [])),
    ]).finally(() => setLoadingCatalogs(false))
  }, [])

  function scheduleForDay(date: Date): ScheduleRow | undefined {
    return schedule.find((s) => s.dayOfWeek === date.getDay())
  }

  function isDayAvailable(date: Date): boolean {
    const row = scheduleForDay(date)
    return !!row?.active
  }

  const slots = selectedDate
    ? (() => {
        const row = scheduleForDay(selectedDate)
        return row ? buildSlots(row.startHour, row.endHour) : []
      })()
    : []

  const serviceLabel =
    selectedServiceId === 'otro'
      ? customService.trim() || null
      : serviceTypes.find((s) => s.id === selectedServiceId)?.name ?? null

  async function handleSubmit() {
    if (!serviceLabel) { Alert.alert('Campo requerido', 'Selecciona o indica el tipo de servicio.'); return }
    if (!selectedDate) { Alert.alert('Campo requerido', 'Selecciona una fecha.'); return }
    if (!selectedSlot) { Alert.alert('Campo requerido', 'Selecciona un horario.'); return }

    const [hours, minutes] = selectedSlot.split(':').map(Number)
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(hours!, minutes!, 0, 0)

    setSaving(true)
    try {
      await request('/api/v1/me/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: serviceLabel,
          scheduledAt: scheduledAt.toISOString(),
          notes: notes.trim() || null,
        }),
      })
      Alert.alert('Cita solicitada', 'El taller revisará tu solicitud y te confirmará.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Agendar Cita</Text>
            <Text style={s.subtitle}>El taller confirmará tu solicitud</Text>
          </View>
        </View>

        {loadingCatalogs ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#5E72E4" />
          </View>
        ) : (
          <>
            {/* Tipo de servicio */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Tipo de servicio *</Text>
              <View style={s.chipGrid}>
                {serviceTypes.map((st) => {
                  const active = selectedServiceId === st.id
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => { setSelectedServiceId(st.id); setCustomService('') }}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{st.name}</Text>
                    </TouchableOpacity>
                  )
                })}
                <TouchableOpacity
                  onPress={() => setSelectedServiceId('otro')}
                  style={[s.chip, selectedServiceId === 'otro' && s.chipActive]}
                >
                  <Text style={[s.chipText, selectedServiceId === 'otro' && s.chipTextActive]}>Otro</Text>
                </TouchableOpacity>
              </View>
              {selectedServiceId === 'otro' && (
                <TextInput
                  value={customService}
                  onChangeText={setCustomService}
                  placeholder="Describe el servicio que necesitas"
                  placeholderTextColor="#8898AA"
                  style={[s.input, { marginTop: 12 }]}
                />
              )}
            </View>

            {/* Selección de fecha */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Fecha *</Text>
              <ScrollView
                ref={dateScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {DAYS.map((day, idx) => {
                  const available = isDayAvailable(day)
                  const selected = selectedDate?.toDateString() === day.toDateString()
                  return (
                    <TouchableOpacity
                      key={idx}
                      disabled={!available}
                      onPress={() => { setSelectedDate(day); setSelectedSlot(null) }}
                      style={[s.dayCard, selected && s.dayCardActive, !available && s.dayCardDisabled]}
                    >
                      <Text style={[s.dayAbbr, selected && s.dayAbbrActive, !available && s.dayTextDisabled]}>
                        {DAY_ABBR[day.getDay()]}
                      </Text>
                      <Text style={[s.dayNum, selected && s.dayNumActive, !available && s.dayTextDisabled]}>
                        {day.getDate()}
                      </Text>
                      <Text style={[s.dayMonth, selected && s.dayMonthActive, !available && s.dayTextDisabled]}>
                        {MONTH_ABBR[day.getMonth()]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {/* Selección de horario */}
            {selectedDate && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Horario *</Text>
                {slots.length === 0 ? (
                  <Text style={{ color: '#8898AA', fontSize: 13 }}>No hay horarios disponibles para este día.</Text>
                ) : (
                  <View style={s.slotGrid}>
                    {slots.map((slot) => {
                      const active = selectedSlot === slot
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => setSelectedSlot(slot)}
                          style={[s.slotChip, active && s.slotChipActive]}
                        >
                          <Text style={[s.slotText, active && s.slotTextActive]}>{slot}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Notas */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Notas adicionales</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Síntomas, histórico, preferencias…"
                placeholderTextColor="#8898AA"
                multiline
                numberOfLines={3}
                style={s.textArea}
                textAlignVertical="top"
              />
            </View>

            {/* Info banner */}
            <View style={s.infoBanner}>
              <Text style={s.infoText}>ℹ️  El taller te contactará para confirmar la cita.</Text>
            </View>

            {/* Submit */}
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <TouchableOpacity onPress={() => void handleSubmit()} disabled={saving} style={s.submitBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>📅  Solicitar cita</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  backText: { fontSize: 18, color: '#172B4D' },
  title: { fontSize: 22, fontWeight: '800', color: '#172B4D' },
  subtitle: { fontSize: 13, color: '#8898AA', marginTop: 1 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0' },
  chipActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#172B4D' },
  chipTextActive: { color: '#fff' },

  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', borderWidth: 1, borderColor: '#E8EAF0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  textArea: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', minHeight: 90, borderWidth: 1, borderColor: '#E8EAF0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  dayCard: { width: 58, alignItems: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0', gap: 2 },
  dayCardActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  dayCardDisabled: { backgroundColor: '#F0F0F0', borderColor: '#E8EAF0' },
  dayAbbr: { fontSize: 11, fontWeight: '700', color: '#8898AA', textTransform: 'uppercase' },
  dayAbbrActive: { color: 'rgba(255,255,255,0.8)' },
  dayTextDisabled: { color: '#C5C5C5' },
  dayNum: { fontSize: 20, fontWeight: '800', color: '#172B4D' },
  dayNumActive: { color: '#fff' },
  dayMonth: { fontSize: 10, color: '#8898AA', fontWeight: '600' },
  dayMonthActive: { color: 'rgba(255,255,255,0.7)' },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0', minWidth: 74, alignItems: 'center' },
  slotChipActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  slotText: { fontSize: 13, fontWeight: '700', color: '#172B4D' },
  slotTextActive: { color: '#fff' },

  infoBanner: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#EEF0FD', borderRadius: 14, padding: 14 },
  infoText: { fontSize: 12, color: '#5E72E4', fontWeight: '600', lineHeight: 18 },
  submitBtn: { backgroundColor: '#5E72E4', borderRadius: 18, paddingVertical: 16, alignItems: 'center', shadowColor: '#5E72E4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
