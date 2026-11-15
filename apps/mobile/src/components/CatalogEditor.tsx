import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch, type KeyboardTypeOptions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApi } from '../lib/api'
import { NavHeader, Card, Field, PrimaryButton, TextButton, Badge, ui } from './ui'

export type CatalogField = {
  key: string
  label: string
  placeholder?: string
  keyboard?: KeyboardTypeOptions
  number?: boolean
  multiline?: boolean
  hint?: string
}

type Item = { id: string; active: boolean } & Record<string, unknown>

// Editor genérico de catálogos del admin (servicios, tipos de asistencia, mantenimientos):
// lista con activo/inactivo, alta y edición con los campos que se le pasan
export function CatalogEditor({ title, listPath, itemPath, fields, subtitle, nameKey = 'name', invalidate = [], intro }: {
  title: string
  listPath: string
  itemPath: string
  fields: CatalogField[]
  subtitle: (item: Item) => string
  nameKey?: string
  invalidate?: string[][]
  intro?: string
}) {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', listPath],
    queryFn: () => request<{ data: Item[] }>(listPath),
    refetchInterval: false,
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['catalog', listPath] })
    for (const k of invalidate) void queryClient.invalidateQueries({ queryKey: k })
  }
  const onError = (e: unknown) => Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.')

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      for (const f of fields) {
        const v = (form[f.key] ?? '').trim()
        body[f.key] = f.number ? (v === '' ? null : Number(v.replace(',', '.'))) : v || null
      }
      return editing === 'new'
        ? request(itemPath.replace('/:id', ''), { method: 'POST', body: JSON.stringify(body) })
        : request(itemPath.replace(':id', String(editing)), { method: 'PATCH', body: JSON.stringify(body) })
    },
    onSuccess: () => { setEditing(null); refresh() },
    onError,
  })
  const toggle = useMutation({
    mutationFn: (item: Item) =>
      request(itemPath.replace(':id', item.id), { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }),
    onSuccess: refresh,
    onError,
  })

  function start(item?: Item) {
    setEditing(item?.id ?? 'new')
    setForm(Object.fromEntries(fields.map((f) => [f.key, item?.[f.key] != null ? String(item[f.key]) : ''])))
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      <NavHeader title={title} right={editing === null ? <TextButton label="+ Nuevo" onPress={() => start()} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {intro && <Text style={[ui.hint, { marginBottom: 12, marginHorizontal: 4 }]}>{intro}</Text>}

        {editing !== null && (
          <Card title={editing === 'new' ? 'Nuevo' : 'Editar'}>
            {fields.map((f) => (
              <View key={f.key}>
                <Field
                  label={f.label}
                  value={form[f.key] ?? ''}
                  onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))}
                  placeholder={f.placeholder}
                  keyboard={f.keyboard}
                  multiline={f.multiline}
                  flex={false}
                />
                {f.hint && <Text style={[ui.hint, { marginTop: -6, marginBottom: 12 }]}>{f.hint}</Text>}
              </View>
            ))}
            <PrimaryButton label="Guardar" onPress={() => save.mutate()} loading={save.isPending} />
            <View style={{ alignItems: 'center', marginTop: 12 }}><TextButton label="Cancelar" color="#8898AA" onPress={() => setEditing(null)} /></View>
          </Card>
        )}

        {isLoading ? <ActivityIndicator style={{ marginTop: 30 }} color="#5E72E4" /> : (
          <Card>
            {(data?.data.length ?? 0) === 0 && <Text style={ui.hint}>Todavía no hay registros.</Text>}
            {data?.data.map((item, i) => (
              <View key={item.id} style={[ui.listRow, i > 0 && ui.divider, !item.active && { opacity: 0.5 }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => start(item)}>
                  <Text style={ui.title}>{String(item[nameKey] ?? '')}</Text>
                  <Text style={ui.sub}>{subtitle(item)}</Text>
                </TouchableOpacity>
                {!item.active && <Badge label="Pausado" color="#8898AA" bg="#F1F2F6" />}
                <Switch value={item.active} onValueChange={() => toggle.mutate(item)} />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
