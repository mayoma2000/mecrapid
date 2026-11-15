import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../../lib/api'

// Registrar un vehículo para un cliente desde la app del taller (mismo formulario que el backoffice).
// ?customerId= obligatorio; ?name= solo para mostrar de quién es.
export default function NewVehicleScreen() {
  const { customerId, name } = useLocalSearchParams<{ customerId: string; name?: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const [form, setForm] = useState({ make: '', model: '', year: '', licensePlate: '', color: '', mileage: '', vin: '' })
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const create = useMutation({
    mutationFn: () =>
      request<{ data: { id: string } }>('/api/v1/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          make: form.make.trim(),
          model: form.model.trim(),
          year: Number(form.year),
          licensePlate: form.licensePlate.trim(),
          color: form.color.trim() || null,
          mileage: form.mileage ? Number(form.mileage) : 0,
          vin: form.vin.trim() || null,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customer-vehicles', customerId] })
      router.back()
    },
    onError: (e) => Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.'),
  })

  function submit() {
    if (!form.make.trim() || !form.model.trim()) { Alert.alert('Faltan datos', 'Marca y modelo son obligatorios.'); return }
    const year = Number(form.year)
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) { Alert.alert('Año inválido', 'Escribí el año con 4 dígitos, ej. 2018.'); return }
    if (!form.licensePlate.trim()) { Alert.alert('Falta la placa', 'La placa es obligatoria.'); return }
    create.mutate()
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>Nuevo vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {name && <Text style={styles.owner}>Cliente: {name}</Text>}
        <View style={styles.card}>
          <View style={styles.row}>
            <Field label="Marca *" value={form.make} onChange={set('make')} placeholder="Toyota" />
            <Field label="Modelo *" value={form.model} onChange={set('model')} placeholder="Hilux" />
          </View>
          <View style={styles.row}>
            <Field label="Año *" value={form.year} onChange={set('year')} placeholder="2018" keyboard="number-pad" />
            <Field label="Placa *" value={form.licensePlate} onChange={(v) => set('licensePlate')(v.toUpperCase())} placeholder="HAA 1234" autoCaps />
          </View>
          <View style={styles.row}>
            <Field label="Color" value={form.color} onChange={set('color')} placeholder="Blanco" />
            <Field label="Kilometraje" value={form.mileage} onChange={set('mileage')} placeholder="85000" keyboard="number-pad" />
          </View>
          <Field label="VIN (opcional)" value={form.vin} onChange={(v) => set('vin')(v.toUpperCase())} placeholder="17 caracteres" autoCaps />
        </View>

        <TouchableOpacity style={[styles.submit, create.isPending && { opacity: 0.5 }]} onPress={submit} disabled={create.isPending}>
          {create.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>🚗  Guardar vehículo</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, value, onChange, placeholder, keyboard, autoCaps }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
  keyboard?: 'number-pad'; autoCaps?: boolean
}) {
  return (
    <View style={{ flex: 1, marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8898AA"
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={autoCaps ? 'characters' : 'words'}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  )
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  owner: { fontSize: 14, fontWeight: '700', color: '#525F7F', marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, ...shadow },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#8898AA', marginBottom: 4 },
  input: { backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' },
  submit: { backgroundColor: '#5E72E4', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
