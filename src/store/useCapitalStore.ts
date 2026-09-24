import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, PaymentMethod, toUSD } from '@/constants/currency';

export type TransactionCategory =
  | 'PERSONAL_FUNDS'
  | 'FAMILY_SUPPORT'
  | 'ADVERTISING'
  | 'PRODUCT_PURCHASE'
  | 'PERSONAL_EXPENSE'
  | 'SALES_REVENUE';

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  PERSONAL_FUNDS: 'Fonds propres',
  FAMILY_SUPPORT: 'Aide famille',
  ADVERTISING: 'Meta Ads',
  PRODUCT_PURCHASE: 'Achat stock',
  PERSONAL_EXPENSE: 'Dépense perso',
  SALES_REVENUE: 'Recette vente',
};

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  PERSONAL_FUNDS: 'wallet-outline',
  FAMILY_SUPPORT: 'people-outline',
  ADVERTISING: 'megaphone-outline',
  PRODUCT_PURCHASE: 'cube-outline',
  PERSONAL_EXPENSE: 'cart-outline',
  SALES_REVENUE: 'cash-outline',
};

export interface Transaction {
  id: string;
  /** Montant TOUJOURS stocké en USD pour cohérence interne */
  amount: number;
  /** Devise originale saisie par l'utilisateur */
  currency: Currency;
  /** Montant original saisi (avant conversion) */
  originalAmount: number;
  type: 'INCOME' | 'EXPENSE';
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  description: string;
  date: string;
}

interface CapitalState {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  deleteTransaction: (id: string) => void;
  /** Capital net en USD */
  getNetCapital: () => number;
}

export const useCapitalStore = create<CapitalState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            {
              ...t,
              id: Math.random().toString(36).slice(2),
              date: new Date().toISOString(),
            },
            ...s.transactions,
          ],
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      getNetCapital: () => {
        const { transactions } = get();
        return transactions.reduce(
          (acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount),
          0
        );
      },
    }),
    {
      name: 'capital-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
