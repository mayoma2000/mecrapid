import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, Text, Alert, ActivityIndicator, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../lib/api'
import { NavHeader, Card, Field, PrimaryButton, ui } from '../../../components/ui'

type Customer = { id: string; name: string; phone: string; email: string | null; address: string | null; notes: string | null }
type Form = { name: string; phone: string; email: string; address: string; notes: string }

const fromCustomer = (c: Customer): Form => ({
  name: c.name, phone: c.phone, email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '',
})

// Crear cliente (sin ?id) o editarlo (?id=). Mismos campos que el backoffice.
export default function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const editing = !!id
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState<Form | null>(editing ? null : { name: '', phone: '', email: '', address: '', notes: '' })

  const { isLoading } = useQuery({
    queryKey: ['customer-form', id],
    queryFn: async () => {
      const res = await request<{ data: Customer }>(`/api/v1/customers/${id}`)
      setForm((f) => f ?? fromCustomer(res.data))
      return res
    },
    enabled: editing,
    refetchInterval: false,
  })

  const save = useMutation({
    mutationFn: () =>
      request<{ data: Customer }>(editing ? `/api/v1/customers/${id}` : '/api/v1/customers', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: form!.name.trim(),
          phone: form!.phone.trim(),
          email: form!.email.trim() || null,
          address: form!.address.trim() || null,
          notes: form!.notes.trim() || null,
        }),
      }),
    onSuccess: ({ data }) => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['customer', data.id] })
      void queryClient.invalidateQueries({ queryKey: ['customers-count'] })
      if (editing) router.back()
      else router.replace(`/(tabs)/customers/${data.id}`)
    },
    onError: (e) => Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.'),
  })

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  function submit() {
    if (!form!.name.trim()) { Alert.alert('Falta el nombre', 'El nombre es obligatorio.'); return }
    if (form!.phone.replace(/\D/g, '').length < 8) { Alert.alert('Teléfono inválido', 'Escribí al menos 8 dígitos, ej. 9999-9999.'); return }
    if (form!.email.trim() && !/^\S+@\S+\.\S+$/.test(form!.email.trim())) { Alert.alert('Correo inválido', 'Revisá el correo.'); return }
    save.mutate()
  }

  if (editing && (isLoading || !form)) {
    return <SafeAreaView style={ui.screen} edges={['top']}><View style={ui.center}><ActivityIndicator size="large" color="#5E72E4" /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title={editing ? 'Editar cliente' : 'Nuevo cliente'} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Nombre *" value={form!.name} onChange={set('name')} placeholder="Juan Pérez" caps="words" flex={false} />
          <Field label="Teléfono *" value={form!.phone} onChange={set('phone')} placeholder="9999-9999" keyboard="phone-pad" flex={false} />
          <Field label="Correo" value={form!.email} onChange={set('email')} placeholder="cliente@correo.com" keyboard="email-address" caps="none" flex={false} />
          <Text style={[ui.hint, { marginTop: -6, marginBottom: 12 }]}>
            Con el mismo correo con el que el cliente entra a la app, ve sus órdenes, citas y cotizaciones.
          </Text>
          <Field label="Dirección" value={form!.address} onChange={set('address')} placeholder="Barrio, ciudad" flex={false} />
          <Field label="Notas" value={form!.notes} onChange={set('notes')} placeholder="Preferencias, referencias…" multiline flex={false} />
        </Card>
        <PrimaryButton label={editing ? 'Guardar cambios' : '👤  Crear cliente'} onPress={submit} loading={save.isPending} />
      </ScrollView>
    </SafeAreaView>
  )
}
