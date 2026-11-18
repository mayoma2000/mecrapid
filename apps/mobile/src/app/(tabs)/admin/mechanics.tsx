import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, Switch, TouchableOpacity } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApi } from '../../../lib/api'
import { NavHeader, Card, Field, PrimaryButton, TextButton, ui } from '../../../components/ui'

type Mechanic = { id: string; name: string; email: string; phone: string | null; active: boolean }

// Cuentas de los mecánicos (mismo manejo que el backoffice): crear, activar/desactivar, contraseña
export default function MechanicsScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [pwFor, setPwFor] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [editFor, setEditFor] = useState<string | null>(null)
  const [edit, setEdit] = useState({ name: '', phone: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['mechanics', 'all'],
    queryFn: () => request<{ data: Mechanic[] }>('/api/v1/mechanics?all=1'),
    refetchInterval: false,
  })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['mechanics'] })
    void queryClient.invalidateQueries({ queryKey: ['job-board'] })
  }
  const onError = (e: unknown) => Alert.alert('Error', e instanceof Error ? e.message : 'Intentá de nuevo.')

  const create = useMutation({
    mutationFn: () => request('/api/v1/mechanics', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      Alert.alert('Cuenta creada', `${form.name} entra a la app con ${form.email} y la contraseña que pusiste.`)
      setCreating(false); setForm({ name: '', phone: '', email: '', password: '' }); refresh()
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      request(`/api/v1/mechanics/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (_d, v) => {
      if (v.body['password']) { Alert.alert('Listo', 'Contraseña actualizada.'); setPwFor(null); setNewPw('') }
      if (v.body['name'] !== undefined) setEditFor(null)
      refresh()
    },
    onError,
  })

  function toggle(m: Mechanic) {
    if (m.active) {
      Alert.alert('Desactivar', `${m.name} ya no podrá entrar ni recibir órdenes. Su historial se conserva.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: () => update.mutate({ id: m.id, body: { active: false } }) },
      ])
    } else update.mutate({ id: m.id, body: { active: true } })
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title="Mecánicos" right={!creating ? <TextButton label="+ Nuevo" onPress={() => setCreating(true)} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[ui.hint, { marginBottom: 12, marginHorizontal: 4 }]}>
          Aquí se gestionan los mecánicos. Los administradores se gestionan desde el backoffice web → Usuarios del taller.
        </Text>

        {creating && (
          <Card title="Nuevo mecánico">
            <Field label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} caps="words" flex={false} />
            <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} keyboard="phone-pad" flex={false} />
            <Field label="Correo (usuario) *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} keyboard="email-address" caps="none" flex={false} />
            <Field label="Contraseña inicial * (mín. 8)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} caps="none" flex={false} />
            <PrimaryButton label="Crear cuenta" onPress={() => create.mutate()} loading={create.isPending} disabled={!form.name || !form.email || form.password.length < 8} />
            <View style={{ alignItems: 'center', marginTop: 12 }}><TextButton label="Cancelar" color="#8898AA" onPress={() => setCreating(false)} /></View>
          </Card>
        )}

        {isLoading ? <ActivityIndicator style={{ marginTop: 30 }} color="#5E72E4" /> : (
          <Card>
            {(data?.data.length ?? 0) === 0 && <Text style={ui.hint}>Sin mecánicos registrados.</Text>}
            {data?.data.map((m, i) => (
              <View key={m.id} style={[i > 0 && ui.divider, { paddingVertical: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: m.active ? 1 : 0.5 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.title}>{m.name}</Text>
                    <Text style={ui.sub}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</Text>
                  </View>
                  <Switch value={m.active} onValueChange={() => toggle(m)} />
                </View>
                {editFor === m.id ? (
                  <View style={{ marginTop: 10 }}>
                    <Field label="Nombre" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} caps="words" flex={false} />
                    <Field label="Teléfono" value={edit.phone} onChange={(v) => setEdit({ ...edit, phone: v })} keyboard="phone-pad" flex={false} />
                    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                      <TextButton
                        label={update.isPending ? 'Guardando…' : 'Guardar'}
                        onPress={() => {
                          if (edit.name.trim().length < 3) { Alert.alert('Falta el nombre', 'Escribí el nombre completo.'); return }
                          update.mutate({ id: m.id, body: { name: edit.name.trim(), phone: edit.phone.trim() } })
                        }}
                      />
                      <TextButton label="Cancelar" color="#8898AA" onPress={() => setEditFor(null)} />
                    </View>
                  </View>
                ) : pwFor === m.id ? (
                  <View style={{ marginTop: 10 }}>
                    <Field label="Nueva contraseña (mín. 8)" value={newPw} onChange={setNewPw} caps="none" flex={false} />
                    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                      <TextButton label={update.isPending ? 'Guardando…' : 'Guardar'} onPress={() => update.mutate({ id: m.id, body: { password: newPw } })} />
                      <TextButton label="Cancelar" color="#8898AA" onPress={() => { setPwFor(null); setNewPw('') }} />
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 18, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => { setEditFor(m.id); setEdit({ name: m.name, phone: m.phone ?? '' }) }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#5E72E4' }}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setPwFor(m.id); setNewPw('') }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#5E72E4' }}>Cambiar contraseña</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
