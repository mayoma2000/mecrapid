import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Linking, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { QUOTE_STATUS, money, type Quote } from '../../../lib/quotes'
import { waMessages, whatsappLink } from '../../../lib/whatsapp'

type Row = {
  id: string; status: Quote['status']; workOrderId: string; itemsCount: number; total: number; approvedTotal: number
  waitingDays: number | null; respondedVia: string | null
  customer: { name: string; phone: string } | null
  vehicle: { make: string; model: string; licensePlate: string } | null
}
type Page = { data: Row[]; meta: { total: number; counts: Record<string, number> } }

const TABS = [
  { key: 'sent', label: 'Esperando' },
  { key: 'draft', label: 'Borradores' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'partially_approved', label: 'En parte' },
  { key: 'rejected', label: 'Rechazadas' },
]
const PAGE = 30

// Seguimiento de cotizaciones del taller (se crean desde cada orden)
export default function QuotesScreen() {
  const { request } = useApi()
  const [tab, setTab] = useState('sent')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['quotes-list', tab],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => request<Page>(`/api/v1/quotes?status=${tab}&limit=${PAGE}&offset=${pageParam}`),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.data.length, 0)
      return loaded < last.meta.total ? loaded : undefined
    },
  })
  const rows = data?.pages.flatMap((p) => p.data) ?? []
  const counts = data?.pages[0]?.meta.counts ?? {}

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.navigate('/')} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
          <Text style={styles.title}>Cotizaciones</Text>
        </View>
        <Text style={{ fontSize: 13, color: '#8898AA', marginTop: 8 }}>Seguimiento de todas. Se crean desde cada orden de trabajo.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                  {t.label}{counts[t.key] ? ` ${counts[t.key]}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage() }}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
          ListEmptyComponent={
            <Text style={styles.empty}>{tab === 'sent' ? 'Ninguna cotización esperando respuesta 🎉' : 'Sin cotizaciones en esta categoría'}</Text>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginTop: 12 }} color="#5E72E4" /> : undefined}
          renderItem={({ item: q }) => {
            const st = QUOTE_STATUS[q.status]
            const late = q.status === 'sent' && (q.waitingDays ?? 0) >= 3
            const wa = q.status === 'sent' && q.customer
              ? whatsappLink(q.customer.phone, waMessages.quoteReady(q.customer.name, q.vehicle ? `su ${q.vehicle.make} ${q.vehicle.model}` : 'su vehículo', money(q.total)))
              : null
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/orders/quotes/${q.id}`)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{q.customer?.name ?? '—'}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {q.vehicle ? `${q.vehicle.make} ${q.vehicle.model} · ${q.vehicle.licensePlate}` : 'Sin vehículo'} · {q.itemsCount} partidas
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={styles.total}>
                    {q.status === 'sent' || q.status === 'draft' ? money(q.total) : `${money(q.approvedTotal)} de ${money(q.total)}`}
                  </Text>
                  {q.status === 'sent' && (
                    <Text style={[styles.waiting, late && { color: '#F5365C' }]}>
                      {q.waitingDays === 0 ? 'Enviada hoy' : `Esperando ${q.waitingDays} ${q.waitingDays === 1 ? 'día' : 'días'}`}
                    </Text>
                  )}
                </View>
                {wa && (
                  <TouchableOpacity style={styles.waBtn} onPress={() => { void Linking.openURL(wa) }}>
                    <Text style={styles.waText}>💬 Recordarle por WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#172B4D' },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#5E72E4' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#8898AA' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5,
  },
  name: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  sub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  total: { fontSize: 15, fontWeight: '800', color: '#5E72E4' },
  waiting: { fontSize: 12, fontWeight: '700', color: '#8898AA' },
  waBtn: { marginTop: 12, backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  waText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#8898AA', marginTop: 60 },
})
