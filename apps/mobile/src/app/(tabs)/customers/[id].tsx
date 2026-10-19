import { useQuery } from '@tanstack/react-query'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useApi } from '../../../lib/api'

interface CustomerDetail {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  vehicles: {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string
    color: string | null
    mileage: number | null
  }[]
}

const AVATAR_COLORS = ['#5E72E4', '#11CDEF', '#2DCE89', '#FB6340', '#F5365C']
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { request } = useApi()

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => request<{ data: CustomerDetail }>(`/api/v1/customers/${id}`),
  })

  const customer = data?.data

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    )
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8898AA' }}>Cliente no encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const avatarColor = getAvatarColor(customer.name)

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Cliente</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Avatar + name hero */}
        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: avatarColor + '22' }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroName}>{customer.name}</Text>
          <Text style={styles.heroSub}>{customer.phone}</Text>
          {customer.email ? <Text style={styles.heroEmail}>{customer.email}</Text> : null}
        </View>

        {/* Contact info */}
        <View style={styles.card}>
          <InfoRow icon="📞" label="Teléfono" value={customer.phone} />
          {customer.email && (
            <>
              <Divider />
              <InfoRow icon="📧" label="Correo" value={customer.email} />
            </>
          )}
          {customer.address && (
            <>
              <Divider />
              <InfoRow icon="📍" label="Dirección" value={customer.address} multiline />
            </>
          )}
          {customer.notes && (
            <>
              <Divider />
              <InfoRow icon="📝" label="Notas" value={customer.notes} multiline />
            </>
          )}
        </View>

        {/* Vehicles */}
        <Text style={styles.sectionTitle}>Vehículos ({customer.vehicles.length})</Text>
        {customer.vehicles.length === 0 ? (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🚗</Text>
            <Text style={{ color: '#8898AA', fontSize: 14 }}>Sin vehículos registrados</Text>
          </View>
        ) : (
          customer.vehicles.map((v) => (
            <View key={v.id} style={styles.vehicleCard}>
              <View style={styles.vehicleIconBox}>
                <Text style={{ fontSize: 22 }}>🚗</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{v.make} {v.model} {v.year}</Text>
                <Text style={styles.vehiclePlate}>{v.licensePlate}</Text>
                {(v.color || v.mileage) && (
                  <Text style={styles.vehicleMeta}>
                    {[v.color, v.mileage ? `${v.mileage.toLocaleString()} km` : null].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value, multiline }: { icon: string; label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, multiline && { lineHeight: 20 }]}>{value}</Text>
      </View>
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F2F6', marginVertical: 2 }} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#172B4D' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '800' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#172B4D' },
  heroSub: { fontSize: 14, color: '#525F7F', marginTop: 4 },
  heroEmail: { fontSize: 13, color: '#8898AA', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 12 },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: '#8898AA', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#172B4D' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8898AA',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  vehicleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleName: { fontSize: 15, fontWeight: '700', color: '#172B4D' },
  vehiclePlate: { fontSize: 13, color: '#5E72E4', fontWeight: '700', marginTop: 2 },
  vehicleMeta: { fontSize: 12, color: '#8898AA', marginTop: 2 },
})
