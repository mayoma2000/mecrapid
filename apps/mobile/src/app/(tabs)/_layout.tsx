import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center justify-center pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className={`text-xs mt-0.5 ${focused ? 'text-blue-600 font-semibold' : 'text-neutral-400'}`}>
        {label}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 72,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Tablero" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" label="Órdenes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Citas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Clientes" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
