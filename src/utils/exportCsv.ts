import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Transaction, CATEGORY_LABELS } from '@/store/useCapitalStore';
import { USD_TO_GNF, PAYMENT_METHOD_LABELS } from '@/constants/currency';

/**
 * Génère un CSV des transactions et ouvre le share sheet natif.
 * @param transactions - Liste complète des transactions
 * @param liveRate - Taux USD→GNF en vigueur (optionnel, fallback sur 8600)
 */
export async function exportTransactionsToCSV(
  transactions: Transaction[],
  liveRate: number = USD_TO_GNF
): Promise<void> {
  if (transactions.length === 0) {
    throw new Error('Aucune transaction à exporter.');
  }

  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const header = [
    'Date',
    'Type',
    'Catégorie',
    'Moyen de paiement',
    'Montant USD',
    'Montant GNF',
    'Description',
  ].join(',');

  const rows = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((t) =>
      [
        escape(new Date(t.date).toLocaleDateString('fr-FR')),
        escape(t.type === 'INCOME' ? 'Dépôt' : 'Retrait'),
        escape(CATEGORY_LABELS[t.category]),
        escape(PAYMENT_METHOD_LABELS[t.paymentMethod]),
        t.amount.toFixed(2),
        Math.round(t.amount * liveRate).toString(),
        escape(t.description ?? ''),
      ].join(',')
    )
    .join('\n');

  const csv = `${header}\n${rows}`;
  const filename = `meta-capital-${new Date().toISOString().slice(0, 10)}.csv`;
  const file = new File(Paths.document, filename);

  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exporter les transactions',
  });
}
