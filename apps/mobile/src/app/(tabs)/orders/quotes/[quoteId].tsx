import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Switch,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../../lib/api'
import { formatShortDateTime } from '../../../../lib/format'
import { PRIORITY, QUOTE_STATUS, money, type Quote, type QuoteItem } from '../../../../lib/quotes'

type Draft = Omit<QuoteItem, 'id' | 'decision'> & { key: string; qty: string; price: string }
type ServiceType = { id: string; name: string; price: number | null }

let seq = 0
const newKey = () => `k${++seq}`

const toDraft = (i: QuoteItem): Draft => ({
  key: newKey(), kind: i.kind, description: i.description, priority: i.priority,
  quantity: i.quantity, unitPrice: i.unitPrice, qty: String(i.quantity), price: String(i.unitPrice),
})
const num = (s: string) => Number(s.replace(',', '.'))

// Cotización desde el celular del taller: armar el borrador, enviarlo al cliente
// y, si el cliente respondió por teléfono, registrar su respuesta
export default function QuoteEditorScreen() {
  const { quoteId } = useLocalSearchParams<{ quoteId: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const [items, setItems] = useState<Draft[] | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [withTax, setWithTax] = useState<boolean | null>(null)
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [responseNote, setResponseNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => request<{ data: Quote }>(`/api/v1/quotes/${quoteId}`),
    // Mientras se edita no se refresca solo, para no pisar lo que se está escribiendo
    refetchInterval: (q) => (q.state.data?.data.status === 'draft' ? false : 15_000),
  })
  const { data: catalog } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => request<{ data: ServiceType[] }>('/api/v1/service-types'),
    refetchInterval: false,
  })

  const quote = data?.data
  // El borrador local arranca con lo que trae el servidor
  const draftItems = items ?? quote?.items.map(toDraft) ?? []
  const draftNotes = notes ?? quote?.notes ?? ''
  const draftTax = withTax ?? (quote ? quote.taxRate > 0 : true)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
    void queryClient.invalidateQueries({ queryKey: ['quotes', quote?.workOrderId] })
    void queryClient.invalidateQueries({ queryKey: ['work-order', quote?.workOrderId] })
  }
  const onError = (e: unknown) => Alert.alert('Error', e instanceof Error ? e.message : 'Algo salió mal.')

  const save = useMutation({
    mutationFn: () =>
      request(`/api/v1/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: draftNotes,
          taxRate: draftTax ? 0.15 : 0,
          items: draftItems.map((d) => ({ kind: d.kind, description: d.description, priority: d.priority, quantity: num(d.qty), unitPrice: num(d.price) })),
        }),
      }),
    onError,
  })

  const send = useMutation({
    mutationFn: async () => {
      await save.mutateAsync()
      return request(`/api/v1/quotes/${quoteId}/send`, { method: 'POST' })
    },
    onSuccess: () => { setItems(null); invalidate(); Alert.alert('Enviada', 'El cliente ya la puede aprobar desde su app.') },
    onError,
  })

  const remove = useMutation({
    mutationFn: () => request(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate(); router.back() },
    onError,
  })

  const respond = useMutation({
    mutationFn: () =>
      request(`/api/v1/quotes/${quoteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ note: responseNote, decisions: Object.entries(decisions).map(([itemId, decision]) => ({ itemId, decision })) }),
      }),
    onSuccess: () => { invalidate(); Alert.alert('Registrada', 'Lo aprobado ya está en la orden.') },
    onError,
  })

  if (isLoading || !quote) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          {isLoading ? <ActivityIndicator size="large" color="#5E72E4" /> : <Text style={{ color: '#8898AA' }}>Cotización no encontrada</Text>}
        </View>
      </SafeAreaView>
    )
  }

  const draft = quote.status === 'draft'
  const st = QUOTE_STATUS[quote.status]
  const taxRate = draft ? (draftTax ? 0.15 : 0) : quote.taxRate
  const subtotal = draft ? draftItems.reduce((s, d) => s + (num(d.qty) || 0) * (num(d.price) || 0), 0) : quote.subtotal
  const busy = save.isPending || send.isPending || remove.isPending || respond.isPending

  const patchItem = (key: string, patch: Partial<Draft>) =>
    setItems(draftItems.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const addItem = (kind: Draft['kind'], description = '', price = 0) =>
    setItems([...draftItems, { key: newKey(), kind, description, priority: 'recommended', quantity: 1, unitPrice: price, qty: '1', price: price ? String(price) : '' }])

  function confirmSend() {
    if (draftItems.length === 0) { Alert.alert('Sin partidas', 'Agregá al menos un servicio o repuesto.'); return }
    if (draftItems.some((d) => !d.description.trim())) { Alert.alert('Falta descripción', 'Todas las partidas necesitan descripción.'); return }
    Alert.alert('Enviar al cliente', `Total ${money(subtotal * (1 + taxRate))}. Después ya no se puede editar.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => send.mutate() },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>Cotización</Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {draft ? (
          <>
            {draftItems.map((d, idx) => (
              <View key={d.key} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.segment}>
                    {(['service', 'part'] as const).map((k) => (
                      <TouchableOpacity key={k} onPress={() => patchItem(d.key, { kind: k })} style={[styles.segBtn, d.kind === k && styles.segBtnActive]}>
                        <Text style={[styles.segText, d.kind === k && styles.segTextActive]}>{k === 'service' ? '🔧 Servicio' : '📦 Repuesto'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => setItems(draftItems.filter((x) => x.key !== d.key))}>
                    <Text style={styles.remove}>Quitar</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={d.description}
                  onChangeText={(t) => patchItem(d.key, { description: t })}
                  placeholder={`Partida ${idx + 1}: ej. ${d.kind === 'part' ? 'Pastillas de freno delanteras' : 'Cambio de pastillas'}`}
                  placeholderTextColor="#8898AA"
                  style={[styles.input, { marginTop: 10 }]}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ width: 80 }}>
                    <Text style={styles.label}>Cant.</Text>
                    <TextInput value={d.qty} onChangeText={(t) => patchItem(d.key, { qty: t })} keyboardType="decimal-pad" style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Precio unitario (L)</Text>
                    <TextInput value={d.price} onChangeText={(t) => patchItem(d.key, { price: t })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#8898AA" style={styles.input} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {(Object.keys(PRIORITY) as Draft['priority'][]).map((p) => (
                    <TouchableOpacity key={p} onPress={() => patchItem(d.key, { priority: p })} style={[styles.prio, d.priority === p && styles.prioActive]}>
                      <Text style={[styles.prioText, d.priority === p && { color: '#172B4D' }]}>{PRIORITY[p].dot} {PRIORITY[p].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity style={styles.addBtn} onPress={() => addItem('service')}><Text style={styles.addText}>+ Servicio</Text></TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => addItem('part')}><Text style={styles.addText}>+ Repuesto</Text></TouchableOpacity>
            </View>
            {(catalog?.data.length ?? 0) > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {catalog!.data.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.catalogChip} onPress={() => addItem('service', c.name, c.price ?? 0)}>
                      <Text style={styles.catalogText}>+ {c.name}{c.price != null ? ` · ${money(c.price)}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.card}>
              <Text style={styles.label}>Nota para el cliente</Text>
              <TextInput
                value={draftNotes}
                onChangeText={setNotes}
                multiline
                placeholder="Ej. Las pastillas están al 10%, recomendamos cambiarlas ya."
                placeholderTextColor="#8898AA"
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              />
            </View>
          </>
        ) : (
          quote.items.map((item) => {
            const decision = quote.status === 'sent' ? decisions[item.id] : item.decision
            return (
              <View key={item.id} style={[styles.card, decision === 'rejected' && { opacity: 0.55 }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemPrio}>{PRIORITY[item.priority].dot} {PRIORITY[item.priority].label} · {item.kind === 'part' ? 'Repuesto' : 'Servicio'}</Text>
                    <Text style={styles.itemTitle}>{item.description}</Text>
                    {item.quantity !== 1 && <Text style={styles.itemSub}>{item.quantity} × {money(item.unitPrice)}</Text>}
                  </View>
                  <Text style={styles.itemPrice}>{money(item.quantity * item.unitPrice)}</Text>
                </View>
                {quote.status === 'sent' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.choice, decision === 'approved' && styles.choiceYes]} onPress={() => setDecisions({ ...decisions, [item.id]: 'approved' })}>
                      <Text style={[styles.choiceText, decision === 'approved' && { color: '#fff' }]}>✓ Aprobó</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.choice, decision === 'rejected' && styles.choiceNo]} onPress={() => setDecisions({ ...decisions, [item.id]: 'rejected' })}>
                      <Text style={[styles.choiceText, decision === 'rejected' && { color: '#fff' }]}>✕ Rechazó</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.decided, { color: decision === 'approved' ? '#2DCE89' : '#F5365C' }]}>
                    {decision === 'approved' ? '✓ Aprobada' : '✕ Rechazada'}
                  </Text>
                )}
              </View>
            )
          })
        )}

        {/* Totales */}
        <View style={styles.card}>
          <View style={styles.rowBetween}><Text style={styles.totLabel}>Subtotal</Text><Text style={styles.totValue}>{money(subtotal)}</Text></View>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {draft && <Switch value={draftTax} onValueChange={setWithTax} />}
              <Text style={styles.totLabel}>ISV {Math.round(taxRate * 100)}%</Text>
            </View>
            <Text style={styles.totValue}>{money(subtotal * taxRate)}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}><Text style={styles.totBold}>Total</Text><Text style={styles.totBold}>{money(subtotal * (1 + taxRate))}</Text></View>
          {(quote.status === 'approved' || quote.status === 'partially_approved') && (
            <View style={[styles.rowBetween, { marginTop: 6 }]}><Text style={[styles.totBold, { color: '#2DCE89' }]}>Aprobado</Text><Text style={[styles.totBold, { color: '#2DCE89' }]}>{money(quote.approvedTotal)}</Text></View>
          )}
        </View>

        {!draft && quote.notes && <Text style={styles.footnote}>💬 {quote.notes}</Text>}

        {draft && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={[styles.primary, busy && { opacity: 0.5 }]} disabled={busy} onPress={confirmSend}>
              {send.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>📤 Enviar al cliente</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => save.mutate(undefined, { onSuccess: () => { setItems(null); invalidate(); Alert.alert('Guardado', 'Borrador guardado.') } })}>
              <Text style={styles.secondaryText}>{save.isPending && !send.isPending ? 'Guardando…' : 'Guardar borrador'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => Alert.alert('Borrar borrador', '¿Seguro?', [{ text: 'No', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate() }])}>
              <Text style={[styles.remove, { textAlign: 'center', marginTop: 4 }]}>Borrar borrador</Text>
            </TouchableOpacity>
          </View>
        )}

        {quote.status === 'sent' && (
          <View style={styles.card}>
            <Text style={styles.hint}>El cliente la puede aprobar desde su app. Si respondió por teléfono o en persona, marcá cada partida y anotá cómo autorizó:</Text>
            <TextInput
              value={responseNote}
              onChangeText={setResponseNote}
              placeholder='Ej. "Aprobó por teléfono a las 10:30"'
              placeholderTextColor="#8898AA"
              style={[styles.input, { marginTop: 10 }]}
            />
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: '#2DCE89', marginTop: 12 }, (!responseNote.trim() || quote.items.some((i) => !decisions[i.id])) && { opacity: 0.4 }]}
              disabled={busy || !responseNote.trim() || quote.items.some((i) => !decisions[i.id])}
              onPress={() => respond.mutate()}
            >
              {respond.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Registrar respuesta</Text>}
            </TouchableOpacity>
          </View>
        )}

        {quote.respondedAt && (
          <Text style={styles.footnote}>
            Respondida {formatShortDateTime(quote.respondedAt)} · {quote.respondedVia === 'app' ? 'por el cliente en su app' : 'registrada por el taller'}
            {quote.responseNote ? `\n“${quote.responseNote}”` : ''}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, ...shadow },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#F1F2F6', borderRadius: 10, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { fontSize: 12, fontWeight: '700', color: '#8898AA' },
  segTextActive: { color: '#172B4D' },
  remove: { fontSize: 13, fontWeight: '700', color: '#F5365C' },
  label: { fontSize: 11, fontWeight: '700', color: '#8898AA', marginBottom: 4 },
  input: { backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' },
  prio: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  prioActive: { borderColor: '#172B4D', backgroundColor: '#fff' },
  prioText: { fontSize: 11, fontWeight: '700', color: '#8898AA' },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#5E72E4', borderStyle: 'dashed' },
  addText: { fontSize: 14, fontWeight: '800', color: '#5E72E4' },
  catalogChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEF0FD' },
  catalogText: { fontSize: 12, fontWeight: '700', color: '#5E72E4' },
  itemPrio: { fontSize: 11, fontWeight: '800', color: '#8898AA', marginBottom: 3 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#172B4D' },
  itemSub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  choice: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  choiceYes: { backgroundColor: '#2DCE89', borderColor: '#2DCE89' },
  choiceNo: { backgroundColor: '#F5365C', borderColor: '#F5365C' },
  choiceText: { fontSize: 13, fontWeight: '800', color: '#525F7F' },
  decided: { fontSize: 13, fontWeight: '800', marginTop: 8 },
  totLabel: { fontSize: 13, color: '#8898AA', fontWeight: '600' },
  totValue: { fontSize: 13, color: '#172B4D', fontWeight: '700' },
  totBold: { fontSize: 16, color: '#172B4D', fontWeight: '800' },
  primary: { backgroundColor: '#5E72E4', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondary: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#D9DEE7', backgroundColor: '#fff' },
  secondaryText: { color: '#525F7F', fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 13, color: '#525F7F', lineHeight: 19 },
  footnote: { fontSize: 12, color: '#8898AA', textAlign: 'center', marginVertical: 12, lineHeight: 18 },
})
