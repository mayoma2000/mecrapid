import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { signIn } from '../../lib/auth-client'

const logo = require('../../../../assets/logo.jpg') as number

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const { error: err } = await signIn.email({ email, password })
      if (err) {
        setError(err.message ?? 'Credenciales incorrectas. Verificá tu correo y contraseña.')
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
          <Image source={logo} style={styles.logoImg} resizeMode="cover" />
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
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#8898AA"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  /* ojo tachado */
                  <View style={styles.eyeIcon}>
                    <View style={styles.eyeOuter} />
                    <View style={styles.eyeSlash} />
                  </View>
                ) : (
                  /* ojo abierto */
                  <View style={styles.eyeIcon}>
                    <View style={styles.eyeOuter} />
                    <View style={styles.eyeInner} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
    width: 84,
    height: 84,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  logoImg: {
    width: 84,
    height: 84,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FE',
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#172B4D',
  },
  eyeBtn: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeOuter: {
    width: 20,
    height: 13,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8898AA',
    position: 'absolute',
  },
  eyeInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8898AA',
  },
  eyeSlash: {
    width: 2,
    height: 22,
    backgroundColor: '#8898AA',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
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
