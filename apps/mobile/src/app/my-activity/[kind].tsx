import { useInfiniteQuery } from '@tanstack/react-query'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../lib/api'
import { safeDate } from '../../lib/date'
import { statusColor, statusLabel } from '../../lib/status'
import { QUOTE_STATUS, money, type Quote } from '../../lib/quotes'

type Kind = 'orders' | 'appointments' | 'assistance' | 'quotes'
type Row = {
  id: string
  title: string
  subtitle: string
  badge: { label: string; color: string; bg: string }
  href?: string
}

const PAGE = 20

// Lista completa del cliente, cargando de a 20 al bajar
const CONFIG: Record<Kind, { title: string; empty: string; path: string; toRow: (x: never) => Row }> = {
  orders: {
    title: 'Mis órdenes',
    empty: 'Sin órdenes de trabajo',
    path: '/api/v1/me/orders',
    toRow: (o: { id: string; status: string; complaint: string; createdAt: string; vehicle: { make: string; model: string } | null }) => ({
      id: o.id,
      title: o.complaint || 'Orden de trabajo',
      subtitle: `${o.vehicle ? `${o.vehicle.make} ${o.vehicle.model} · ` : ''}${safeDate(o.createdAt).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      badge: { label: statusLabel(o.status), color: statusColor(o.status), bg: statusColor(o.status) + '22' },
    }),
  },
  appointments: {
    title: 'Mis citas',
    empty: 'Sin citas',
    path: '/api/v1/me/appointments',
    toRow: (a: { id: string; status: string; scheduledAt: string; serviceType: string }) => {
      const d = safeDate(a.scheduledAt)
      return {
        id: a.id,
        title: a.serviceType || 'Cita de servicio',
        subtitle: `${d.toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}`,
        badge: { label: statusLabel(a.status), color: statusColor(a.status), bg: statusColor(a.status) + '22' },
        href: `/my-appointment/${a.id}`,
      }
    },
  },
  assistance: {
    title: 'Mis solicitudes de asistencia',
    empty: 'Sin solicitudes',
    path: '/api/v1/me/assistance-requests',
    toRow: (r: { id: string; status: string; detail: string; createdAt: string; assistanceType: { name: string } | null }) => ({
      id: r.id,
      title: r.assistanceType?.name ?? 'Asistencia',
      subtitle: `${safeDate(r.createdAt).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${r.detail}`,
      badge: { label: statusLabel(r.status), color: statusColor(r.status), bg: statusColor(r.status) + '22' },
    }),
  },
  quotes: {
    title: 'Mis cotizaciones',
    empty: 'Sin cotizaciones',
    path: '/api/v1/me/quotes',
    toRow: (q: Quote) => ({
      id: q.id,
      title: `Cotización${q.vehicle ? ` · ${q.vehicle.make} ${q.vehicle.model}` : ''}`,
      subtitle: q.status === 'sent' ? `${q.items.length} partidas · ${money(q.total)}` : `Aprobado ${money(q.approvedTotal)} de ${money(q.total)}`,
      badge: { label: QUOTE_STATUS[q.status].label, color: QUOTE_STATUS[q.status].color, bg: QUOTE_STATUS[q.status].bg },
      href: `/my-quote/${q.id}`,
    }),
  },
}

export default function MyActivityScreen() {
  const { kind } = useLocalSearchParams<{ kind: Kind }>()
  const cfg = CONFIG[kind] ?? CONFIG.orders
  const { request } = useApi()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['my-activity', kind],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      request<{ data: never[]; meta: { total: number } }>(`${cfg.path}?limit=${PAGE}&offset=${pageParam}`),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.data.length, 0)
      return loaded < last.meta.total ? loaded : undefined
    },
    // Una lista larga no se refresca sola cada 15 s; se actualiza deslizando hacia abajo
    refetchInterval: false,
  })

  const rows = data?.pages.flatMap((p) => p.data.map(cfg.toRow)) ?? []
  const total = data?.pages[0]?.meta.total ?? 0

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{cfg.title}{total ? ` (${total})` : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage() }}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
          ListEmptyComponent={<Text style={styles.empty}>{cfg.empty}</Text>}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginTop: 12 }} color="#5E72E4" /> : undefined}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              disabled={!item.href}
              onPress={() => item.href && router.push(item.href as never)}
              activeOpacity={item.href ? 0.7 : 1}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={2}>{item.subtitle}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.badge.bg }]}>
                <Text style={[styles.badgeText, { color: item.badge.color }]}>{item.badge.label}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#172B4D' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  sub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#8898AA', marginTop: 60 },
})
