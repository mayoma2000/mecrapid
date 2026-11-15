import { useQuery } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../lib/api'
import { safeDate } from '../../lib/date'
import { money } from '../../lib/quotes'

type Entry = {
  id: string
  date: string
  mileage: number | null
  previousOwner: boolean
  complaint?: string
  diagnosis?: string | null
  total?: number
  services: { description: string; cost?: number }[]
  parts: { name: string; quantity: number; total?: number }[]
}
type History = {
  vehicle: { make: string; model: string; year: number; licensePlate: string; color: string | null; mileage: number }
  ownerSince: string | null
  previousOwners: number
  entries: Entry[]
  summary: { services: number; lastServiceAt: string | null; lastMileage: number | null }
}

const day = (s: string) => safeDate(s).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })

// Historial del carro para el dueño actual. Lo de dueños anteriores aparece sin
// nombre ni precios: solo qué se le hizo, cuándo y con qué kilometraje.
export default function MyVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-vehicle-history', id],
    queryFn: () => request<{ data: History }>(`/api/v1/me/vehicles/${id}/history`),
  })
  const h = data?.data

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>Historial del vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !h ? (
        <View style={styles.center}>
          {isLoading ? <ActivityIndicator size="large" color="#5E72E4" /> : <Text style={{ color: '#8898AA' }}>Vehículo no encontrado</Text>}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
        >
          <View style={styles.hero}>
            <Text style={{ fontSize: 34 }}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{h.vehicle.make} {h.vehicle.model} {h.vehicle.year}</Text>
              <Text style={styles.heroSub}>{h.vehicle.licensePlate}{h.vehicle.color ? ` · ${h.vehicle.color}` : ''}</Text>
              <Text style={styles.heroSub}>{h.vehicle.mileage.toLocaleString('es-HN')} km</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Servicios" value={String(h.summary.services)} />
            <Stat label="Último servicio" value={h.summary.lastServiceAt ? safeDate(h.summary.lastServiceAt).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'} />
            <Stat label="Dueños anteriores" value={String(h.previousOwners)} />
          </View>

          {h.entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📒</Text>
              <Text style={{ color: '#8898AA', fontSize: 14, textAlign: 'center' }}>Todavía no hay servicios terminados para este vehículo.</Text>
            </View>
          ) : (
            h.entries.map((e, i) => (
              <View key={e.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, e.previousOwner && { backgroundColor: '#C9CED6' }]} />
                  {i < h.entries.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={[styles.card, e.previousOwner && styles.cardMuted]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={styles.cardDate}>{day(e.date)}</Text>
                    {e.total != null && e.total > 0 && <Text style={styles.cardTotal}>{money(e.total)}</Text>}
                  </View>
                  {e.mileage != null && <Text style={styles.cardKm}>{e.mileage.toLocaleString('es-HN')} km</Text>}
                  {e.previousOwner && <Text style={styles.prevTag}>Dueño anterior</Text>}
                  {e.complaint && <Text style={styles.complaint}>{e.complaint}</Text>}
                  {e.services.map((s, idx) => <Text key={`s${idx}`} style={styles.item}>🔧 {s.description}</Text>)}
                  {e.parts.map((p, idx) => (
                    <Text key={`p${idx}`} style={styles.item}>📦 {p.name}{p.quantity !== 1 ? ` × ${p.quantity}` : ''}</Text>
                  ))}
                  {e.services.length === 0 && e.parts.length === 0 && <Text style={styles.itemMuted}>Sin detalle de trabajos</Text>}
                </View>
              </View>
            ))
          )}

          {h.previousOwners > 0 && (
            <Text style={styles.footnote}>
              Sos dueño desde el {h.ownerSince ? day(h.ownerSince) : '—'}. De los dueños anteriores solo se muestra qué se le hizo al carro, sin datos personales ni precios.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 18, ...shadow },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#172B4D' },
  heroSub: { fontSize: 13, color: '#8898AA', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', ...shadow },
  statValue: { fontSize: 17, fontWeight: '800', color: '#172B4D' },
  statLabel: { fontSize: 11, color: '#8898AA', marginTop: 2, textAlign: 'center' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 14, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5E72E4', marginTop: 18 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#E1E5EE', marginTop: 4 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, ...shadow },
  cardMuted: { backgroundColor: '#FBFBFD' },
  cardDate: { fontSize: 14, fontWeight: '800', color: '#172B4D' },
  cardTotal: { fontSize: 14, fontWeight: '800', color: '#5E72E4' },
  cardKm: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  prevTag: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '800', color: '#8898AA', backgroundColor: '#F1F2F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  complaint: { fontSize: 13, color: '#525F7F', marginTop: 8, fontStyle: 'italic' },
  item: { fontSize: 13, color: '#172B4D', marginTop: 6 },
  itemMuted: { fontSize: 12, color: '#8898AA', marginTop: 6 },
  footnote: { fontSize: 12, color: '#8898AA', textAlign: 'center', marginTop: 10, lineHeight: 18 },
})
