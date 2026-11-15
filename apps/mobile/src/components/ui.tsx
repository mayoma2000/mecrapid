import type { ReactNode } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, type KeyboardTypeOptions } from 'react-native'
import { router } from 'expo-router'

// Piezas comunes de las pantallas de formularios del taller (mismo estilo que el resto de la app)

export function NavHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
      <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.card}>
      {(title || right) && (
        <View style={styles.cardHeader}>
          {title ? <Text style={styles.section}>{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  )
}

export function Field({ label, value, onChange, placeholder, keyboard, caps, multiline, flex = true }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboard?: KeyboardTypeOptions
  caps?: 'none' | 'words' | 'characters' | 'sentences'
  multiline?: boolean
  flex?: boolean
}) {
  return (
    <View style={[{ marginBottom: 12 }, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8898AA"
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={caps ?? 'sentences'}
        autoCorrect={false}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
}

export function PrimaryButton({ label, onPress, loading, disabled, color = '#5E72E4' }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean; color?: string
}) {
  return (
    <TouchableOpacity
      style={[styles.primary, { backgroundColor: color }, (disabled || loading) && { opacity: 0.45 }]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  )
}

export function TextButton({ label, onPress, color = '#5E72E4' }: { label: string; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10}>
      <Text style={[styles.textBtn, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>
  )
}

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 }

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#172B4D' },
  sub: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  hint: { fontSize: 12, color: '#8898AA', lineHeight: 17 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F2F6' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
})

const styles = StyleSheet.create({
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 3 },
  backBtnText: { fontSize: 26, color: '#5E72E4', lineHeight: 30 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#172B4D' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, ...shadow },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  section: { fontSize: 11, fontWeight: '800', color: '#8898AA', textTransform: 'uppercase', letterSpacing: 1.2 },
  label: { fontSize: 11, fontWeight: '700', color: '#8898AA', marginBottom: 4 },
  input: { backgroundColor: '#F8F9FE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#172B4D', borderWidth: 1, borderColor: '#E9ECEF' },
  primary: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  textBtn: { fontSize: 14, fontWeight: '800' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FE', borderWidth: 1, borderColor: '#E9ECEF' },
  chipActive: { backgroundColor: '#5E72E4', borderColor: '#5E72E4' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#525F7F' },
  chipTextActive: { color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
})
