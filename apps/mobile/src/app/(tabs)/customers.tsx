import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApi } from '../../lib/api'

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  vehicles?: { id: string; make: string; model: string; year: number; licensePlate: string }[]
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <TouchableOpacity className="bg-white dark:bg-neutral-900 rounded-2xl p-4 mb-3 border border-neutral-100 dark:border-neutral-800">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center">
          <Text className="text-blue-700 dark:text-blue-400 font-bold text-base">
            {customer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-neutral-900 dark:text-white">{customer.name}</Text>
          <Text className="text-sm text-neutral-500 mt-0.5">{customer.phone}</Text>
          {customer.email ? (
            <Text className="text-xs text-neutral-400 mt-0.5">{customer.email}</Text>
          ) : null}
        </View>
        <Text className="text-neutral-400 text-lg">›</Text>
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Clientes</Text>
        <TextInput
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-neutral-900 dark:text-white"
          placeholder="Buscar por nombre…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CustomerCard customer={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-3">👤</Text>
              <Text className="text-neutral-500 dark:text-neutral-400">
                {search ? 'Sin resultados' : 'Sin clientes aún'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
