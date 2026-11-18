import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Alert, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { NavHeader, Card, PrimaryButton, ui } from '../components/ui'

// Mi perfil: el usuario cambia su nombre y teléfono (el correo es su usuario)
export default function ProfileScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const { data: session, refetch } = useSession()
  const user = session?.user as { name?: string; email?: string; phone?: string | null } | undefined

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState((user?.phone ?? '').replace(/\D/g, ''))

  const save = useMutation({
    mutationFn: () => request('/api/v1/me/profile', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), phone }) }),
    onSuccess: async () => {
      // La sesión guarda el nombre: se vuelve a pedir para que el saludo y el menú se actualicen
      await refetch()
      void queryClient.invalidateQueries()
      Alert.alert('Listo', 'Tu perfil se actualizó.', [{ text: 'OK', onPress: () => router.back() }])
    },
    onError: (e) => Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.'),
  })

  function submit() {
    if (name.trim().length < 3) { Alert.alert('Falta el nombre', 'Escribí tu nombre completo.'); return }
    if (phone.replace(/\D/g, '').length !== 8) { Alert.alert('Teléfono inválido', 'El teléfono debe tener 8 dígitos.'); return }
    save.mutate()
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title="Mi perfil" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput value={name} onChangeText={setName} autoCapitalize="words" placeholder="Juan Pérez" placeholderTextColor="#8898AA" style={styles.input} />

          <Text style={[styles.label, { marginTop: 16 }]}>Teléfono</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}><Text style={styles.prefixText}>🇭🇳 +504</Text></View>
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={9} placeholder="9999-9999" placeholderTextColor="#8898AA" style={styles.phoneInput} />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Correo</Text>
          <Text style={styles.readonly}>{user?.email ?? '—'}</Text>
          <Text style={[ui.hint, { marginTop: 6 }]}>Es tu usuario para entrar; para cambiarlo, pedíselo al taller.</Text>
        </Card>
        <PrimaryButton label="Guardar cambios" onPress={submit} loading={save.isPending} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: '#525F7F', marginBottom: 6 },
  input: { backgroundColor: '#F8F9FE', borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#172B4D' },
  phoneRow: { flexDirection: 'row', backgroundColor: '#F8F9FE', borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 12, overflow: 'hidden' },
  prefix: { backgroundColor: '#EEF0F6', paddingHorizontal: 12, justifyContent: 'center' },
  prefixText: { fontSize: 14, fontWeight: '800', color: '#172B4D' },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#172B4D' },
  readonly: { fontSize: 15, color: '#8898AA', paddingVertical: 4 },
})
