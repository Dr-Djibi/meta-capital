import { useState, useEffect } from 'react';
import { USD_TO_GNF } from '@/constants/currency';

interface ExchangeState {
  rate: number;
  loading: boolean;
  lastUpdated: string | null;
  error: boolean;
}

const CACHE_KEY = 'exchange_rate_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

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
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      try {
        // API gratuite, sans clé, 1500 req/mois
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const gnfRate: number = data?.rates?.GNF;
        if (!gnfRate || typeof gnfRate !== 'number') throw new Error('No GNF rate');

        if (!cancelled) {
          setState({
            rate: gnfRate,
            loading: false,
            lastUpdated: new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            error: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            rate: USD_TO_GNF,
            loading: false,
            error: true,
          }));
        }
      }
    }

    fetchRate();
    return () => { cancelled = true; };
  }, []);

  return state;
}
