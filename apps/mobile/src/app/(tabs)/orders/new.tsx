import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'

type Customer = { id: string; name: string; phone: string }
type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string }

// Mismo formulario que el backoffice (apps/web/app/(backoffice)/work-orders/new)
export default function NewOrderScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [complaint, setComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')

  const { data: customers, isFetching: loadingCustomers } = useQuery({
    queryKey: ['customers-search', search.trim()],
    queryFn: () =>
      request<{ data: Customer[] }>(`/api/v1/customers?search=${encodeURIComponent(search.trim())}&limit=20`),
    enabled: !customer,
    refetchInterval: false,
  })

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['customer-vehicles', customer?.id],
    queryFn: () => request<{ data: Vehicle[] }>(`/api/v1/vehicles?customerId=${customer!.id}&limit=50`),
    enabled: !!customer,
  })

  const create = useMutation({
    mutationFn: () =>
      request<{ data: { id: string } }>('/api/v1/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer!.id,
          vehicleId,
          complaint: complaint.trim(),
          diagnosis: diagnosis.trim() || null,
          estimatedCost: estimatedCost ? Number(estimatedCost.replace(',', '.')) : null,
        }),
      }),
    onSuccess: ({ data }) => {
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-active'] })
      router.replace(`/(tabs)/orders/${data.id}`)
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la orden.'),
  })

  function handleSubmit() {
    if (!customer) { Alert.alert('Campo requerido', 'Selecciona un cliente.'); return }
    if (!vehicleId) { Alert.alert('Campo requerido', 'Selecciona un vehículo.'); return }
    if (!complaint.trim()) { Alert.alert('Campo requerido', 'Describe el problema.'); return }
    if (estimatedCost && Number.isNaN(Number(estimatedCost.replace(',', '.')))) {
      Alert.alert('Costo inválido', 'Escribe solo números, por ejemplo 1500.50')
      return
    }
    create.mutate()
  }

  function pickCustomer(c: Customer | null) {
    setCustomer(c)
    setVehicleId(null)
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nueva orden</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cliente */}
        <View style={styles.card}>
          <Text style={styles.label}>Cliente *</Text>
          {customer ? (
            <View style={styles.selectedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{customer.name}</Text>
                <Text style={styles.selectedSub}>{customer.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => pickCustomer(null)}>
                <Text style={styles.link}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nombre…"
                placeholderTextColor="#8898AA"
                style={styles.input}
                autoCorrect={false}
              />
              <View style={{ marginTop: 8 }}>
                {loadingCustomers && <ActivityIndicator color="#5E72E4" style={{ marginVertical: 8 }} />}
                {!loadingCustomers && (customers?.data.length ?? 0) === 0 && (
                  <Text style={styles.empty}>Sin resultados</Text>
                )}
                {customers?.data.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.option} onPress={() => pickCustomer(c)}>
                    <Text style={styles.optionName}>{c.name}</Text>
                    <Text style={styles.optionSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Vehículo */}
        {customer && (
          <View style={styles.card}>
            <Text style={styles.label}>Vehículo *</Text>
            {loadingVehicles ? (
              <ActivityIndicator color="#5E72E4" style={{ marginVertical: 8 }} />
            ) : (vehicles?.data.length ?? 0) === 0 ? (
              <Text style={styles.empty}>
                Este cliente no tiene vehículos registrados. Regístralo primero desde el backoffice.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {vehicles?.data.map((v) => {
                  const active = vehicleId === v.id
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => setVehicleId(v.id)}
                    >
                      <Text style={[styles.optionName, active && { color: '#fff' }]}>
                        {v.year} {v.make} {v.model}
                      </Text>
                      <Text style={[styles.optionSub, active && { color: '#E6E9FB' }]}>{v.licensePlate}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Detalle */}
        <View style={styles.card}>
          <Text style={styles.label}>Descripción del problema *</Text>
          <TextInput
            value={complaint}
            onChangeText={setComplaint}
            placeholder="El cliente reporta…"
            placeholderTextColor="#8898AA"
            style={[styles.input, styles.multiline]}
            multiline
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Diagnóstico inicial</Text>
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Diagnóstico preliminar…"
            placeholderTextColor="#8898AA"
            style={[styles.input, styles.multiline]}
            multiline
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Costo estimado (L.)</Text>
          <TextInput
            value={estimatedCost}
            onChangeText={setEstimatedCost}
            placeholder="0.00"
            placeholderTextColor="#8898AA"
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={create.isPending}>
          {create.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>🔧  Crear orden</Text>}
        </TouchableOpacity>
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
  label: { fontSize: 12, fontWeight: '700', color: '#525F7F', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#172B4D',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  empty: { fontSize: 13, color: '#8898AA', lineHeight: 19 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 6,
  },
  optionActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  optionName: { fontSize: 14, fontWeight: '700', color: '#172B4D' },
  optionSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedName: { fontSize: 16, fontWeight: '800', color: '#172B4D' },
  selectedSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  link: { fontSize: 14, color: '#5E72E4', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#5E72E4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
