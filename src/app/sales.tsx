import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS, PaymentMethod, StandardPaymentMethod, USD_TO_GNF } from '@/constants/currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useCapitalStore } from '@/store/useCapitalStore';
import { calcSuggestedPrice, useProductStore } from '@/store/useProductStore';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const methods = Object.keys(PAYMENT_METHOD_LABELS) as StandardPaymentMethod[];
const numberValue = (value: string) => parseFloat(value.replace(',', '.')) || 0;

export default function SalesScreen() {
  const products = useProductStore((state) => state.products);
  const decrementQuantity = useProductStore((state) => state.decrementQuantity);
  const { transactions, addTransaction } = useCapitalStore((state) => ({ transactions: state.transactions, addTransaction: state.addTransaction }));
  const { rate } = useExchangeRate();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ORANGE_MONEY');
  const [historyFilter, setHistoryFilter] = useState<'TODAY' | 'WEEK' | 'ALL'>('TODAY');

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const grossGNF = numberValue(salePrice) * Math.max(1, Math.floor(numberValue(quantity)));
  const deliveryGNF = numberValue(deliveryFee) * Math.max(1, Math.floor(numberValue(quantity)));
  const netGNF = Math.max(0, grossGNF - deliveryGNF);
  const productFreightGNF = selectedProduct?.freightPerKgGNF ?? (selectedProduct?.freightPerKg ?? 0) * USD_TO_GNF;
  const productAdBudgetUSD = selectedProduct?.dailyAdBudgetUSD ?? (selectedProduct?.dailyAdBudgetGNF !== undefined ? selectedProduct.dailyAdBudgetGNF / USD_TO_GNF : selectedProduct?.estimatedCpa ?? 0);
  const productAdDays = selectedProduct?.adDays ?? 1;
  const productCostUSD = selectedProduct
    ? selectedProduct.purchasePrice + (selectedProduct.weight * productFreightGNF) / rate + (productAdBudgetUSD * productAdDays) / Math.max(selectedProduct.quantity, 1)
    : 0;
  const profitUSD = netGNF / rate - productCostUSD * Math.max(1, Math.floor(numberValue(quantity)));
  const profitMargin = netGNF > 0 && selectedProduct ? (profitUSD / (netGNF / rate)) * 100 : null;
  const sales = transactions.filter((transaction) => transaction.category === 'SALES_REVENUE');
  const [now] = useState(() => Date.now());
  const filteredSales = sales.filter((transaction) => {
    const age = now - new Date(transaction.date).getTime();
    return historyFilter === 'TODAY'
      ? new Date(transaction.date).toDateString() === new Date().toDateString()
      : historyFilter === 'WEEK' ? age <= 7 * 24 * 60 * 60 * 1000 : true;
  });
  const todaySales = sales.filter((transaction) => new Date(transaction.date).toDateString() === new Date().toDateString());
  const todayGrossGNF = todaySales.reduce((sum, transaction) => sum + (transaction.saleGrossGNF ?? transaction.originalAmount), 0);
  const todayDeliveryGNF = todaySales.reduce((sum, transaction) => sum + (transaction.deliveryFeeGNF ?? 0), 0);
  const todayNetGNF = todaySales.reduce((sum, transaction) => sum + transaction.amount * rate, 0);
  const paymentTotals = methods.map((method) => ({ method, total: todaySales.filter((sale) => sale.paymentMethod === method).reduce((sum, sale) => sum + sale.amount * rate, 0) }));

  const selectProduct = (id: string) => {
    const product = products.find((item) => item.id === id);
    setSelectedProductId(id);
    if (product) {
      const suggestedPrice = calcSuggestedPrice(
        product.purchasePrice,
        product.weight,
        product.freightPerKgGNF ?? (product.freightPerKg ?? 0) * USD_TO_GNF,
        product.dailyAdBudgetUSD ?? (product.dailyAdBudgetGNF !== undefined ? product.dailyAdBudgetGNF / USD_TO_GNF : product.estimatedCpa ?? 0),
        product.adDays ?? 1,
        product.quantity,
        product.targetMargin,
        rate
      );
      setSalePrice(Math.round(suggestedPrice * rate).toString());
    }
  };

  const handleSale = () => {
    const saleQuantity = Math.floor(numberValue(quantity));
    if (numberValue(salePrice) <= 0 || saleQuantity <= 0) {
      Alert.alert('Vente invalide', 'Entre un prix de vente et une quantité positifs.');
      return;
    }
    if (deliveryGNF > grossGNF) {
      Alert.alert('Frais trop élevés', 'Le livreur ne peut pas coûter plus que la vente.');
      return;
    }
    if (selectedProduct && selectedProduct.quantity > 0 && saleQuantity > selectedProduct.quantity) {
      Alert.alert('Stock insuffisant', `Il reste ${selectedProduct.quantity} unité(s) de ce produit.`);
      return;
    }

    addTransaction({
      amount: netGNF / rate,
      currency: 'GNF',
      originalAmount: netGNF,
      type: 'INCOME',
      category: 'SALES_REVENUE',
      paymentMethod,
      productId: selectedProduct?.id,
      productTitle: selectedProduct?.title,
      saleQuantity,
      saleGrossGNF: grossGNF,
      deliveryFeeGNF: deliveryGNF,
      profitUSD: selectedProduct ? profitUSD : undefined,
      description: `Vente${selectedProduct ? ` · ${selectedProduct.title}` : ''} · ${saleQuantity} unité(s) · ${Math.round(grossGNF).toLocaleString('fr-FR')} GNF - livreur ${Math.round(deliveryGNF).toLocaleString('fr-FR')} GNF`,
    });
    if (selectedProduct) decrementQuantity(selectedProduct.id, saleQuantity);
    setSalePrice('');
    setDeliveryFee('');
    setQuantity('1');
    setSelectedProductId(null);
    Alert.alert('Vente enregistrée', `+${Math.round(netGNF).toLocaleString('fr-FR')} GNF ajoutés au capital.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Journal commercial</Text>
        <Text style={styles.title}>Ventes du jour</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quel produit as-tu vendu ?</Text>
          {products.length === 0 ? (
            <Text style={styles.muted}>Ajoute d’abord un produit dans l’onglet Produits.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
              <TouchableOpacity style={[styles.productChip, !selectedProductId && styles.productChipActive]} onPress={() => setSelectedProductId(null)}>
                <Ionicons name="receipt-outline" size={15} color={!selectedProductId ? '#fff' : '#6b7280'} />
                <Text style={[styles.chipText, !selectedProductId && styles.chipTextActive]}>Vente libre</Text>
              </TouchableOpacity>
              {products.filter((product) => product.status !== 'ARCHIVED').map((product) => {
                const active = selectedProductId === product.id;
                return (
                  <TouchableOpacity key={product.id} style={[styles.productChip, active && styles.productChipActive]} onPress={() => selectProduct(product.id)}>
                    <Ionicons name="cube-outline" size={15} color={active ? '#fff' : '#6b7280'} />
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{product.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Encaissement en GNF</Text>
          <Text style={styles.helper}>Le prix conseillé est une référence. Saisis ici le prix réellement payé par le client.</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldWide}>
              <Text style={styles.label}>Prix réel de vente</Text>
              <View style={styles.inputWrap}><TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="number-pad" placeholder="0" placeholderTextColor="#4b5563" /><Text style={styles.unit}>GNF</Text></View>
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Quantité</Text>
              <View style={styles.inputWrap}><TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" /><Text style={styles.unit}>x</Text></View>
            </View>
          </View>
          <View style={styles.fieldWide}>
            <Text style={styles.label}>Frais du livreur</Text>
            <View style={styles.inputWrap}><TextInput style={styles.input} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="number-pad" placeholder="0" placeholderTextColor="#4b5563" /><Text style={styles.unit}>GNF / unité</Text></View>
          </View>

          {selectedProduct && <Text style={styles.suggestion}>Prix conseillé indicatif : {Math.round(calcSuggestedPrice(selectedProduct.purchasePrice, selectedProduct.weight, productFreightGNF, productAdBudgetUSD, productAdDays, selectedProduct.quantity, selectedProduct.targetMargin, rate) * rate).toLocaleString('fr-FR')} GNF. Tu peux choisir n’importe quel autre prix.</Text>}

          <View style={styles.netBox}>
            <View><Text style={styles.netLabel}>Net ajouté au capital</Text><Text style={styles.netHint}>Après déduction du livreur</Text></View>
            <View><Text style={styles.netValue}>{Math.round(netGNF).toLocaleString('fr-FR')} GNF</Text><Text style={styles.netUsd}>≈ {(netGNF / rate).toFixed(2)} $</Text></View>
          </View>
          {profitMargin !== null && <View style={styles.profitRow}><Text style={styles.profitLabel}>Bénéfice estimé après coûts</Text><Text style={[styles.profitValue, { color: profitUSD >= 0 ? '#34d399' : '#f87171' }]}>{profitUSD >= 0 ? '+' : ''}{profitUSD.toFixed(2)} $ · marge {profitMargin.toFixed(1)}%</Text></View>}

          <Text style={styles.label}>Paiement reçu par</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentRow}>
            {methods.map((method) => {
              const active = method === paymentMethod;
              const color = PAYMENT_METHOD_COLORS[method];
              return <TouchableOpacity key={method} style={[styles.paymentChip, active && { borderColor: color, backgroundColor: `${color}20` }]} onPress={() => setPaymentMethod(method)}><Ionicons name={PAYMENT_METHOD_ICONS[method] as any} size={14} color={active ? color : '#6b7280'} /><Text style={[styles.chipText, active && { color }]}>{PAYMENT_METHOD_LABELS[method]}</Text></TouchableOpacity>;
            })}
          </ScrollView>
          <TouchableOpacity style={styles.submit} onPress={handleSale}><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.submitText}>Enregistrer la vente</Text></TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Ventes du jour</Text><Text style={styles.summaryValue}>{todaySales.length}</Text><Text style={styles.summaryHint}>opération(s)</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Brut</Text><Text style={styles.summaryValue}>{Math.round(todayGrossGNF).toLocaleString('fr-FR')}</Text><Text style={styles.summaryHint}>GNF</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Livreurs</Text><Text style={styles.summaryValue}>{Math.round(todayDeliveryGNF).toLocaleString('fr-FR')}</Text><Text style={styles.summaryHint}>GNF</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Net</Text><Text style={[styles.summaryValue, styles.netSummary]}>{Math.round(todayNetGNF).toLocaleString('fr-FR')}</Text><Text style={styles.summaryHint}>GNF</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Répartition des encaissements</Text>
          {paymentTotals.filter((item) => item.total > 0).map(({ method, total }) => <View key={method} style={styles.paymentTotalRow}><Text style={styles.paymentTotalName}>{PAYMENT_METHOD_LABELS[method]}</Text><Text style={styles.paymentTotalValue}>{Math.round(total).toLocaleString('fr-FR')} GNF</Text></View>)}
          {todaySales.length === 0 && <Text style={styles.muted}>Aucune vente aujourd’hui.</Text>}
        </View>

        <View style={styles.historyHeader}><Text style={styles.sectionTitle}>Historique des ventes</Text><View style={styles.historyFilters}>{(['TODAY', 'WEEK', 'ALL'] as const).map((filter) => <TouchableOpacity key={filter} style={[styles.historyFilter, historyFilter === filter && styles.historyFilterActive]} onPress={() => setHistoryFilter(filter)}><Text style={[styles.historyFilterText, historyFilter === filter && styles.historyFilterTextActive]}>{filter === 'TODAY' ? 'Aujourd’hui' : filter === 'WEEK' ? '7 jours' : 'Tout'}</Text></TouchableOpacity>)}</View></View>
        {filteredSales.map((sale) => <View key={sale.id} style={styles.historyCard}><View style={styles.historyMain}><Text style={styles.historyProduct}>{sale.productTitle ?? 'Vente libre'}</Text><Text style={styles.historyDate}>{new Date(sale.date).toLocaleDateString('fr-FR')} · {sale.saleQuantity ?? 1} unité(s)</Text></View><View><Text style={styles.historyNet}>{Math.round(sale.amount * rate).toLocaleString('fr-FR')} GNF</Text><Text style={styles.historyDetail}>brut {Math.round(sale.saleGrossGNF ?? sale.originalAmount).toLocaleString('fr-FR')} · livreur {Math.round(sale.deliveryFeeGNF ?? 0).toLocaleString('fr-FR')}</Text></View></View>)}
        {filteredSales.length === 0 && <Text style={styles.muted}>Aucune vente dans cette période.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  content: { padding: 16, paddingBottom: 100, gap: 12 },
  subtitle: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  title: { color: '#f9fafb', fontSize: 27, fontWeight: '800', marginBottom: 4 },
  rateBar: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#1a1400', borderColor: '#2a2000', borderWidth: 1, borderRadius: 10, padding: 10 },
  rateText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#0f172a', borderRadius: 18, borderWidth: 1, borderColor: '#1f2937', padding: 16, gap: 12 },
  sectionTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '800' },
  helper: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  suggestion: { color: '#60a5fa', fontSize: 11, lineHeight: 16 },
  muted: { color: '#64748b', fontSize: 13 },
  productRow: { gap: 7 },
  productChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 190, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
  productChipActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  chipText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldWide: { flex: 1, gap: 5 },
  fieldSmall: { width: 82, gap: 5 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 11, borderWidth: 1, borderColor: '#263449', paddingHorizontal: 11 },
  input: { flex: 1, color: '#f9fafb', fontSize: 15, paddingVertical: 12 },
  unit: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  netBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#052e2b', borderRadius: 13, borderWidth: 1, borderColor: '#0f766e', padding: 13 },
  netLabel: { color: '#99f6e4', fontSize: 12, fontWeight: '800' },
  netHint: { color: '#5eead4', fontSize: 10, marginTop: 3 },
  netValue: { color: '#5eead4', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  netUsd: { color: '#99f6e4', fontSize: 11, textAlign: 'right', marginTop: 2 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 11 },
  profitLabel: { color: '#94a3b8', fontSize: 11 },
  profitValue: { fontSize: 12, fontWeight: '800' },
  paymentRow: { gap: 7 },
  paymentChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 14 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: { width: '48%', backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 12, gap: 4 },
  summaryLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  summaryValue: { color: '#f9fafb', fontSize: 16, fontWeight: '800' },
  netSummary: { color: '#34d399' },
  summaryHint: { color: '#64748b', fontSize: 10 },
  paymentTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  paymentTotalName: { color: '#cbd5e1', fontSize: 12 },
  paymentTotalValue: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },
  historyHeader: { gap: 10, marginTop: 4 },
  historyFilters: { flexDirection: 'row', gap: 6 },
  historyFilter: { backgroundColor: '#111827', borderRadius: 9, borderWidth: 1, borderColor: '#1f2937', paddingHorizontal: 10, paddingVertical: 7 },
  historyFilterActive: { backgroundColor: '#1e3a5f', borderColor: '#2563eb' },
  historyFilterText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  historyFilterTextActive: { color: '#dbeafe' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 13 },
  historyMain: { flex: 1, gap: 4 },
  historyProduct: { color: '#f9fafb', fontSize: 13, fontWeight: '800' },
  historyDate: { color: '#64748b', fontSize: 10 },
  historyNet: { color: '#34d399', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  historyDetail: { color: '#64748b', fontSize: 9, textAlign: 'right', marginTop: 3 },
});
