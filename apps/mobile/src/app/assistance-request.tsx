import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { useApi } from '../lib/api'
import { useSession } from '../lib/auth-client'

type AssistanceType = { id: string; name: string; description: string | null }

export default function AssistanceRequestScreen() {
  const { request } = useApi()
  const { data: session } = useSession()
  const insets = useSafeAreaInsets()
  const [types, setTypes] = useState<AssistanceType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [phone, setPhone] = useState('')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void request<{ data: AssistanceType[] }>('/api/v1/assistance-types')
      .then(({ data }) => setTypes(data))
      .catch(() => null)
    // Pre-fill phone from session if available
    const sessionUser = session?.user as { phone?: string } | undefined
    if (sessionUser?.phone) setPhone(sessionUser.phone)
  }, [])

  async function handleGetLocation() {
    setLocLoading(true)
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Activa la ubicación en Configuración para continuar.')
      setLocLoading(false)
      return
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
    setLocLoading(false)
  }

  async function handleSubmit() {
    if (!detail.trim()) { Alert.alert('Campo requerido', 'Describe el problema.'); return }
    if (!phone.trim()) { Alert.alert('Campo requerido', 'Ingresa un número de teléfono.'); return }

    setSaving(true)
    try {
      await request('/api/v1/me/assistance-requests', {
        method: 'POST',
        body: JSON.stringify({
          assistanceTypeId: selectedTypeId,
          detail: detail.trim(),
          phone: phone.trim(),
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        }),
      })
      Alert.alert('Solicitud enviada', 'El taller recibió tu solicitud y se pondrá en contacto contigo.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar')
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
            <Text style={styles.title}>Solicitar Asistencia</Text>
            <Text style={styles.subtitle}>El taller llegará a tu ubicación</Text>
          </View>
        </View>

        {/* Tipo de asistencia */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de asistencia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {types.map((t) => (
              <TouchableOpacity key={t.id}
                onPress={() => setSelectedTypeId(t.id === selectedTypeId ? null : t.id)}
                style={[styles.typeChip, selectedTypeId === t.id && styles.typeChipSelected]}>
                <Text style={[styles.typeChipText, selectedTypeId === t.id && styles.typeChipTextSelected]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Detalle */}
        <View style={styles.section}>
          <Text style={styles.label}>Describe el problema *</Text>
          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="Ej: Pinchazo en la llanta trasera derecha en la carretera..."
            placeholderTextColor="#8898AA"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            textAlignVertical="top"
          />
        </View>

        {/* Teléfono */}
        <View style={styles.section}>
          <Text style={styles.label}>Teléfono de contacto *</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+504 9999-9999"
            placeholderTextColor="#8898AA"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.label}>Ubicación</Text>
          {coords ? (
            <View style={styles.coordsCard}>
              <Text style={styles.coordsIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.coordsText}>Ubicación capturada</Text>
                <Text style={styles.coordsSub}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
              </View>
              <TouchableOpacity onPress={() => setCoords(null)}>
                <Text style={{ color: '#F5365C', fontSize: 12, fontWeight: '700' }}>Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => void handleGetLocation()} style={styles.locBtn} disabled={locLoading}>
              {locLoading ? (
                <ActivityIndicator size="small" color="#5E72E4" />
              ) : (
                <Text style={styles.locBtnText}>📍  Usar mi ubicación actual</Text>
              )}
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>Recomendado para que el mecánico llegue rápido</Text>
        </View>

        {/* Submit */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <TouchableOpacity onPress={() => void handleSubmit()} disabled={saving} style={styles.submitBtn}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>🆘  Enviar solicitud</Text>
            )}
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
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0' },
  typeChipSelected: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  typeChipText: { fontSize: 13, fontWeight: '700', color: '#172B4D' },
  typeChipTextSelected: { color: '#fff' },
  textArea: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', minHeight: 100, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#E8EAF0' },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#172B4D', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#E8EAF0' },
  locBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#5E72E4', borderStyle: 'dashed' },
  locBtnText: { fontSize: 14, fontWeight: '700', color: '#5E72E4' },
  coordsCard: { backgroundColor: '#EEF0FD', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  coordsIcon: { fontSize: 22 },
  coordsText: { fontSize: 13, fontWeight: '700', color: '#172B4D' },
  coordsSub: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  hint: { fontSize: 11, color: '#8898AA', marginTop: 8 },
  submitBtn: { backgroundColor: '#F5365C', borderRadius: 18, paddingVertical: 16, alignItems: 'center', shadowColor: '#F5365C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
