import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  weight: number;         // Poids unitaire en kg
  freightPerKg: number;   // Frais de transitaire par kilo (en USD)
  estimatedCpa: number;
  targetMargin: number; // 0.0 → 1.0
  suggestedPrice: number;
  status: ProductStatus;
}

/**
 * Frais port = weight * freightPerKg
 * CUT = purchasePrice + Frais port + estimatedCpa
 * Prix de vente = CUT / (1 - targetMargin)
 */
export function calcSuggestedPrice(
  purchasePrice: number,
  weight: number,
  freightPerKg: number,
  estimatedCpa: number,
  targetMargin: number
): number {
  const shippingCost = weight * freightPerKg;
  const cut = purchasePrice + shippingCost + estimatedCpa;
  if (targetMargin >= 1) return cut;
  return cut / (1 - targetMargin);
}

type ProductInput = Omit<Product, 'id' | 'suggestedPrice'>;

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
        set((s) => ({
          products: [
            {
              ...p,
              id: Math.random().toString(36).slice(2),
              suggestedPrice: calcSuggestedPrice(
                p.purchasePrice,
                p.weight,
                p.freightPerKg,
                p.estimatedCpa,
                p.targetMargin
              ),
            },
            ...s.products,
          ],
        })),

      updateProduct: (id, updates) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const updated = { ...p, ...updates };
            return {
              ...updated,
              suggestedPrice: calcSuggestedPrice(
                updated.purchasePrice,
                updated.weight,
                updated.freightPerKg,
                updated.estimatedCpa,
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
