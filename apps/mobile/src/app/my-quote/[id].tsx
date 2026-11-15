import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../lib/api'
import { formatShortDateTime } from '../../lib/format'
import { PRIORITY, QUOTE_STATUS, money, type Quote, type QuoteItem } from '../../lib/quotes'

type Choice = 'approved' | 'rejected'

// El cliente revisa la cotización y aprueba o rechaza cada partida; se envía todo junto
export default function MyQuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [choices, setChoices] = useState<Record<string, Choice>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['my-quote', id],
    queryFn: () => request<{ data: Quote }>(`/api/v1/me/quotes/${id}`),
  })
  const quote = data?.data

  const respond = useMutation({
    mutationFn: () =>
      request(`/api/v1/me/quotes/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ decisions: Object.entries(choices).map(([itemId, decision]) => ({ itemId, decision })) }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-quote', id] })
      void queryClient.invalidateQueries({ queryKey: ['my-quotes'] })
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      Alert.alert('¡Listo!', 'Le avisamos al taller tu respuesta.')
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar tu respuesta.'),
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      </SafeAreaView>
    )
  }
  if (!quote) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <Text style={{ color: '#8898AA' }}>Cotización no encontrada</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}><Text style={styles.link}>← Volver</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const pending = quote.status === 'sent'
  const st = QUOTE_STATUS[quote.status]
  const decisionOf = (item: QuoteItem): Choice | undefined =>
    pending ? choices[item.id] : item.decision === 'pending' ? undefined : item.decision
  const approvedNow = quote.items.filter((i) => decisionOf(i) === 'approved')
  const approvedSubtotal = approvedNow.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const allChosen = quote.items.every((i) => choices[i.id])

  function setAll(choice: Choice) {
    setChoices(Object.fromEntries(quote!.items.map((i) => [i.id, choice])))
  }

  function submit() {
    const rejected = quote!.items.length - approvedNow.length
    Alert.alert(
      'Enviar respuesta',
      `Aprobás ${approvedNow.length} ${approvedNow.length === 1 ? 'partida' : 'partidas'} por ${money(approvedSubtotal * (1 + quote!.taxRate))}` +
        (rejected ? ` y rechazás ${rejected}.` : '.') + '\n\nDespués de enviar ya no se puede cambiar.',
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Enviar', onPress: () => respond.mutate() },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>Cotización</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: pending ? 170 : 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              {quote.vehicle ? `${quote.vehicle.make} ${quote.vehicle.model} ${quote.vehicle.year}` : 'Tu vehículo'}
            </Text>
            {quote.workOrder && <Text style={styles.heroSub} numberOfLines={2}>{quote.workOrder.complaint}</Text>}
            {quote.sentAt && <Text style={styles.heroDate}>Enviada {formatShortDateTime(quote.sentAt)}</Text>}
          </View>
          <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text></View>
        </View>

        {quote.notes && (
          <View style={styles.noteCard}><Text style={styles.noteText}>💬 {quote.notes}</Text></View>
        )}

        {pending && (
          <View style={styles.bulkRow}>
            <Text style={styles.bulkHint}>Elegí qué querés que hagamos:</Text>
            <TouchableOpacity onPress={() => setAll('approved')}><Text style={styles.link}>Aprobar todo</Text></TouchableOpacity>
          </View>
        )}

        {quote.items.map((item) => {
          const decision = decisionOf(item)
          const pr = PRIORITY[item.priority]
          return (
            <View key={item.id} style={[styles.itemCard, decision === 'rejected' && { opacity: 0.55 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemPriority}>{pr.dot} {pr.label}</Text>
                  <Text style={styles.itemTitle}>{item.description}</Text>
                  <Text style={styles.itemSub}>
                    {item.kind === 'part' ? 'Repuesto' : 'Servicio'}
                    {item.quantity !== 1 ? ` · ${item.quantity} × ${money(item.unitPrice)}` : ''}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{money(item.quantity * item.unitPrice)}</Text>
              </View>

              {pending ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.choice, decision === 'approved' && styles.choiceApproved]}
                    onPress={() => setChoices({ ...choices, [item.id]: 'approved' })}
                  >
                    <Text style={[styles.choiceText, decision === 'approved' && { color: '#fff' }]}>✓ Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choice, decision === 'rejected' && styles.choiceRejected]}
                    onPress={() => setChoices({ ...choices, [item.id]: 'rejected' })}
                  >
                    <Text style={[styles.choiceText, decision === 'rejected' && { color: '#fff' }]}>✕ No por ahora</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.decided, { color: decision === 'approved' ? '#2DCE89' : '#F5365C' }]}>
                  {decision === 'approved' ? '✓ Aprobada' : '✕ Rechazada'}
                </Text>
              )}
            </View>
          )
        })}

        <View style={styles.totalsCard}>
          <Row label="Subtotal" value={money(quote.subtotal)} />
          <Row label={`ISV ${Math.round(quote.taxRate * 100)}%`} value={money(quote.tax)} />
          <Row label="Total cotizado" value={money(quote.total)} bold />
          {!pending && <Row label="Total aprobado" value={money(quote.approvedTotal)} bold color="#2DCE89" />}
        </View>

        {quote.respondedAt && (
          <Text style={styles.footnote}>
            Respondida {formatShortDateTime(quote.respondedAt)}
            {quote.respondedVia === 'staff' ? ' · registrada por el taller' : ' · desde tu app'}
          </Text>
        )}
      </ScrollView>

      {pending && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={styles.footerLabel}>Vas a aprobar</Text>
            <Text style={styles.footerValue}>{money(approvedSubtotal * (1 + quote.taxRate))}</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, !allChosen && { opacity: 0.4 }]}
            disabled={!allChosen || respond.isPending}
            onPress={submit}
          >
            {respond.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>{allChosen ? 'Enviar respuesta' : 'Elegí una opción en cada partida'}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '800', color: color ?? '#172B4D' }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '800', fontSize: 16 }, color ? { color } : null]}>{value}</Text>
    </View>
  )
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 5,
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  link: { fontSize: 14, color: '#5E72E4', fontWeight: '700' },
  heroCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', ...shadow },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#172B4D' },
  heroSub: { fontSize: 13, color: '#525F7F', marginTop: 4 },
  heroDate: { fontSize: 12, color: '#8898AA', marginTop: 6 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  noteCard: { backgroundColor: '#EEF0FD', borderRadius: 16, padding: 14, marginBottom: 14 },
  noteText: { fontSize: 14, color: '#172B4D', lineHeight: 20 },
  bulkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  bulkHint: { fontSize: 13, color: '#525F7F', fontWeight: '600' },
  itemCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10, ...shadow },
  itemPriority: { fontSize: 11, fontWeight: '800', color: '#8898AA', marginBottom: 4 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#172B4D' },
  itemSub: { fontSize: 12, color: '#8898AA', marginTop: 3 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  choice: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  choiceApproved: { backgroundColor: '#2DCE89', borderColor: '#2DCE89' },
  choiceRejected: { backgroundColor: '#F5365C', borderColor: '#F5365C' },
  choiceText: { fontSize: 13, fontWeight: '800', color: '#525F7F' },
  decided: { fontSize: 13, fontWeight: '800', marginTop: 10 },
  totalsCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 4, ...shadow },
  rowLabel: { fontSize: 13, color: '#8898AA', fontWeight: '600' },
  rowValue: { fontSize: 13, color: '#172B4D', fontWeight: '700' },
  footnote: { fontSize: 12, color: '#8898AA', textAlign: 'center', marginTop: 14 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 16,
  },
  footerLabel: { fontSize: 14, color: '#525F7F', fontWeight: '600' },
  footerValue: { fontSize: 18, color: '#172B4D', fontWeight: '800' },
  submitBtn: { backgroundColor: '#5E72E4', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
