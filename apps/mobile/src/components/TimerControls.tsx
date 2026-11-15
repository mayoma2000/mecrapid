import { useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { useApi } from '../lib/api'

type Props = {
  orderId: string
  status: string
  running: boolean
  hasWorked: boolean
  compact?: boolean
}

// Iniciar / Pausar / Terminar el trabajo de una orden (POST /work-orders/:id/timer)
export function TimerControls({ orderId, status, running, hasWorked, compact }: Props) {
  const { request } = useApi()
  const queryClient = useQueryClient()

  const timer = useMutation({
    mutationFn: (action: 'start' | 'pause' | 'finish') =>
      request(`/api/v1/work-orders/${orderId}/timer`, { method: 'POST', body: JSON.stringify({ action }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['work-order', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['job-board'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-active'] })
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar el trabajo.'),
  })

  if (status === 'completed' || status === 'cancelled') return null

  function finish() {
    Alert.alert('Terminar trabajo', '¿El carro pasa a control de calidad?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, terminar', onPress: () => timer.mutate('finish') },
    ])
  }

  const btn = compact ? styles.btnCompact : styles.btn
  const txt = compact ? styles.txtCompact : styles.txt

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {running ? (
        <TouchableOpacity style={[btn, { backgroundColor: '#FB6340' }]} onPress={() => timer.mutate('pause')} disabled={timer.isPending}>
          {timer.isPending ? <ActivityIndicator color="#fff" /> : <Text style={txt}>⏸ Pausar</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[btn, { backgroundColor: '#2DCE89' }]} onPress={() => timer.mutate('start')} disabled={timer.isPending}>
          {timer.isPending ? <ActivityIndicator color="#fff" /> : <Text style={txt}>▶ {hasWorked ? 'Reanudar' : 'Iniciar'}</Text>}
        </TouchableOpacity>
      )}
      {status === 'in_progress' && (
        <TouchableOpacity style={[btn, { backgroundColor: '#9B59B6' }]} onPress={finish} disabled={timer.isPending}>
          <Text style={txt}>✓ Terminar</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  btn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnCompact: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  txt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  txtCompact: { color: '#fff', fontSize: 13, fontWeight: '800' },
})
