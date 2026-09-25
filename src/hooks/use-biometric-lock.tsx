import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const BIOMETRIC_LOCK_KEY = '@meta-capital/biometric-lock';

type BiometricLockContextValue = {
  available: boolean;
  enabled: boolean;
  locked: boolean;
  loading: boolean;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  unlock: () => Promise<boolean>;
};

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

async function authenticate() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Déverrouiller Meta Capital',
    cancelLabel: 'Annuler',
    disableDeviceFallback: false,
  });
  return result.success;
}

export function BiometricLockProvider({ children }: { children: React.ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (Platform.OS === 'web') {
        if (mounted) setLoading(false);
        return;
      }

      const [hasHardware, isEnrolled, savedPreference] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        AsyncStorage.getItem(BIOMETRIC_LOCK_KEY),
      ]);
      const isAvailable = hasHardware && isEnrolled;

      if (!mounted) return;
      setAvailable(isAvailable);
      const shouldLock = isAvailable && savedPreference === 'true';
      setEnabled(shouldLock);
      setLocked(shouldLock);
      setLoading(false);
    }

    load().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<BiometricLockContextValue>(() => ({
    available,
    enabled,
    locked,
    loading,
    enable: async () => {
      if (!available || !(await authenticate())) return false;
      await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, 'true');
      setEnabled(true);
      return true;
    },
    disable: async () => {
      await AsyncStorage.removeItem(BIOMETRIC_LOCK_KEY);
      setEnabled(false);
      setLocked(false);
    },
    unlock: async () => {
      if (!(await authenticate())) return false;
      setLocked(false);
      return true;
    },
  }), [available, enabled, locked, loading]);

  return <BiometricLockContext.Provider value={value}>{children}</BiometricLockContext.Provider>;
}

export function useBiometricLock() {
  const context = useContext(BiometricLockContext);
  if (!context) throw new Error('useBiometricLock must be used inside BiometricLockProvider');
  return context;
}