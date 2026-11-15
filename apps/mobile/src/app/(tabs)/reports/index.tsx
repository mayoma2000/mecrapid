import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { money } from '../../../lib/quotes'

type Report = {
  kpis: {
    revenue: number; orders: number; avgTicket: number; vehicles: number; quoteApprovalRate: number | null
    change: { revenue: number | null; orders: number | null; avgTicket: number | null; vehicles: number | null }
  }
  monthly: { month: string; label: string; revenue: number; orders: number }[]
  mechanics: { id: string; name: string; orders: number; hours: number; revenue: number }[]
  topServices: { name: string; count: number; amount: number }[]
}

const RANGES = [{ m: 1, l: 'Mes' }, { m: 3, l: '3 meses' }, { m: 6, l: '6 meses' }, { m: 12, l: '12 meses' }]
// Serie única: el mismo azul validado del backoffice
const BLUE = '#2a78d6'

// Reportes del taller (solo admin): lo mismo que el backoffice, en formato de lista
export default function ReportsScreen() {
  const { request } = useApi()
  const [months, setMonths] = useState(6)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports', months],
    queryFn: () => request<{ data: Report }>(`/api/v1/reports?months=${months}`),
    refetchInterval: false,
  })
  const r = data?.data
  const maxMonth = Math.max(1, ...(r?.monthly.map((x) => x.revenue) ?? [0]))
  const maxSvc = Math.max(1, ...(r?.topServices.map((x) => x.count) ?? [0]))

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.navigate('/')} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
          <Text style={styles.title}>Reportes</Text>
        </View>
        <View style={styles.segment}>
          {RANGES.map((x) => (
            <TouchableOpacity key={x.m} onPress={() => setMonths(x.m)} style={[styles.segBtn, months === x.m && styles.segBtnActive]}>
              <Text style={[styles.segText, months === x.m && styles.segTextActive]}>{x.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading || !r ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
        >
          <View style={styles.kpiGrid}>
            <Kpi label="Ingresos" value={money(r.kpis.revenue)} change={r.kpis.change.revenue} />
            <Kpi label="Ticket promedio" value={money(r.kpis.avgTicket)} change={r.kpis.change.avgTicket} />
            <Kpi label="Órdenes completadas" value={String(r.kpis.orders)} change={r.kpis.change.orders} />
            <Kpi label="Carros atendidos" value={String(r.kpis.vehicles)} change={r.kpis.change.vehicles} />
          </View>
          {r.kpis.quoteApprovalRate != null && (
            <Text style={styles.note}>Los clientes aprueban el {r.kpis.quoteApprovalRate}% de las partidas cotizadas.</Text>
          )}

          <Card title="Ingresos por mes">
            {r.monthly.map((m) => (
              <View key={m.month} style={styles.barRow}>
                <Text style={styles.barLabel}>{m.label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(m.revenue / maxMonth) * 100}%` }]} /></View>
                <Text style={styles.barValue}>{m.revenue > 0 ? money(m.revenue) : '—'}</Text>
              </View>
            ))}
          </Card>

          <Card title="Productividad por mecánico">
            {r.mechanics.length === 0 ? <Text style={styles.empty}>Sin mecánicos</Text> : r.mechanics.map((m) => (
              <View key={m.id} style={styles.listRow}>
                <Text style={styles.listName}>{m.name}</Text>
                <Text style={styles.listSub}>{m.orders} órdenes · {m.hours.toLocaleString('es-HN')} h · {money(m.revenue)}</Text>
              </View>
            ))}
          </Card>

          <Card title="Servicios más vendidos">
            {r.topServices.length === 0 ? <Text style={styles.empty}>Todavía no hay servicios en órdenes completadas</Text> : r.topServices.map((s) => (
              <View key={s.name} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={styles.listName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.listSub}>{s.count} · {money(s.amount)}</Text>
                </View>
                <View style={[styles.barTrack, { marginTop: 5 }]}><View style={[styles.barFill, { width: `${(s.count / maxSvc) * 100}%` }]} /></View>
              </View>
            ))}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Kpi({ label, value, change }: { label: string; value: string; change: number | null }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.kpiChange}>{change == null ? 'sin período anterior' : `${change > 0 ? '▲ +' : change < 0 ? '▼ ' : '■ '}${change}%`}</Text>
    </View>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#172B4D' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  segment: { flexDirection: 'row', backgroundColor: '#ECEEF4', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { fontSize: 13, fontWeight: '700', color: '#8898AA' },
  segTextActive: { color: '#172B4D' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, ...shadow },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#8898AA' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#172B4D', marginTop: 4, fontVariant: ['tabular-nums'] },
  kpiChange: { fontSize: 11, color: '#8898AA', marginTop: 3 },
  note: { fontSize: 13, color: '#525F7F', marginTop: 12, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 16, ...shadow },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#172B4D', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  barLabel: { width: 52, fontSize: 12, color: '#525F7F', textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F1F2F6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: BLUE, borderRadius: 4 },
  barValue: { width: 92, fontSize: 12, color: '#172B4D', fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  listRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F2F6' },
  listName: { fontSize: 14, fontWeight: '700', color: '#172B4D', flexShrink: 1 },
  listSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  empty: { fontSize: 13, color: '#8898AA' },
})
