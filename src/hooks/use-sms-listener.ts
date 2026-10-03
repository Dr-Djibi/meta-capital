import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { parseSingleSMS, parseSMSBatch, ParsedSMS } from '@/utils/smsParser';
import { useCapitalStore } from '@/store/useCapitalStore';
import { toUSD, USD_TO_GNF } from '@/constants/currency';

interface SmsListenerOptions {
  liveRate?: number;
  autoAdd?: boolean;
}

export function useSmsListener(options: SmsListenerOptions = {}) {
  const { liveRate = USD_TO_GNF, autoAdd = false } = options;
  const addTransaction = useCapitalStore((s) => s.addTransaction);
  const hasTransactionWithReference = useCapitalStore((s) => s.hasTransactionWithReference);
  const [detectedTransactions, setDetectedTransactions] = useState<ParsedSMS[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  /**
   * Traite un ou plusieurs SMS bruts et les enregistre si autoAdd est activé
   */
  const processSmsText = (text: string): ParsedSMS[] => {
    if (!text || !text.trim()) return [];
    setLastMessage(text);

    const parsedList = parseSMSBatch(text);
    if (parsedList.length === 0) return [];

    // Ne garder que les transactions non encore enregistrées
    const newItems = parsedList.filter(
      (item) => !item.reference || !hasTransactionWithReference(item.reference)
    );

    setDetectedTransactions(newItems);

    if (autoAdd && newItems.length > 0) {
      for (const item of newItems) {
        const amountUSD = toUSD(item.amountGNF, 'GNF', liveRate);
        addTransaction({
          amount: amountUSD,
          currency: 'GNF',
          originalAmount: item.amountGNF,
          type: item.type,
          category: item.category,
          paymentMethod: item.paymentMethod,
          reference: item.reference,
          description: item.description + (item.reference ? ` (Ref: ${item.reference})` : ''),
        });
      }
    }

    return newItems;
  };

  useEffect(() => {
    // Écouteur d'état de l'application (quand l'application revient au premier plan)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // L'application est au premier plan
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    detectedTransactions,
    lastMessage,
    processSmsText,
    isAndroid: Platform.OS === 'android',
  };
}
