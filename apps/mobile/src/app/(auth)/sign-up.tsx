import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, StyleSheet, Image,
} from 'react-native'
import { router } from 'expo-router'
import { signUp } from '../../lib/auth-client'

const logo = require('../../../assets/logo.jpg') as number

// Mensajes de better-auth → español
function friendlyError(code: string | undefined, message: string | undefined): string {
  if (code === 'USER_ALREADY_EXISTS' || /exist/i.test(message ?? '')) return 'Ya hay una cuenta con ese correo. Iniciá sesión.'
  if (code === 'PASSWORD_TOO_SHORT') return 'La contraseña debe tener al menos 8 caracteres.'
  if (code === 'INVALID_EMAIL') return 'Revisá el correo.'
  return message ?? 'No se pudo crear la cuenta. Intentá de nuevo.'
}

// Registro del cliente: crea su cuenta y la vincula con su ficha en el taller (mismo correo)
export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const digits = phone.replace(/\D/g, '')

  async function handleSignUp() {
    if (loading) return
    setError('')
    if (name.trim().length < 3) { setError('Escribí tu nombre completo.'); return }
    if (digits.length !== 8) { setError('El teléfono debe tener 8 dígitos.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Revisá el correo.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    try {
      // La sesión queda abierta al registrarse: la app pasa sola al inicio
      const { error: err } = await signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: `${digits.slice(0, 4)}-${digits.slice(4)}`,
      } as Parameters<typeof signUp.email>[0])
      if (err) {
        setError(friendlyError(err.code, err.message))
        setLoading(false)
      }
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#5E72E4' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Image source={logo} style={styles.logoImg} resizeMode="cover" />
          </View>
          <Text style={styles.headerTitle}>MecRapid</Text>
          <Text style={styles.headerSubtitle}>Tu taller, en tu celular</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear cuenta</Text>
          <Text style={styles.cardSubtitle}>Agendá citas, pedí asistencia y aprobá tus cotizaciones</Text>

          <View style={{ gap: 16, marginTop: 24 }}>
            <View>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                placeholderTextColor="#8898AA"
                autoCapitalize="words"
                autoComplete="name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}><Text style={styles.prefixText}>🇭🇳 +504</Text></View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9999-9999"
                  placeholderTextColor="#8898AA"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={9}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@gmail.com"
                placeholderTextColor="#8898AA"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={styles.hint}>Si el taller ya te tiene registrado con este correo, vas a ver tus carros y órdenes.</Text>
            </View>

            <View>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#8898AA"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Text style={styles.showText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={() => { void handleSignUp() }}
              disabled={loading}
              style={[styles.button, loading && { opacity: 0.7 }]}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Crear mi cuenta</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={styles.switchText}>¿Ya tenés cuenta? <Text style={styles.switchLink}>Iniciá sesión</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#5E72E4', paddingTop: 64, paddingBottom: 48, alignItems: 'center', paddingHorizontal: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 10,
  },
  logoImg: { width: 72, height: 72 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.78)', marginTop: 6 },
  card: {
    flexGrow: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -28,
    paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#172B4D' },
  cardSubtitle: { fontSize: 14, color: '#8898AA', marginTop: 4, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#525F7F', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FE', borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#172B4D',
  },
  hint: { fontSize: 12, color: '#8898AA', marginTop: 6, lineHeight: 17 },
  phoneRow: { flexDirection: 'row', backgroundColor: '#F8F9FE', borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 14, overflow: 'hidden' },
  prefix: { backgroundColor: '#EEF0F6', paddingHorizontal: 14, justifyContent: 'center' },
  prefixText: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#172B4D' },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FE', borderWidth: 1.5,
    borderColor: '#E9ECEF', borderRadius: 14, paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#172B4D' },
  showText: { fontSize: 13, fontWeight: '800', color: '#5E72E4' },
  errorText: { color: '#F5365C', fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: '#5E72E4', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4,
    shadowColor: '#5E72E4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.38, shadowRadius: 14, elevation: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  switchText: { fontSize: 14, color: '#8898AA' },
  switchLink: { color: '#5E72E4', fontWeight: '800' },
})
