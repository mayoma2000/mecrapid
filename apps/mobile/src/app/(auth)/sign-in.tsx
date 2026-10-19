import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
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

    const { error: err } = await signIn.email({ email, password })

    if (err) {
      setError(err.message ?? 'Error al iniciar sesión')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-neutral-900 dark:text-white">MecRapid</Text>
          <Text className="mt-1 text-neutral-500 dark:text-neutral-400">Gestión de taller</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Correo</Text>
            <TextInput
              className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-900"
              placeholder="correo@taller.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Contraseña</Text>
            <TextInput
              className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-900"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text className="text-red-500 text-sm">{error}</Text> : null}

          <TouchableOpacity
            onPress={() => { void handleSignIn() }}
            disabled={loading}
            className="bg-blue-600 rounded-xl py-4 items-center mt-2"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
