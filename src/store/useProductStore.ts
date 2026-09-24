import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USD_TO_GNF } from '@/constants/currency';

export type ProductStatus = 'DRAFT' | 'ORDERED' | 'IN_STOCK' | 'ARCHIVED';

export const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Brouillon',
  ORDERED: 'Commandé',
  IN_STOCK: 'En stock',
  ARCHIVED: 'Archivé',
};

export const STATUS_ICONS: Record<ProductStatus, string> = {
  DRAFT: 'document-outline',
  ORDERED: 'car-outline',
  IN_STOCK: 'checkmark-circle-outline',
  ARCHIVED: 'archive-outline',
};

export interface Product {
  id: string;
  title: string;
  imageUri?: string;
  supplierUrl?: string;
  purchasePrice: number;
  quantity: number;
  weight: number;         // Poids unitaire en kg
  freightPerKgGNF: number; // Frais de transitaire par kilo (en GNF)
  dailyAdBudgetUSD: number; // Budget publicitaire quotidien (en USD)
  adDays: number;
  /** Champs legacy conservés pour lire les anciens produits déjà persistés. */
  freightPerKg?: number;
  estimatedCpa?: number;
  dailyAdBudgetGNF?: number;
  targetMargin: number; // 0.0 → 1.0
  suggestedPrice: number;
  status: ProductStatus;
}

/**
 * Frais transitaire USD = weight * freightPerKgGNF / taux
 * Budget publicitaire USD = dailyAdBudgetUSD * adDays
 * CUT = purchasePrice + Frais transitaire + Budget publicitaire
 * Prix de vente = CUT / (1 - targetMargin)
 */
export function calcSuggestedPrice(
  purchasePrice: number,
  weight: number,
  freightPerKgGNF: number,
  dailyAdBudgetUSD: number,
  adDays: number,
  targetMargin: number,
  usdToGnf = USD_TO_GNF
): number {
  const shippingCost = (weight * freightPerKgGNF) / usdToGnf;
  const advertisingCost = dailyAdBudgetUSD * adDays;
  const cut = purchasePrice + shippingCost + advertisingCost;
  if (targetMargin >= 1) return cut;
  return cut / (1 - targetMargin);
}

type ProductInput = Omit<Product, 'id' | 'suggestedPrice'>;

function normalizeProductInput(product: ProductInput): ProductInput {
  const legacyAdBudgetUSD = product.dailyAdBudgetGNF !== undefined
    ? product.dailyAdBudgetGNF / USD_TO_GNF
    : product.estimatedCpa ?? 0;
  return {
    ...product,
    freightPerKgGNF: product.freightPerKgGNF ?? (product.freightPerKg ?? 0) * USD_TO_GNF,
    dailyAdBudgetUSD: product.dailyAdBudgetUSD ?? legacyAdBudgetUSD,
    adDays: product.adDays ?? 1,
    quantity: product.quantity ?? 0,
  };
}

interface ProductState {
  products: Product[];
  addProduct: (p: ProductInput) => void;
  updateProduct: (id: string, updates: Partial<ProductInput>) => void;
  deleteProduct: (id: string) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: [],

      addProduct: (p) =>
        set((s) => {
          const normalized = normalizeProductInput(p);
          return {
          products: [
            {
              ...normalized,
              id: Math.random().toString(36).slice(2),
              suggestedPrice: calcSuggestedPrice(
                normalized.purchasePrice,
                normalized.weight,
                normalized.freightPerKgGNF,
                normalized.dailyAdBudgetUSD,
                normalized.adDays,
                normalized.targetMargin
              ),
            },
            ...s.products,
          ],
          };
        }),

      updateProduct: (id, updates) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const updated = { ...p, ...updates };
            const freightPerKgGNF = updated.freightPerKgGNF ?? (updated.freightPerKg ?? 0) * USD_TO_GNF;
            const dailyAdBudgetUSD = updated.dailyAdBudgetUSD ?? (updated.dailyAdBudgetGNF !== undefined ? updated.dailyAdBudgetGNF / USD_TO_GNF : updated.estimatedCpa ?? 0);
            const adDays = updated.adDays ?? 1;
            return {
              ...updated,
              freightPerKgGNF,
              dailyAdBudgetUSD,
              adDays,
              suggestedPrice: calcSuggestedPrice(
                updated.purchasePrice,
                updated.weight,
                freightPerKgGNF,
                dailyAdBudgetUSD,
                adDays,
                updated.targetMargin
              ),
            };
          }),
        })),

      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
    }),
    {
      name: 'product-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
