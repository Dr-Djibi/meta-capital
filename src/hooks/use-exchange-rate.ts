import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USD_TO_GNF } from '@/constants/currency';

interface ExchangeState {
  rate: number;
  loading: boolean;
  lastUpdated: string | null;
  error: boolean;
  refresh: () => Promise<void>;
}

const CACHE_KEY = 'exchange_rate_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

/**
 * Hook qui récupère le taux USD→GNF en temps réel.
 * Utilise l'API gratuite open.er-api.com (pas de clé requise).
 * Fallback sur le taux fixe en cas d'erreur.
 */
export function useExchangeRate(): ExchangeState {
  const [state, setState] = useState<ExchangeState>({
    rate: USD_TO_GNF,
    loading: true,
    lastUpdated: null,
    error: false,
    refresh: async () => undefined,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      let cached: CachedRate | null = null;
      try {
        const rawCache = await AsyncStorage.getItem(CACHE_KEY);
        if (rawCache) {
          const parsedCache = JSON.parse(rawCache) as CachedRate;
          if (parsedCache.rate > 0 && Date.now() - parsedCache.fetchedAt < CACHE_TTL_MS) {
            cached = parsedCache;
            if (!cancelled) {
              setState({
                rate: parsedCache.rate,
                loading: false,
                lastUpdated: new Date(parsedCache.fetchedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                error: false,
                refresh: async () => undefined,
              });
            }
          }
        }

        // API gratuite, sans clé, 1500 req/mois
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const gnfRate: number = data?.rates?.GNF;
        if (!gnfRate || typeof gnfRate !== 'number') throw new Error('No GNF rate');

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ rate: gnfRate, fetchedAt: Date.now() } satisfies CachedRate)
        );

        if (!cancelled) {
          setState({
            rate: gnfRate,
            loading: false,
            lastUpdated: new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            error: false,
            refresh: async () => undefined,
          });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            rate: cached?.rate ?? USD_TO_GNF,
            loading: false,
            error: true,
          }));
        }
      }
    }

    fetchRate();
    const refreshTimer = setInterval(fetchRate, CACHE_TTL_MS);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  return { ...state, refresh: async () => {
    // The effect owns the refresh logic; reloading the hook is intentionally not needed.
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rate = data?.rates?.GNF;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('No GNF rate');
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() } satisfies CachedRate));
    setState({ rate, loading: false, lastUpdated: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), error: false, refresh: state.refresh });
  } };
}
