import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../lib/api'

type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'

interface ServiceItem {
  id: string
  name: string
  description: string | null
  price: number
  quantity: number
}

interface PartItem {
  id: string
  quantity: number
  unitCost: number
  sparePart: { name: string; partNumber: string | null }
}

interface WorkOrderDetail {
  id: string
  complaint: string
  diagnosis: string | null
  status: WorkOrderStatus
  estimatedCost: number | null
  actualCost: number | null
  notes: string | null
  createdAt: string
  completedAt: string | null
  customer: { id: string; name: string; phone: string }
  vehicle: { make: string; model: string; year: number; licensePlate: string }
  serviceItems: ServiceItem[]
  partItems: PartItem[]
}

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; color: string }> = {
  pending:       { label: 'Pendiente',       bg: '#FFF5EC', color: '#FB6340' },
  assigned:      { label: 'Asignada',        bg: '#EEF0FD', color: '#5E72E4' },
  in_progress:   { label: 'En proceso',      bg: '#FFF5EC', color: '#FB6340' },
  quality_check: { label: 'Control calidad', bg: '#F5E8FF', color: '#9B59B6' },
  completed:     { label: 'Completada',      bg: '#E6FAF3', color: '#2DCE89' },
  cancelled:     { label: 'Cancelada',       bg: '#F8F9FA', color: '#8898AA' },
}

const TRANSITIONS: Partial<Record<WorkOrderStatus, { label: string; next: WorkOrderStatus; color: string }[]>> = {
  pending:       [{ label: 'Asignar',           next: 'assigned',      color: '#5E72E4' }, { label: 'Cancelar', next: 'cancelled', color: '#F5365C' }],
  assigned:      [{ label: 'Iniciar trabajo',   next: 'in_progress',   color: '#FB6340' }, { label: 'Cancelar', next: 'cancelled', color: '#F5365C' }],
  in_progress:   [{ label: 'Control calidad',   next: 'quality_check', color: '#9B59B6' }, { label: 'Cancelar', next: 'cancelled', color: '#F5365C' }],
  quality_check: [{ label: 'Completar',         next: 'completed',     color: '#2DCE89' }, { label: 'Reintentar', next: 'in_progress', color: '#FB6340' }],
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => request<{ data: WorkOrderDetail }>(`/api/v1/work-orders/${id}`),
  })

  const mutation = useMutation({
    mutationFn: (status: WorkOrderStatus) =>
      request(`/api/v1/work-orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })

  const order = data?.data

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8898AA' }}>Orden no encontrada</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cfg = STATUS_CONFIG[order.status]
  const transitions = TRANSITIONS[order.status] ?? []

  const servicesTotal = order.serviceItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const partsTotal = order.partItems.reduce((s, i) => s + i.unitCost * i.quantity, 0)
  const total = servicesTotal + partsTotal

  function handleTransition(next: WorkOrderStatus, label: string) {
    Alert.alert('Cambiar estado', `¿${label} la orden?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: label, onPress: () => mutation.mutate(next), style: next === 'cancelled' ? 'destructive' : 'default' },
    ])
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Orden de servicio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero: customer + status */}
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{order.customer.name}</Text>
            <Text style={styles.heroVehicle}>
              {order.vehicle.make} {order.vehicle.model} {order.vehicle.year} · {order.vehicle.licensePlate}
            </Text>
            <Text style={styles.heroDate}>
              {new Date(order.createdAt).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Complaint + Diagnosis */}
        <View style={styles.card}>
          <SectionHeader title="Diagnóstico" />
          <Text style={styles.fieldLabel}>Motivo de ingreso</Text>
          <Text style={styles.fieldValue}>{order.complaint}</Text>
          {order.diagnosis && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Diagnóstico técnico</Text>
              <Text style={styles.fieldValue}>{order.diagnosis}</Text>
            </>
          )}
          {order.notes && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Notas</Text>
              <Text style={styles.fieldValue}>{order.notes}</Text>
            </>
          )}
        </View>

        {/* Services */}
        {order.serviceItems.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title="Servicios" />
            {order.serviceItems.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <Divider />}
                <View style={styles.lineItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineItemName}>{item.name}</Text>
                    {item.description && <Text style={styles.lineItemDesc}>{item.description}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.lineItemPrice}>L {(item.price * item.quantity).toLocaleString()}</Text>
                    {item.quantity > 1 && (
                      <Text style={styles.lineItemQty}>{item.quantity} × L {item.price.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Parts */}
        {order.partItems.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title="Repuestos" />
            {order.partItems.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <Divider />}
                <View style={styles.lineItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineItemName}>{item.sparePart.name}</Text>
                    {item.sparePart.partNumber && (
                      <Text style={styles.lineItemDesc}>#{item.sparePart.partNumber}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.lineItemPrice}>L {(item.unitCost * item.quantity).toLocaleString()}</Text>
                    {item.quantity > 1 && (
                      <Text style={styles.lineItemQty}>{item.quantity} × L {item.unitCost.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cost summary */}
        {(order.estimatedCost != null || total > 0) && (
          <View style={styles.costCard}>
            {total > 0 && (
              <>
                {servicesTotal > 0 && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Servicios</Text>
                    <Text style={styles.costValue}>L {servicesTotal.toLocaleString()}</Text>
                  </View>
                )}
                {partsTotal > 0 && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Repuestos</Text>
                    <Text style={styles.costValue}>L {partsTotal.toLocaleString()}</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: '#E9ECEF', marginVertical: 10 }} />
                <View style={styles.costRow}>
                  <Text style={styles.costLabelTotal}>Total</Text>
                  <Text style={styles.costValueTotal}>L {total.toLocaleString()}</Text>
                </View>
              </>
            )}
            {order.estimatedCost != null && total === 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabelTotal}>Estimado</Text>
                <Text style={styles.costValueTotal}>L {order.estimatedCost.toLocaleString()}</Text>
              </View>
            )}
            {order.actualCost != null && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Costo real</Text>
                <Text style={[styles.costValue, { color: '#2DCE89' }]}>L {order.actualCost.toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        {/* State transitions */}
        {transitions.length > 0 && (
          <View style={{ gap: 10 }}>
            {transitions.map((t) => (
              <TouchableOpacity
                key={t.next}
                style={[styles.actionBtn, { backgroundColor: t.color, shadowColor: t.color }]}
                onPress={() => handleTransition(t.next, t.label)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>{t.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
      {title}
    </Text>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F2F6', marginVertical: 4 }} />
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
  heroVehicle: { fontSize: 13, color: '#525F7F', marginTop: 4 },
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
  lineItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  lineItemName: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  lineItemDesc: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  lineItemPrice: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  lineItemQty: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  costCard: {
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
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  costLabel: { fontSize: 13, color: '#8898AA', fontWeight: '600' },
  costValue: { fontSize: 13, color: '#172B4D', fontWeight: '700' },
  costLabelTotal: { fontSize: 15, color: '#172B4D', fontWeight: '800' },
  costValueTotal: { fontSize: 18, color: '#5E72E4', fontWeight: '800' },
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
