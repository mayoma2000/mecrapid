import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native'
import { signIn } from '../../lib/auth-client'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const { error: err } = await signIn.email({ email, password })
      if (err) {
        setError(err.message ?? 'Error al iniciar sesión')
        setLoading(false)
        return
      }
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#F8F9FE' }}
    >
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={{ fontSize: 36 }}>🔧</Text>
        </View>
        <Text style={styles.headerTitle}>MecRapid</Text>
        <Text style={styles.headerSubtitle}>Gestión de taller automotriz</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Iniciar sesión</Text>
        <Text style={styles.cardSubtitle}>Ingresá tus credenciales para continuar</Text>

        <View style={{ gap: 16, marginTop: 24 }}>
          <View>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@taller.com"
              placeholderTextColor="#8898AA"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8898AA"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            onPress={() => { void handleSignIn() }}
            disabled={loading}
            style={[styles.button, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#5E72E4',
    paddingTop: 80,
    paddingBottom: 52,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 6,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 28,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172B4D',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8898AA',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#525F7F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#172B4D',
  },
  errorText: {
    color: '#F5365C',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#5E72E4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
