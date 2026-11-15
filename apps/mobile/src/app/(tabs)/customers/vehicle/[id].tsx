import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../../lib/api'
import { useSession } from '../../../../lib/auth-client'
import { safeDate } from '../../../../lib/date'
import { money } from '../../../../lib/quotes'

type Owner = { customerId: string; name: string; startedAt: string; endedAt: string | null; note: string | null }
type Entry = {
  id: string; date: string; mileage: number | null; status: string; complaint: string; total: number
  customer: { id: string; name: string } | null; mechanic: string | null
  services: { description: string }[]; parts: { name: string; quantity: number }[]
}
type History = {
  vehicle: { make: string; model: string; year: number; licensePlate: string; mileage: number }
  owners: Owner[]; entries: Entry[]
}
type Customer = { id: string; name: string; phone: string }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignada', in_progress: 'En proceso',
  quality_check: 'Control calidad', completed: 'Completada', cancelled: 'Cancelada',
}
const day = (s: string) => safeDate(s).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })

// Historial completo del vehículo para el taller + cambio de dueño (admin)
export default function StaffVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  const [transferOpen, setTransferOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<Customer | null>(null)
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-history', id],
    queryFn: () => request<{ data: History }>(`/api/v1/vehicles/${id}/history`),
  })
  const { data: results } = useQuery({
    queryKey: ['customers-search', search.trim()],
    queryFn: () => request<{ data: Customer[] }>(`/api/v1/customers?search=${encodeURIComponent(search.trim())}&limit=8`),
    enabled: transferOpen && !target,
    refetchInterval: false,
  })

  const transfer = useMutation({
    mutationFn: () =>
      request(`/api/v1/vehicles/${id}/transfer`, { method: 'POST', body: JSON.stringify({ customerId: target!.id, note }) }),
    onSuccess: () => {
      setTransferOpen(false); setTarget(null); setNote(''); setSearch('')
      void queryClient.invalidateQueries({ queryKey: ['vehicle-history', id] })
      void queryClient.invalidateQueries({ queryKey: ['customer'] })
      Alert.alert('Listo', 'El vehículo cambió de dueño.')
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cambiar el dueño.'),
  })

  const h = data?.data
  const current = h?.owners.find((o) => !o.endedAt)

  function confirmTransfer() {
    Alert.alert(
      'Cambiar de dueño',
      `${target!.name} verá qué se le hizo al carro, sin el nombre ni los precios de ${current?.name ?? 'el dueño anterior'}.`,
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => transfer.mutate() }],
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>Vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !h ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>{h.vehicle.make} {h.vehicle.model} {h.vehicle.year}</Text>
            <Text style={styles.sub}>{h.vehicle.licensePlate} · {h.vehicle.mileage.toLocaleString('es-HN')} km</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.section}>Dueños</Text>
              {isAdmin && !transferOpen && (
                <TouchableOpacity onPress={() => setTransferOpen(true)}><Text style={styles.link}>Cambiar de dueño</Text></TouchableOpacity>
              )}
            </View>
            {[...h.owners].reverse().map((o) => (
              <View key={`${o.customerId}-${o.startedAt}`} style={[styles.rowBetween, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.owner}>{o.name}{!o.endedAt ? '  ·  actual' : ''}</Text>
                  {o.note && <Text style={styles.sub}>“{o.note}”</Text>}
                </View>
                <Text style={styles.sub}>{day(o.startedAt)} → {o.endedAt ? day(o.endedAt) : 'hoy'}</Text>
              </View>
            ))}

            {transferOpen && (
              <View style={{ marginTop: 14, gap: 8 }}>
                {target ? (
                  <View style={[styles.rowBetween, styles.picked]}>
                    <Text style={styles.owner}>{target.name} <Text style={styles.sub}>· {target.phone}</Text></Text>
                    <TouchableOpacity onPress={() => setTarget(null)}><Text style={styles.link}>Cambiar</Text></TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput value={search} onChangeText={setSearch} placeholder="Buscar nuevo dueño…" placeholderTextColor="#8898AA" style={styles.input} autoCorrect={false} />
                    {results?.data.filter((c) => c.id !== current?.customerId).map((c) => (
                      <TouchableOpacity key={c.id} style={styles.option} onPress={() => setTarget(c)}>
                        <Text style={styles.owner}>{c.name}</Text>
                        <Text style={styles.sub}>{c.phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                <TextInput value={note} onChangeText={setNote} placeholder="Motivo (opcional): venta, traspaso…" placeholderTextColor="#8898AA" style={styles.input} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.primary, (!target || transfer.isPending) && { opacity: 0.4 }]} disabled={!target || transfer.isPending} onPress={confirmTransfer}>
                    <Text style={styles.primaryText}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondary} onPress={() => { setTransferOpen(false); setTarget(null) }}>
                    <Text style={styles.secondaryText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={[styles.section, { marginLeft: 4, marginBottom: 10 }]}>Historial de servicios · {h.entries.length}</Text>
          {h.entries.length === 0 && <Text style={[styles.sub, { textAlign: 'center', marginTop: 20 }]}>Sin órdenes todavía</Text>}
          {h.entries.map((e) => (
            <TouchableOpacity key={e.id} style={[styles.card, e.status === 'cancelled' && { opacity: 0.5 }]} onPress={() => router.push(`/(tabs)/orders/${e.id}`)}>
              <View style={styles.rowBetween}>
                <Text style={styles.owner}>{day(e.date)}{e.mileage != null ? ` · ${e.mileage.toLocaleString('es-HN')} km` : ''}</Text>
                {e.total > 0 && <Text style={styles.total}>{money(e.total)}</Text>}
              </View>
              <Text style={styles.sub}>
                {STATUS_LABEL[e.status] ?? e.status}{e.mechanic ? ` · ${e.mechanic}` : ''}
                {e.customer && e.customer.id !== current?.customerId ? ` · dueño anterior: ${e.customer.name}` : ''}
              </Text>
              <Text style={styles.complaint} numberOfLines={2}>{e.complaint}</Text>
              {e.services.map((s, i) => <Text key={`s${i}`} style={styles.item}>🔧 {s.description}</Text>)}
              {e.parts.map((p, i) => <Text key={`p${i}`} style={styles.item}>📦 {p.name}{p.quantity !== 1 ? ` × ${p.quantity}` : ''}</Text>)}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, ...shadow },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 19, fontWeight: '800', color: '#172B4D' },
  sub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  section: { fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2 },
  link: { fontSize: 13, fontWeight: '800', color: '#5E72E4' },
  owner: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  total: { fontSize: 14, fontWeight: '800', color: '#5E72E4' },
  complaint: { fontSize: 13, color: '#525F7F', marginTop: 6 },
  item: { fontSize: 13, color: '#172B4D', marginTop: 4 },
  input: { backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' },
  option: { padding: 12, borderRadius: 12, backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  picked: { padding: 12, borderRadius: 12, backgroundColor: '#EEF0FD' },
  primary: { flex: 1, backgroundColor: '#5E72E4', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondary: { paddingHorizontal: 18, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#D9DEE7' },
  secondaryText: { color: '#525F7F', fontSize: 14, fontWeight: '700' },
})
