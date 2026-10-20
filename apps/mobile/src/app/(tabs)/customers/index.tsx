import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApi } from '../../../lib/api'

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  vehicles?: { id: string; make: string; model: string; year: number; licensePlate: string }[]
}

const AVATAR_COLORS = ['#5E72E4', '#11CDEF', '#2DCE89', '#FB6340', '#F5365C']

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!
}

function CustomerCard({ customer }: { customer: Customer }) {
  const color = getAvatarColor(customer.name)
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/customers/${customer.id}`)}>
      <View style={[styles.avatar, { backgroundColor: color + '22' }]}>
        <Text style={[styles.avatarText, { color }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerPhone}>{customer.phone}</Text>
        {customer.email ? (
          <Text style={styles.customerEmail}>{customer.email}</Text>
        ) : null}
      </View>
      <View style={styles.chevronBox}>
        <Text style={{ color: '#8898AA', fontSize: 20, lineHeight: 22 }}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function CustomersScreen() {
  const [search, setSearch] = useState('')
  const { request } = useApi()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      request<{ data: Customer[]; meta: { total: number } }>(
        `/api/v1/customers?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
  })

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <View style={styles.searchBox}>
          <Text style={{ fontSize: 16, marginRight: 8, color: '#8898AA' }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre…"
            placeholderTextColor="#8898AA"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CustomerCard customer={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch() }}
              tintColor="#5E72E4"
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👤</Text>
              <Text style={{ color: '#8898AA', fontSize: 15 }}>
                {search ? 'Sin resultados' : 'Sin clientes aún'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#172B4D',
    padding: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172B4D',
  },
  customerPhone: {
    fontSize: 13,
    color: '#525F7F',
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 1,
  },
  chevronBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
