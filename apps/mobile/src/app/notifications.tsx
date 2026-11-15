import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../lib/api'
import { formatShortDateTime } from '../lib/format'

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  url: string | null
  readAt: string | null
  createdAt: string
}

// Bandeja de avisos: todo lo que llegó por push queda aquí, aunque el push no haya llegado
export default function NotificationsScreen() {
  const { request } = useApi()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => request<{ data: AppNotification[]; meta: { unread: number } }>('/api/v1/me/notifications'),
  })

  const markRead = useMutation({
    mutationFn: (body: { ids?: string[]; all?: boolean }) =>
      request('/api/v1/me/notifications/read', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  function open(n: AppNotification) {
    if (!n.readAt) markRead.mutate({ ids: [n.id] })
    if (n.url) router.push(n.url as never)
  }

  const unread = data?.meta.unread ?? 0

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>Avisos</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={() => markRead.mutate({ all: true })}>
            <Text style={styles.link}>Marcar todo leído</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5E72E4" /></View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor="#5E72E4" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 44, marginBottom: 10 }}>🔔</Text>
              <Text style={{ color: '#8898AA', fontSize: 14 }}>Todavía no tenés avisos</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.readAt && styles.cardUnread]} onPress={() => open(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[styles.cardTitle, !item.readAt && { color: '#172B4D' }]}>{item.title}</Text>
                {!item.readAt && <View style={styles.dot} />}
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardDate}>{formatShortDateTime(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  title: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  link: { fontSize: 13, fontWeight: '700', color: '#5E72E4' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#5E72E4' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#525F7F', flex: 1 },
  cardBody: { fontSize: 13, color: '#525F7F', marginTop: 4, lineHeight: 19 },
  cardDate: { fontSize: 11, color: '#8898AA', marginTop: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#5E72E4', marginTop: 5 },
})
