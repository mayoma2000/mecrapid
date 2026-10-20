import { useEffect, useRef } from 'react'
import { View, Image, Animated, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const logo = require('../../assets/logo.jpg') as number

export function LoadingScreen() {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.88, duration: 700, useNativeDriver: true }),
      ])
    ).start()
  }, [pulse])

  return (
    <SafeAreaView style={styles.screen}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
        <Image source={logo} style={styles.logo} resizeMode="cover" />
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#EEF0FD',
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: 140,
    height: 140,
  },
})
