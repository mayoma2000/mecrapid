import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSession } from '../../lib/auth-client'

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'user'
  const isAdmin = role === 'admin'
  const isStaff = role === 'admin' || role === 'mecanico'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Tablero" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: isStaff ? undefined : null,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => <TabIcon icon="🔧" label="Órdenes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          href: isStaff ? undefined : null,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" label="Citas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: isAdmin ? undefined : null,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Clientes" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#EEF0FD',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    color: '#8898AA',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#5E72E4',
    fontWeight: '700',
  },
})
