import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useApi } from '../lib/api'

export default function BookAppointmentScreen() {
  const { request } = useApi()
  const insets = useSafeAreaInsets()
  const [serviceType, setServiceType] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  })
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  function fmtDate(d: Date) {
    return d.toLocaleString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  }

  async function handleSubmit() {
    if (!serviceType.trim()) { Alert.alert('Campo requerido', 'Indica el tipo de servicio.'); return }
    setSaving(true)
    try {
      await request('/api/v1/me/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: serviceType.trim(),
          scheduledAt: date.toISOString(),
          notes: notes.trim() || null,
        }),
      })
      Alert.alert('Cita solicitada', 'El taller revisará tu solicitud y te confirmará.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Agendar Cita</Text>
            <Text style={styles.subtitle}>El taller confirmará tu solicitud</Text>
          </View>
        </View>

        {/* Tipo de servicio */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de servicio *</Text>
          <TextInput
            value={serviceType}
            onChangeText={setServiceType}
            placeholder="Ej: Cambio de aceite, revisión general..."
            placeholderTextColor="#8898AA"
            style={styles.input}
          />
        </View>

        {/* Fecha y hora */}
        <View style={styles.section}>
          <Text style={styles.label}>Fecha y hora preferida</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={styles.dateText}>{fmtDate(date)}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="datetime"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selected) => {
                setShowPicker(Platform.OS === 'ios')
                if (selected) setDate(selected)
              }}
            />
          )}
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <Text style={styles.label}>Notas adicionales</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Síntomas, histórico, preferencias..."
            placeholderTextColor="#8898AA"
            multiline
            numberOfLines={3}
            style={styles.textArea}
            textAlignVertical="top"
          />
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>ℹ️  El taller te contactará para confirmar la disponibilidad antes de la cita.</Text>
        </View>

        {/* Submit */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <TouchableOpacity onPress={() => void handleSubmit()} disabled={saving} style={styles.submitBtn}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>📅  Solicitar cita</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  backText: { fontSize: 18, color: '#172B4D' },
  title: { fontSize: 22, fontWeight: '800', color: '#172B4D' },
  subtitle: { fontSize: 13, color: '#8898AA', marginTop: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#E8EAF0' },
  textArea: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', minHeight: 90, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#E8EAF0' },
  dateBtn: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#E8EAF0' },
  dateIcon: { fontSize: 20 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#172B4D', textTransform: 'capitalize' },
  infoBanner: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#EEF0FD', borderRadius: 14, padding: 14 },
  infoText: { fontSize: 12, color: '#5E72E4', fontWeight: '600', lineHeight: 18 },
  submitBtn: { backgroundColor: '#5E72E4', borderRadius: 18, paddingVertical: 16, alignItems: 'center', shadowColor: '#5E72E4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
