import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { NavHeader, Card, Chip, PrimaryButton, ui } from '../../../components/ui'

type Customer = { id: string; name: string; phone: string }
type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string }
type ServiceType = { id: string; name: string; durationMinutes: number }
type ScheduleRow = { dayOfWeek: number; startHour: number; endHour: number; active: boolean }

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function nextDays(count: number): Date[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d })
}
function slots(start: number, end: number): string[] {
  const out: string[] = []
  for (let h = start; h < end; h++) out.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`)
  return out
}

// Cita creada por el taller (el cliente llamó o vino en persona)
export default function StaffNewAppointmentScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [customService, setCustomService] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [confirmNow, setConfirmNow] = useState(true)

  const days = nextDays(21)
  const { data: customers, isFetching } = useQuery({
    queryKey: ['customers-search', search.trim()],
    queryFn: () => request<{ data: Customer[] }>(`/api/v1/customers?search=${encodeURIComponent(search.trim())}&limit=10`),
    enabled: !customer,
    refetchInterval: false,
  })
  const { data: vehicles } = useQuery({
    queryKey: ['customer-vehicles', customer?.id],
    queryFn: () => request<{ data: Vehicle[] }>(`/api/v1/vehicles?customerId=${customer!.id}&limit=50`),
    enabled: !!customer,
  })
  const { data: services } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => request<{ data: ServiceType[] }>('/api/v1/service-types'),
    refetchInterval: false,
  })
  const { data: schedule } = useQuery({
    queryKey: ['work-schedule'],
    queryFn: () => request<{ data: ScheduleRow[] }>('/api/v1/work-schedule'),
    refetchInterval: false,
  })

  const rowFor = (d: Date) => schedule?.data.find((r) => r.dayOfWeek === d.getDay())
  const open = (d: Date) => (schedule?.data.length ? !!rowFor(d)?.active : true)
  const daySlots = date ? (() => { const r = rowFor(date); return r ? slots(r.startHour, r.endHour) : slots(8, 17) })() : []
  const service = services?.data.find((s) => s.id === serviceId)
  const serviceName = serviceId === 'otro' ? customService.trim() : service?.name ?? ''

  const create = useMutation({
    mutationFn: async () => {
      const [h, m] = slot!.split(':').map(Number)
      const when = new Date(date!)
      when.setHours(h!, m!, 0, 0)
      const { data } = await request<{ data: { id: string } }>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer!.id,
          vehicleId,
          scheduledAt: when.toISOString(),
          serviceType: serviceName,
          duration: service?.durationMinutes ?? 60,
          notes: notes.trim() || null,
        }),
      })
      // Confirmarla de una vez le manda al cliente el aviso "Tu cita está confirmada"
      if (confirmNow) await request(`/api/v1/appointments/${data.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
      router.replace(`/(tabs)/appointments/${data.id}`)
    },
    onError: (e) => Alert.alert('No se pudo crear la cita', e instanceof Error ? e.message : 'Intentá de nuevo.'),
  })

  function submit() {
    if (!customer) { Alert.alert('Falta el cliente', 'Buscá y elegí el cliente.'); return }
    if (!serviceName) { Alert.alert('Falta el servicio', 'Elegí o escribí el servicio.'); return }
    if (!date || !slot) { Alert.alert('Falta la fecha', 'Elegí el día y la hora.'); return }
    create.mutate()
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title="Nueva cita" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Card title="Cliente">
          {customer ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={ui.title}>{customer.name}</Text>
                <Text style={ui.sub}>{customer.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => { setCustomer(null); setVehicleId(null) }}><Text style={styles.link}>Cambiar</Text></TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre…" placeholderTextColor="#8898AA" style={styles.input} autoCorrect={false} />
              {isFetching && <ActivityIndicator style={{ marginTop: 8 }} color="#5E72E4" />}
              {customers?.data.map((c) => (
                <TouchableOpacity key={c.id} style={styles.option} onPress={() => setCustomer(c)}>
                  <Text style={ui.title}>{c.name}</Text>
                  <Text style={ui.sub}>{c.phone}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ marginTop: 10 }} onPress={() => router.push('/(tabs)/customers/form')}>
                <Text style={styles.link}>+ Cliente nuevo</Text>
              </TouchableOpacity>
            </>
          )}
          {customer && (vehicles?.data.length ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Chip label="Sin vehículo" active={!vehicleId} onPress={() => setVehicleId(null)} />
              {vehicles!.data.map((v) => (
                <Chip key={v.id} label={`${v.make} ${v.model} · ${v.licensePlate}`} active={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
              ))}
            </View>
          )}
        </Card>

        <Card title="Servicio">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {services?.data.map((s) => (
              <Chip key={s.id} label={s.name} active={serviceId === s.id} onPress={() => { setServiceId(s.id); setCustomService('') }} />
            ))}
            <Chip label="Otro" active={serviceId === 'otro'} onPress={() => setServiceId('otro')} />
          </View>
          {serviceId === 'otro' && (
            <TextInput value={customService} onChangeText={setCustomService} placeholder="Describí el servicio" placeholderTextColor="#8898AA" style={[styles.input, { marginTop: 10 }]} />
          )}
        </Card>

        <Card title="Fecha y hora">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {days.map((d) => {
                const available = open(d)
                const active = date?.toDateString() === d.toDateString()
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    disabled={!available}
                    onPress={() => { setDate(d); setSlot(null) }}
                    style={[styles.day, active && styles.dayActive, !available && { opacity: 0.35 }]}
                  >
                    <Text style={[styles.dayAbbr, active && { color: '#fff' }]}>{DAY[d.getDay()]}</Text>
                    <Text style={[styles.dayNum, active && { color: '#fff' }]}>{d.getDate()}</Text>
                    <Text style={[styles.dayAbbr, active && { color: '#fff' }]}>{MONTH[d.getMonth()]}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
          {date && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {daySlots.map((t) => <Chip key={t} label={t} active={slot === t} onPress={() => setSlot(t)} />)}
            </View>
          )}
        </Card>

        <Card title="Notas">
          <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Ej. el cliente llamó, trae el carro a las 8" placeholderTextColor="#8898AA" style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={ui.title}>Confirmar de una vez</Text>
              <Text style={ui.sub}>El cliente recibe el aviso de cita confirmada en su app</Text>
            </View>
            <Switch value={confirmNow} onValueChange={setConfirmNow} />
          </View>
        </Card>

        <PrimaryButton label="📅  Crear cita" onPress={submit} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' },
  option: { padding: 12, borderRadius: 12, backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF', marginTop: 8 },
  link: { fontSize: 14, fontWeight: '800', color: '#5E72E4' },
  day: { width: 58, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  dayActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  dayAbbr: { fontSize: 11, fontWeight: '700', color: '#8898AA' },
  dayNum: { fontSize: 18, fontWeight: '800', color: '#172B4D', marginVertical: 2 },
})
