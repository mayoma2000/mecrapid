import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useApi } from '../lib/api'

export type MyVehicle = { id: string; make: string; model: string; year: number; licensePlate: string }

// "Otro carro / lo digo después": solo se ofrece en el SOS
export const NO_VEHICLE = 'none'

// Ventanita para que el cliente registre su carro sin salir de la pantalla en la que está
export function AddVehicleModal({ visible, onClose, onCreated }: {
  visible: boolean
  onClose: () => void
  onCreated: (v: MyVehicle) => void
}) {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ make: '', model: '', year: '', licensePlate: '' })
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      request<{ data: MyVehicle }>('/api/v1/me/vehicles', {
        method: 'POST',
        body: JSON.stringify({ ...form, year: Number(form.year) }),
      }),
    onSuccess: ({ data }) => {
      void queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
      setForm({ make: '', model: '', year: '', licensePlate: '' })
      setError('')
      onCreated(data)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.'),
  })

  function submit() {
    const year = Number(form.year)
    if (!form.make.trim() || !form.model.trim()) { setError('Escribí la marca y el modelo.'); return }
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) { setError('Escribí el año con 4 dígitos, ej. 2018.'); return }
    if (!form.licensePlate.trim()) { setError('Escribí la placa.'); return }
    setError('')
    save.mutate()
  }

  const field = (key: keyof typeof form, label: string, placeholder: string, opts?: { number?: boolean; caps?: boolean }) => (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: opts?.caps ? v.toUpperCase() : v }))}
        placeholder={placeholder}
        placeholderTextColor="#8898AA"
        keyboardType={opts?.number ? 'number-pad' : 'default'}
        autoCapitalize={opts?.caps ? 'characters' : 'words'}
        autoCorrect={false}
        maxLength={opts?.number ? 4 : 40}
        style={styles.input}
      />
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>🚗 Agregar mi vehículo</Text>
          <Text style={styles.sub}>Así el taller sabe qué carro atender y guarda su historial.</Text>
          <View style={styles.row}>{field('make', 'Marca', 'Toyota')}{field('model', 'Modelo', 'Hilux')}</View>
          <View style={styles.row}>{field('year', 'Año', '2018', { number: true })}{field('licensePlate', 'Placa', 'HAA1234', { caps: true })}</View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primary, save.isPending && { opacity: 0.6 }]} onPress={submit} disabled={save.isPending}>
            {save.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar vehículo</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={styles.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// "¿Para qué vehículo?": los carros del cliente + agregar uno ahí mismo.
// allowNone agrega la opción "Es otro carro / lo digo después" (emergencias).
export function VehiclePicker({ value, onChange, allowNone }: {
  value: string | null
  onChange: (id: string) => void
  allowNone?: boolean
}) {
  const { request } = useApi()
  const [adding, setAdding] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => request<{ data: MyVehicle[] }>('/api/v1/me/vehicles'),
  })
  const vehicles = data?.data ?? []

  return (
    <View>
      {isLoading ? <ActivityIndicator color="#5E72E4" style={{ alignSelf: 'flex-start' }} /> : (
        <View style={{ gap: 8 }}>
          {vehicles.map((v) => {
            const active = value === v.id
            return (
              <TouchableOpacity key={v.id} style={[styles.option, active && styles.optionActive]} onPress={() => onChange(v.id)}>
                <Text style={{ fontSize: 20 }}>🚗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, active && { color: '#fff' }]}>{v.make} {v.model} {v.year}</Text>
                  <Text style={[styles.optionSub, active && { color: '#E6E9FB' }]}>{v.licensePlate}</Text>
                </View>
                {active && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
              </TouchableOpacity>
            )
          })}
          {vehicles.length === 0 && (
            <Text style={styles.empty}>Todavía no tenés vehículos registrados.</Text>
          )}
          <TouchableOpacity style={styles.add} onPress={() => setAdding(true)}>
            <Text style={styles.addText}>+ Agregar mi vehículo</Text>
          </TouchableOpacity>
          {allowNone && (
            <TouchableOpacity style={[styles.option, value === NO_VEHICLE && styles.optionActive]} onPress={() => onChange(NO_VEHICLE)}>
              <Text style={[styles.optionTitle, { flex: 1 }, value === NO_VEHICLE && { color: '#fff' }]}>Es otro carro / lo digo después</Text>
              {value === NO_VEHICLE && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
      <AddVehicleModal visible={adding} onClose={() => setAdding(false)} onCreated={(v) => { setAdding(false); onChange(v.id) }} />
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14,22,48,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E1E5EE', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#172B4D' },
  sub: { fontSize: 13, color: '#8898AA', marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#525F7F', marginBottom: 6 },
  input: { backgroundColor: '#F8F9FE', borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#172B4D' },
  error: { color: '#F5365C', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  primary: { backgroundColor: '#5E72E4', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancel: { fontSize: 14, fontWeight: '700', color: '#8898AA' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E9ECEF' },
  optionActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#172B4D' },
  optionSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  empty: { fontSize: 13, color: '#8898AA' },
  add: { padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#5E72E4', alignItems: 'center' },
  addText: { fontSize: 14, fontWeight: '800', color: '#5E72E4' },
})
