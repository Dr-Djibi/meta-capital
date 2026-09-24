// Secours hors-ligne uniquement. Le taux en ligne vient de useExchangeRate().
export const USD_TO_GNF = 8600;

export type Currency = 'USD' | 'GNF';

export type PaymentMethod =
  | 'ORANGE_MONEY'
  | 'CARTE_BANCAIRE'
  | 'ESPECES'
  | 'VIREMENT';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ORANGE_MONEY: 'Orange Money',
  CARTE_BANCAIRE: 'Carte bancaire',
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  ORANGE_MONEY: 'phone-portrait-outline',
  CARTE_BANCAIRE: 'card-outline',
  ESPECES: 'cash-outline',
  VIREMENT: 'swap-horizontal-outline',
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  ORANGE_MONEY: '#f97316',
  CARTE_BANCAIRE: '#6366f1',
  ESPECES: '#22c55e',
  VIREMENT: '#3b82f6',
};

/** Convertit un montant dans une devise en USD */
export function toUSD(amount: number, currency: Currency, usdToGnf = USD_TO_GNF): number {
  if (currency === 'USD') return amount;
  return amount / usdToGnf;
}

/** Convertit un montant dans une devise en GNF */
export function toGNF(amount: number, currency: Currency, usdToGnf = USD_TO_GNF): number {
  if (currency === 'GNF') return amount;
  return amount * usdToGnf;
}

/** Formate un montant en USD */
export function formatUSD(amount: number): string {
  if (Math.abs(amount) < 0.01) return '0.00 $';
  return `${amount.toFixed(2)} $`;
}

/** Formate un montant en GNF */
export function formatGNF(amount: number): string {
  if (Math.abs(amount) < 1) return '0 GNF';
  return `${Math.round(amount).toLocaleString('fr-FR')} GNF`;
}

/** Retourne les 2 devises formatées depuis un montant USD */
export function formatDual(amountUSD: number, usdToGnf = USD_TO_GNF): { usd: string; gnf: string } {
  return {
    usd: formatUSD(amountUSD),
    gnf: formatGNF(amountUSD * usdToGnf),
  };
}
