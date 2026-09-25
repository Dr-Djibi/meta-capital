import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { BiometricLockProvider, useBiometricLock } from '@/hooks/use-biometric-lock';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BiometricLockProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <ProtectedTabs />
        </ThemeProvider>
      </BiometricLockProvider>
    </GestureHandlerRootView>
  );
}

function ProtectedTabs() {
  const { loading, locked, unlock } = useBiometricLock();

  if (loading || !locked) return <AppTabs />;

  return (
    <View style={styles.lockScreen}>
      <Ionicons name="finger-print-outline" size={54} color="#60a5fa" />
      <Text style={styles.lockTitle}>Meta Capital est verrouillé</Text>
      <Text style={styles.lockText}>Utilisez votre empreinte ou votre visage pour continuer.</Text>
      <Pressable style={styles.unlockButton} onPress={() => unlock()}>
        <Ionicons name="lock-open-outline" size={18} color="#07111f" />
        <Text style={styles.unlockButtonText}>Déverrouiller</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lockScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030712', padding: 28 },
  lockTitle: { color: '#f9fafb', fontSize: 22, fontWeight: '800', marginTop: 18, textAlign: 'center' },
  lockText: { color: '#94a3b8', fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  unlockButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#60a5fa', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13, marginTop: 24 },
  unlockButtonText: { color: '#07111f', fontSize: 14, fontWeight: '800' },
});
