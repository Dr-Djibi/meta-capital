import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionCategory } from './useCapitalStore';

export interface Budget {
  category: TransactionCategory;
  /** Limite mensuelle en USD */
  monthlyLimit: number;
}

interface BudgetState {
  budgets: Budget[];
  setBudget: (category: TransactionCategory, limit: number) => void;
  removeBudget: (category: TransactionCategory) => void;
  getBudget: (category: TransactionCategory) => Budget | undefined;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],

      setBudget: (category, limit) =>
        set((s) => {
          const exists = s.budgets.find((b) => b.category === category);
          if (exists) {
            return {
              budgets: s.budgets.map((b) =>
                b.category === category ? { ...b, monthlyLimit: limit } : b
              ),
            };
          }
          return { budgets: [...s.budgets, { category, monthlyLimit: limit }] };
        }),

      removeBudget: (category) =>
        set((s) => ({
          budgets: s.budgets.filter((b) => b.category !== category),
        })),

      getBudget: (category) =>
        get().budgets.find((b) => b.category === category),
    }),
    {
      name: 'budget-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
