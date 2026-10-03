import { StandardPaymentMethod } from '@/constants/currency';
import { TransactionCategory } from '@/store/useCapitalStore';

export interface ParsedSMS {
  provider: 'ORANGE_MONEY' | 'CARTE_BANCAIRE';
  type: 'INCOME' | 'EXPENSE';
  amountGNF: number;
  paymentMethod: StandardPaymentMethod;
  category: TransactionCategory;
  description: string;
  reference?: string;
  feeGNF?: number;
  newBalanceGNF?: number;
  rawText: string;
}

/** Nettoie et convertit une chaîne représentant un montant en nombre (ex: "100 000.00" -> 100000) */
export function parseGNFAmount(str: string): number {
  if (!str) return 0;
  // Enlever espaces et séparateurs de milliers
  const cleaned = str.replace(/\s+/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/** Nettoie une référence (enlève le point final si présent) */
function cleanReference(ref?: string): string | undefined {
  if (!ref) return undefined;
  return ref.trim().replace(/\.+$/, '');
}

/** Auto-détection intelligente de la catégorie */
export function detectCategory(description: string, type: 'INCOME' | 'EXPENSE'): TransactionCategory {
  const upper = description.toUpperCase();
  if (
    upper.includes('FACEBK') ||
    upper.includes('FACEBOOK') ||
    upper.includes('META') ||
    upper.includes('PUB') ||
    upper.includes('ADS') ||
    upper.includes('TIKTOK')
  ) {
    return 'ADVERTISING';
  }
  if (
    upper.includes('STOCK') ||
    upper.includes('ACHAT STOCK') ||
    upper.includes('FOURNISSEUR') ||
    upper.includes('MARCHANDISE')
  ) {
    return 'PRODUCT_PURCHASE';
  }
  if (type === 'INCOME') {
    if (upper.includes('VENTE') || upper.includes('CLIENT') || upper.includes('RECETTE')) {
      return 'SALES_REVENUE';
    }
    if (upper.includes('FAMILLE') || upper.includes('AIDE')) {
      return 'FAMILY_SUPPORT';
    }
    return 'PERSONAL_FUNDS';
  } else {
    return 'PERSONAL_EXPENSE';
  }
}

/**
 * Analyse un SMS unique d'Orange Money ou PayCard
 */
export function parseSingleSMS(text: string): ParsedSMS | null {
  if (!text || !text.trim()) return null;
  const rawText = text.trim();

  // --- 1. ORANGE MONEY ---
  if (/Orange Money|Orange vous remercie|Orange/i.test(rawText) || /reception de:|Envoi de:|Retrait de|paiement/i.test(rawText)) {
    // 1.1 Orange Money - Paiement chez marchand
    // Ex: "Bonjour,vous venez d efectuar un paiement de 14000.00GNF chez Achat de pass pour tiers2.Frais 0.00GNF, Nouveau Solde 13432045.55GNF, Ref :MP261002.1231.B32921. Orange Money vous remercie."
    const omPaiement = /vous venez d[\s\w']+\s*un paiement de\s*([\d\s.,]+)\s*GNF chez\s*(.*?)\.\s*Frais\s*[:\s]*([\d\s.,]+)\s*GNF,\s*Nouveau Solde\s*[:\s]*([\d\s.,]+)\s*GNF,\s*Ref\s*[:\s]*([A-Z0-9.-]+)/i.exec(rawText);
    if (omPaiement) {
      const amountGNF = parseGNFAmount(omPaiement[1]);
      const merchant = omPaiement[2].trim();
      const feeGNF = parseGNFAmount(omPaiement[3]);
      const newBalanceGNF = parseGNFAmount(omPaiement[4]);
      const reference = cleanReference(omPaiement[5]);
      const description = `Paiement chez ${merchant}`;
      return {
        provider: 'ORANGE_MONEY',
        type: 'EXPENSE',
        amountGNF,
        paymentMethod: 'ORANGE_MONEY',
        category: detectCategory(merchant, 'EXPENSE'),
        description,
        reference,
        feeGNF,
        newBalanceGNF,
        rawText,
      };
    }

    // 1.2 Orange Money - Réception de fonds
    // Ex: "Bonjour, reception de: 120000.00GNF de la part du 629771290,Nouveau Solde :13446045.55GNF, reference:PP261001.2245.B20256. Orange Money vous remercie"
    const omReception = /reception de\s*[:\s]*([\d\s.,]+)\s*GNF de la part du\s*(.*?)\s*,\s*Nouveau Solde\s*[:\s]*([\d\s.,]+)\s*GNF,\s*reference\s*[:\s]*([A-Z0-9.-]+)/i.exec(rawText);
    if (omReception) {
      const amountGNF = parseGNFAmount(omReception[1]);
      const sender = omReception[2].trim();
      const newBalanceGNF = parseGNFAmount(omReception[3]);
      const reference = cleanReference(omReception[4]);
      const description = `Réception de ${sender}`;
      return {
        provider: 'ORANGE_MONEY',
        type: 'INCOME',
        amountGNF,
        paymentMethod: 'ORANGE_MONEY',
        category: detectCategory(description, 'INCOME'),
        description,
        reference,
        newBalanceGNF,
        rawText,
      };
    }

    // 1.3 Orange Money - Envoi de fonds
    // Ex: "Bonjour,Envoi de:31000.00GNF vers le 628831338, Frais:500.00GNF, Nouveau Solde: 1492250.00GNF, reference:PP260930.1237.C76715. Orange Money vous remercie"
    const omEnvoi = /Envoi de\s*[:\s]*([\d\s.,]+)\s*GNF vers le\s*(.*?)\s*,\s*Frais\s*[:\s]*([\d\s.,]+)\s*GNF,\s*Nouveau Solde\s*[:\s]*([\d\s.,]+)\s*GNF,\s*reference\s*[:\s]*([A-Z0-9.-]+)/i.exec(rawText);
    if (omEnvoi) {
      const amountGNF = parseGNFAmount(omEnvoi[1]);
      const recipient = omEnvoi[2].trim();
      const feeGNF = parseGNFAmount(omEnvoi[3]);
      const newBalanceGNF = parseGNFAmount(omEnvoi[4]);
      const reference = cleanReference(omEnvoi[5]);
      const description = `Envoi vers ${recipient}`;
      return {
        provider: 'ORANGE_MONEY',
        type: 'EXPENSE',
        amountGNF,
        paymentMethod: 'ORANGE_MONEY',
        category: detectCategory(description, 'EXPENSE'),
        description,
        reference,
        feeGNF,
        newBalanceGNF,
        rawText,
      };
    }

    // 1.4 Orange Money - Retrait d'argent
    // Ex: "5Bonjour,Retrait de 110000.00GNF emis par le 628845446 ,Frais 1100.00GNF,reference:CO260921.1524.A67895,nouveau Solde 2214250.00GNF. Orange vous remercie"
    const omRetrait = /Retrait de\s*([\d\s.,]+)\s*GNF emis par le\s*(.*?)\s*,?\s*Frais\s*[:\s]*([\d\s.,]+)\s*GNF,\s*reference\s*[:\s]*([A-Z0-9.-]+)\s*,?\s*nouveau Solde\s*[:\s]*([\d\s.,]+)\s*GNF/i.exec(rawText);
    if (omRetrait) {
      const amountGNF = parseGNFAmount(omRetrait[1]);
      const agent = omRetrait[2].trim();
      const feeGNF = parseGNFAmount(omRetrait[3]);
      const reference = cleanReference(omRetrait[4]);
      const newBalanceGNF = parseGNFAmount(omRetrait[5]);
      const description = `Retrait émis par ${agent}`;
      return {
        provider: 'ORANGE_MONEY',
        type: 'EXPENSE',
        amountGNF,
        paymentMethod: 'ORANGE_MONEY',
        category: detectCategory(description, 'EXPENSE'),
        description,
        reference,
        feeGNF,
        newBalanceGNF,
        rawText,
      };
    }
  }

  // --- 2. PAYCARD (CARTE BANCAIRE) ---
  if (/PAYCARD|FACEBK|recu un depot|paiement VISA/i.test(rawText)) {
    // 2.1 PayCard - Dépôt reçu
    // Ex: "Vous avez recu un depot de 100 000 GNF de OFMG. Reference: 2610-GGWUGU. Solde : 142 300 GNF"
    const paycardDepot = /Vous avez recu un depot de\s*([\d\s.,]+)\s*GNF de\s*(.*?)\.\s*Reference\s*[:\s]*([A-Z0-9.-]+)\.\s*Solde\s*[:\s]*([\d\s.,]+)\s*GNF/i.exec(rawText);
    if (paycardDepot) {
      const amountGNF = parseGNFAmount(paycardDepot[1]);
      const sender = paycardDepot[2].trim();
      const reference = cleanReference(paycardDepot[3]);
      const newBalanceGNF = parseGNFAmount(paycardDepot[4]);
      const description = `Dépôt de ${sender}`;
      return {
        provider: 'CARTE_BANCAIRE',
        type: 'INCOME',
        amountGNF,
        paymentMethod: 'CARTE_BANCAIRE',
        category: detectCategory(sender, 'INCOME'),
        description,
        reference,
        newBalanceGNF,
        rawText,
      };
    }

    // 2.2 PayCard - Paiement VISA
    // Ex: "vous avez effectue un paiement VISA a FACEBK *WBYAA8J8S4 Dublin IE de 93 400 GNF. Reference: 2610-98VR9W. Solde : 48 900 GNF."
    const paycardPaiement = /vous avez effectue un paiement VISA a\s*(.*?)\s+de\s+([\d\s.,]+)\s*GNF\.\s*Reference\s*[:\s]*([A-Z0-9.-]+)\.\s*Solde\s*[:\s]*([\d\s.,]+)\s*GNF/i.exec(rawText);
    if (paycardPaiement) {
      const merchant = paycardPaiement[1].trim();
      const amountGNF = parseGNFAmount(paycardPaiement[2]);
      const reference = cleanReference(paycardPaiement[3]);
      const newBalanceGNF = parseGNFAmount(paycardPaiement[4]);
      const description = `Paiement VISA ${merchant}`;
      return {
        provider: 'CARTE_BANCAIRE',
        type: 'EXPENSE',
        amountGNF,
        paymentMethod: 'CARTE_BANCAIRE',
        category: detectCategory(merchant, 'EXPENSE'),
        description,
        reference,
        newBalanceGNF,
        rawText,
      };
    }
  }

  // --- Fallback générique si le format exact a de légères variations ---
  // Chercher un montant GNF + un mot clé dépôt/retrait/paiement
  const genericAmountMatch = /([\d\s]{1,12}(?:[.,]\d{1,2})?)\s*GNF/i.exec(rawText);
  if (genericAmountMatch) {
    const amountGNF = parseGNFAmount(genericAmountMatch[1]);
    if (amountGNF > 0) {
      const isIncome = /reception|depot|recu|crédit/i.test(rawText);
      const isPaycard = /VISA|PAYCARD|FACEBK/i.test(rawText);
      const isOrange = /Orange/i.test(rawText) || !isPaycard;

      const refMatch = /(?:reference|ref)\s*[:\s]*([A-Z0-9.-]+)/i.exec(rawText);
      const ref = cleanReference(refMatch ? refMatch[1] : undefined);

      return {
        provider: isOrange ? 'ORANGE_MONEY' : 'CARTE_BANCAIRE',
        type: isIncome ? 'INCOME' : 'EXPENSE',
        amountGNF,
        paymentMethod: isOrange ? 'ORANGE_MONEY' : 'CARTE_BANCAIRE',
        category: detectCategory(rawText, isIncome ? 'INCOME' : 'EXPENSE'),
        description: isOrange
          ? (isIncome ? 'Dépôt Orange Money' : 'Paiement / Retrait Orange Money')
          : (isIncome ? 'Dépôt Carte Bancaire' : 'Paiement Carte Bancaire'),
        reference: ref,
        rawText,
      };
    }
  }

  return null;
}

/**
 * Découpe un texte contenant un ou plusieurs SMS et retourne la liste des SMS valides analysés
 */
export function parseSMSBatch(text: string): ParsedSMS[] {
  if (!text || !text.trim()) return [];

  // Découper par ligne ou bloc
  // On sépare sur les occurrences de "Bonjour" ou "Vous avez" ou fins de phrases
  const lines = text
    .split(/(?=\b(?:Bonjour|Vous avez|vous avez|\d+Bonjour)\b)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const results: ParsedSMS[] = [];
  for (const line of lines) {
    const parsed = parseSingleSMS(line);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
