import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApi } from '../../../lib/api'
import { NavHeader, Card, PrimaryButton, ui } from '../../../components/ui'

type Row = { dayOfWeek: number; startHour: number; endHour: number; active: boolean }
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`

// Horario del taller: define qué días y horas puede agendar el cliente
export default function ScheduleScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [rows, setRows] = useState<Row[] | null>(null)

  const { isLoading } = useQuery({
    queryKey: ['work-schedule', 'edit'],
    queryFn: async () => {
      const res = await request<{ data: Row[] }>('/api/v1/work-schedule')
      // Siempre los 7 días, aunque en la base falte alguno
      setRows(DAYS.map((_, d) => res.data.find((r) => r.dayOfWeek === d) ?? { dayOfWeek: d, startHour: 8, endHour: 17, active: d >= 1 && d <= 5 }))
      return res
    },
    refetchInterval: false,
  })

  const save = useMutation({
    mutationFn: () => request('/api/v1/work-schedule', { method: 'PUT', body: JSON.stringify(rows) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['work-schedule'] })
      Alert.alert('Guardado', 'El horario ya rige para las citas nuevas.')
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.'),
  })

  const patch = (d: number, p: Partial<Row>) => setRows((rs) => rs!.map((r) => (r.dayOfWeek === d ? { ...r, ...p } : r)))

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title="Horario del taller" />
      {isLoading || !rows ? <ActivityIndicator style={{ marginTop: 40 }} color="#5E72E4" /> : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <Card>
            {rows.map((r, i) => (
              <View key={r.dayOfWeek} style={[{ paddingVertical: 12 }, i > 0 && ui.divider]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[ui.title, { flex: 1 }]}>{DAYS[r.dayOfWeek]}</Text>
                  <Text style={[ui.sub, { marginRight: 8 }]}>{r.active ? 'Abierto' : 'Cerrado'}</Text>
                  <Switch value={r.active} onValueChange={(v) => patch(r.dayOfWeek, { active: v })} />
                </View>
                {r.active && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <Stepper label="Abre" value={r.startHour} onChange={(h) => patch(r.dayOfWeek, { startHour: Math.min(h, r.endHour - 1) })} />
                    <Stepper label="Cierra" value={r.endHour} onChange={(h) => patch(r.dayOfWeek, { endHour: Math.max(h, r.startHour + 1) })} />
                  </View>
                )}
              </View>
            ))}
          </Card>
          <PrimaryButton label="Guardar horario" onPress={() => save.mutate()} loading={save.isPending} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (h: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.stepValue}>{fmt(value)}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(24, value + 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stepper: { flex: 1, backgroundColor: '#F8F9FE', borderRadius: 12, padding: 10 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: '#8898AA', marginBottom: 6 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E9ECEF' },
  stepBtnText: { fontSize: 18, fontWeight: '800', color: '#5E72E4' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#172B4D' },
})
