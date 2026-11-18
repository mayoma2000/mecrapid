import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { safeDate } from '../../../lib/date'

// Asistencia = atención afuera del taller: Pendiente → En camino → Atendida (o Cancelada)
type AssistanceStatus = 'pending' | 'en_route' | 'attended' | 'cancelled'

interface AssistanceRequestDetail {
  id: string
  detail: string
  phone: string
  status: AssistanceStatus
  createdAt: string
  latitude: number | null
  longitude: number | null
  workOrderId: string | null
  customer: { id: string; name: string; email: string | null; phone: string } | null
  assistanceType: { name: string; description: string | null } | null
  vehicle: { make: string; model: string; year: number; licensePlate: string } | null
  mechanic: { id: string; name: string } | null
}

type Action = { label: string; color: string; body: { action?: 'attend' | 'create_order'; status?: AssistanceStatus }; destructive?: boolean; confirm?: string }

const STATUS_CONFIG: Record<AssistanceStatus, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: '#FFF5EC', color: '#FB6340' },
  en_route:  { label: 'En camino',  bg: '#EEF0FD', color: '#5E72E4' },
  attended:  { label: 'Atendida',   bg: '#E6FAF3', color: '#2DCE89' },
  cancelled: { label: 'Cancelada',  bg: '#F8F9FA', color: '#8898AA' },
}

// Mismas acciones que el backoffice. "Aceptar y enviar" se hace con los chips de mecánico (arriba).
function actionsFor(req: AssistanceRequestDetail): Action[] {
  const actions: Action[] = []
  if (req.status === 'en_route') {
    actions.push({ label: '✅ Marcar atendida', color: '#2DCE89', body: { action: 'attend' } })
  }
  if (req.status !== 'cancelled' && !req.workOrderId) {
    actions.push({
      label: '🏁 Llevar al taller (crear orden)', color: '#5E72E4', body: { action: 'create_order' },
      confirm: 'Se crea una orden de trabajo con este cliente, vehículo y problema.',
    })
  }
  if (req.status === 'pending' || req.status === 'en_route') {
    actions.push({ label: 'Cancelar solicitud', color: '#F5365C', body: { status: 'cancelled' }, destructive: true })
  }
  if (req.status === 'cancelled') {
    actions.push({ label: 'Reactivar (volver a pendiente)', color: '#FB6340', body: { status: 'pending' } })
  }
  return actions
}

export default function AssistanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['assistance-request', id],
    queryFn: () => request<{ data: AssistanceRequestDetail }>(`/api/v1/assistance-requests/${id}`),
  })

  const { data: mechanics } = useQuery({
    queryKey: ['mechanics'],
    queryFn: () => request<{ data: { id: string; name: string }[] }>('/api/v1/mechanics'),
    refetchInterval: false,
  })

  const mutation = useMutation({
    mutationFn: (body: Action['body'] | { action: 'accept'; mechanicId: string }) =>
      request<{ data?: { workOrderId?: string } }>(`/api/v1/assistance-requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (res, body) => {
      // "Llevar al taller" abre la orden recién creada
      if ('action' in body && body.action === 'create_order' && res.data?.workOrderId) router.push(`/(tabs)/orders/${res.data.workOrderId}`)
      void queryClient.invalidateQueries({ queryKey: ['assistance-request', id] })
      void queryClient.invalidateQueries({ queryKey: ['assistance-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['assistance-pending'] })
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar la solicitud.'),
  })

  const req = data?.data

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    )
  }

  if (!req) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8898AA' }}>Solicitud no encontrada</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
  const hasLocation = req.latitude != null && req.longitude != null

  function handleAction(a: Action) {
    Alert.alert(a.label, a.confirm ?? '¿Confirmas esta acción?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí', style: a.destructive ? 'destructive' : 'default', onPress: () => mutation.mutate(a.body) },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Solicitud de asistencia</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{req.customer?.name ?? '—'}</Text>
            <Text style={styles.heroSub}>{req.assistanceType?.name ?? 'Asistencia'}</Text>
            <Text style={styles.heroDate}>
              {safeDate(req.createdAt).toLocaleString('es-HN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Mecánico</Text>
          <Text style={[styles.fieldValue, { marginBottom: 12 }]}>{req.mechanic?.name ?? 'Sin asignar'}</Text>
          <Text style={styles.fieldLabel}>Vehículo</Text>
          <Text style={[styles.fieldValue, { marginBottom: 12 }]}>
            {req.vehicle ? `${req.vehicle.make} ${req.vehicle.model} ${req.vehicle.year} · ${req.vehicle.licensePlate}` : 'No indicado'}
          </Text>
          <Text style={styles.fieldLabel}>Detalle</Text>
          <Text style={styles.fieldValue}>{req.detail}</Text>
          {req.assistanceType?.description && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Descripción del tipo</Text>
              <Text style={styles.fieldValue}>{req.assistanceType.description}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Contacto</Text>
          <TouchableOpacity onPress={() => { void Linking.openURL(`tel:${req.phone}`) }}>
            <Text style={styles.link}>📞 {req.phone}</Text>
          </TouchableOpacity>
          {req.customer?.email && <Text style={[styles.fieldValue, { marginTop: 6 }]}>{req.customer.email}</Text>}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Ubicación</Text>
          {hasLocation ? (
            <TouchableOpacity onPress={() => { void Linking.openURL(`https://maps.google.com/?q=${req.latitude},${req.longitude}`) }}>
              <Text style={styles.link}>📍 Ver en Maps ({req.latitude!.toFixed(5)}, {req.longitude!.toFixed(5)})</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.fieldValue}>No proporcionada</Text>
          )}
        </View>

        {req.workOrderId && (
          <TouchableOpacity style={styles.orderLink} onPress={() => router.push(`/(tabs)/orders/${req.workOrderId}`)}>
            <Text style={styles.orderLinkTitle}>Orden de trabajo generada</Text>
            <Text style={styles.link}>Ver orden #{req.workOrderId.slice(0, 8).toUpperCase()} →</Text>
          </TouchableOpacity>
        )}

        <View style={{ gap: 10 }}>
          {req.status === 'pending' && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>¿Qué mecánico va?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {(mechanics?.data ?? []).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.mechChip}
                    disabled={mutation.isPending}
                    onPress={() => Alert.alert('Aceptar y enviar', `¿Enviar a ${m.name}? El cliente recibe el aviso de que van en camino.`, [
                      { text: 'No', style: 'cancel' },
                      { text: 'Enviar', onPress: () => mutation.mutate({ action: 'accept', mechanicId: m.id }) },
                    ])}
                  >
                    <Text style={styles.mechChipText}>🚗 {m.name}</Text>
                  </TouchableOpacity>
                ))}
                {(mechanics?.data.length ?? 0) === 0 && <Text style={styles.fieldValue}>No hay mecánicos activos.</Text>}
              </View>
            </View>
          )}
          {actionsFor(req).map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionBtn, { backgroundColor: a.color, shadowColor: a.color }]}
              onPress={() => handleAction(a)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>{a.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
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
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  heroName: { fontSize: 20, fontWeight: '800', color: '#172B4D' },
  heroSub: { fontSize: 13, color: '#525F7F', marginTop: 4 },
  heroDate: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  fieldLabel: { fontSize: 11, color: '#8898AA', fontWeight: '600', marginBottom: 4 },
  fieldValue: { fontSize: 14, color: '#172B4D', lineHeight: 20 },
  link: { fontSize: 14, color: '#5E72E4', fontWeight: '700', lineHeight: 20 },
  orderLink: {
    backgroundColor: '#EEF0FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  orderLinkTitle: { fontSize: 13, fontWeight: '700', color: '#172B4D', marginBottom: 4 },
  mechChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#5E72E4' },
  mechChipText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
