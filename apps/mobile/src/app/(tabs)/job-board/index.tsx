import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { useSession } from '../../../lib/auth-client'
import { formatDuration, liveSeconds, useNow } from '../../../lib/format'
import { TimerControls } from '../../../components/TimerControls'

type Job = {
  id: string
  status: string
  complaint: string
  mechanicId: string | null
  customer: { id: string; name: string } | null
  vehicle: { make: string; model: string; year: number; licensePlate: string } | null
  workedSeconds: number
  runningSince: string | null
}
type Column = { mechanic: { id: string; name: string; active: boolean }; working: boolean; orders: Job[] }
type FieldJob = {
  id: string; detail: string; phone: string; latitude: number | null; longitude: number | null
  customer: { name: string } | null
  assistanceType: { name: string } | null
  vehicle: { make: string; model: string; licensePlate: string } | null
  mechanic: { name: string } | null
}
type Board = { columns: Column[]; unassigned: Job[]; serverTime: string }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:       { label: 'Pendiente',       bg: '#FFF5EC', color: '#FB6340' },
  assigned:      { label: 'Asignada',        bg: '#EEF0FD', color: '#5E72E4' },
  in_progress:   { label: 'En proceso',      bg: '#FFF5EC', color: '#FB6340' },
  quality_check: { label: 'Control calidad', bg: '#F5E8FF', color: '#9B59B6' },
}

// Admin: tablero de todo el taller agrupado por mecánico.
// Mecánico: "Mis trabajos" con los botones de iniciar/pausar/terminar a mano.
export default function JobBoardScreen() {
  const { request } = useApi()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isMechanic = role === 'mecanico'
  const now = useNow()

  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['job-board'],
    queryFn: () => request<{ data: Board }>('/api/v1/job-board'),
  })
  const board = data?.data
  const seconds = (job: Job) => liveSeconds(job, dataUpdatedAt, now)

  const myColumn = board?.columns.find((c) => c.mechanic.id === session?.user.id)

  // Asistencias en la calle: el mecánico ve las suyas; el admin, todas las que van en camino
  const queryClient = useQueryClient()
  const { data: field } = useQuery({
    queryKey: ['field-assistance', isMechanic],
    queryFn: () => request<{ data: FieldJob[] }>(`/api/v1/assistance-requests?status=en_route&limit=50${isMechanic ? '&mine=1' : ''}`),
  })
  const attend = useMutation({
    mutationFn: (id: string) => request(`/api/v1/assistance-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'attend' }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['field-assistance'] })
      void queryClient.invalidateQueries({ queryKey: ['assistance-requests'] })
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo marcar atendida.'),
  })
  const fieldJobs = field?.data ?? []

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.navigate('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isMechanic ? 'Mis trabajos' : 'Trabajo en taller'}</Text>
        </View>
        {board && !isMechanic && (
          <Text style={styles.subtitle}>
            {board.columns.filter((c) => c.working).length} de {board.columns.length} mecánicos trabajando · {board.unassigned.length} sin asignar
          </Text>
        )}
      </View>

      {isLoading || !board ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
        >
          {fieldJobs.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🆘 Asistencias en camino</Text>
              {fieldJobs.map((a) => (
                <View key={a.id} style={[styles.card, { borderColor: '#5E72E4' }]}>
                  <TouchableOpacity onPress={() => router.push(`/(tabs)/assistance/${a.id}`)}>
                    <Text style={styles.cardTitle}>{a.assistanceType?.name ?? 'Asistencia'} · {a.customer?.name ?? '—'}</Text>
                    <Text style={styles.cardSub}>
                      {a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} · ${a.vehicle.licensePlate}` : 'Vehículo no indicado'}
                      {!isMechanic && a.mechanic ? ` · ${a.mechanic.name}` : ''}
                    </Text>
                    <Text style={styles.complaint} numberOfLines={2}>{a.detail}</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {a.latitude != null && a.longitude != null && (
                      <TouchableOpacity style={styles.fieldBtn} onPress={() => { void Linking.openURL(`https://maps.google.com/?q=${a.latitude},${a.longitude}`) }}>
                        <Text style={styles.fieldBtnText}>📍 Ubicación</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.fieldBtn} onPress={() => { void Linking.openURL(`tel:${a.phone}`) }}>
                      <Text style={styles.fieldBtnText}>📞 Llamar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.fieldBtn, { backgroundColor: '#2DCE89', borderColor: '#2DCE89' }]}
                      disabled={attend.isPending}
                      onPress={() => Alert.alert('Marcar atendida', '¿Ya se resolvió en el lugar?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Sí, atendida', onPress: () => attend.mutate(a.id) },
                      ])}
                    >
                      <Text style={[styles.fieldBtnText, { color: '#fff' }]}>✅ Atendida</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {isMechanic ? (
            <>
              {(myColumn?.orders.length ?? 0) === 0 && (
                <Empty icon="🧰" text="No tenés órdenes asignadas" />
              )}
              {myColumn?.orders.map((job) => (
                <JobCard key={job.id} job={job} seconds={seconds(job)} withControls />
              ))}
              {board.unassigned.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Sin asignar · podés tomarlas</Text>
                  {board.unassigned.map((job) => (
                    <JobCard key={job.id} job={job} seconds={seconds(job)} withControls />
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {board.unassigned.length > 0 && (
                <Section title="Sin asignar" subtitle={`${board.unassigned.length} órdenes`} dot="#FB6340">
                  {board.unassigned.map((job) => <JobCard key={job.id} job={job} seconds={seconds(job)} />)}
                </Section>
              )}
              {board.columns.length === 0 && (
                <Empty icon="👷" text="Todavía no hay mecánicos. Agregalos desde el backoffice → Mecánicos." />
              )}
              {board.columns.map((col) => (
                <Section
                  key={col.mechanic.id}
                  title={col.mechanic.name}
                  subtitle={col.working ? 'Trabajando ahora' : col.orders.length ? 'En pausa' : 'Libre'}
                  dot={col.working ? '#2DCE89' : '#C9CED6'}
                >
                  {col.orders.length === 0
                    ? <Text style={styles.emptyInline}>Sin órdenes abiertas</Text>
                    : col.orders.map((job) => <JobCard key={job.id} job={job} seconds={seconds(job)} />)}
                </Section>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Section({ title, subtitle, dot, children }: { title: string; subtitle: string; dot: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
        <Text style={styles.sectionName}>{title}</Text>
        <Text style={styles.sectionSub}>· {subtitle}</Text>
      </View>
      {children}
    </View>
  )
}

function JobCard({ job, seconds, withControls }: { job: Job; seconds: number; withControls?: boolean }) {
  const cfg = STATUS[job.status] ?? STATUS.pending!
  const running = !!job.runningSince
  return (
    <View style={[styles.card, running && styles.cardRunning]}>
      <TouchableOpacity onPress={() => router.push(`/(tabs)/orders/${job.id}`)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {job.vehicle ? `${job.vehicle.make} ${job.vehicle.model} ${job.vehicle.year}` : 'Sin vehículo'}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {job.vehicle?.licensePlate ? `${job.vehicle.licensePlate} · ` : ''}{job.customer?.name ?? '—'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.complaint} numberOfLines={2}>{job.complaint}</Text>
        <Text style={[styles.time, running && { color: '#2DCE89' }]}>
          {running ? '● ' : '⏱ '}{formatDuration(seconds)}
        </Text>
      </TouchableOpacity>
      {withControls && (
        <View style={{ marginTop: 12 }}>
          <TimerControls orderId={job.id} status={job.status} running={running} hasWorked={job.workedSeconds > 0} compact />
        </View>
      )}
    </View>
  )
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <Text style={{ fontSize: 44, marginBottom: 10 }}>{icon}</Text>
      <Text style={{ color: '#8898AA', fontSize: 14, textAlign: 'center' }}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#172B4D' },
  subtitle: { fontSize: 13, color: '#8898AA', marginTop: 10 },
  backBtn: {
    width: 38,
    height: 38,
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
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  sectionName: { fontSize: 16, fontWeight: '800', color: '#172B4D' },
  sectionSub: { fontSize: 13, color: '#8898AA' },
  emptyInline: { fontSize: 13, color: '#8898AA', paddingVertical: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  fieldBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E9ECEF', backgroundColor: '#fff' },
  fieldBtnText: { fontSize: 13, fontWeight: '800', color: '#172B4D' },
  cardRunning: { borderColor: '#2DCE89' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  cardSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  complaint: { fontSize: 13, color: '#525F7F', marginTop: 10, lineHeight: 18 },
  time: { fontSize: 13, fontWeight: '800', color: '#8898AA', marginTop: 10, fontVariant: ['tabular-nums'] },
})
