import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { calcSuggestedPrice, useProductStore } from '@/store/useProductStore';
import { USD_TO_GNF } from '@/constants/currency';
import { useCapitalStore } from '@/store/useCapitalStore';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { PaymentMethod, PAYMENT_METHOD_COLORS, PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/constants/currency';

const methods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const numberValue = (value: string) => parseFloat(value.replace(',', '.')) || 0;

export default function SalesScreen() {
  const products = useProductStore((state) => state.products);
  const addTransaction = useCapitalStore((state) => state.addTransaction);
  const { rate } = useExchangeRate();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ORANGE_MONEY');

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const grossGNF = numberValue(salePrice) * Math.max(1, Math.floor(numberValue(quantity)));
  const deliveryGNF = numberValue(deliveryFee) * Math.max(1, Math.floor(numberValue(quantity)));
  const netGNF = Math.max(0, grossGNF - deliveryGNF);
  const productFreightGNF = selectedProduct?.freightPerKgGNF ?? (selectedProduct?.freightPerKg ?? 0) * USD_TO_GNF;
  const productAdBudgetUSD = selectedProduct?.dailyAdBudgetUSD ?? (selectedProduct?.dailyAdBudgetGNF !== undefined ? selectedProduct.dailyAdBudgetGNF / USD_TO_GNF : selectedProduct?.estimatedCpa ?? 0);
  const productAdDays = selectedProduct?.adDays ?? 1;
  const productCostUSD = selectedProduct
    ? selectedProduct.purchasePrice + (selectedProduct.weight * productFreightGNF) / rate + productAdBudgetUSD * productAdDays
    : 0;
  const profitUSD = netGNF / rate - productCostUSD * Math.max(1, Math.floor(numberValue(quantity)));
  const profitMargin = netGNF > 0 && selectedProduct ? (profitUSD / (netGNF / rate)) * 100 : null;

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

    addTransaction({
      amount: netGNF / rate,
      currency: 'GNF',
      originalAmount: netGNF,
      type: 'INCOME',
      category: 'SALES_REVENUE',
      paymentMethod,
      description: `Vente${selectedProduct ? ` · ${selectedProduct.title}` : ''} · ${saleQuantity} unité(s) · ${Math.round(grossGNF).toLocaleString('fr-FR')} GNF - livreur ${Math.round(deliveryGNF).toLocaleString('fr-FR')} GNF`,
    });
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

          {selectedProduct && <Text style={styles.suggestion}>Prix conseillé indicatif : {Math.round(calcSuggestedPrice(selectedProduct.purchasePrice, selectedProduct.weight, productFreightGNF, productAdBudgetUSD, productAdDays, selectedProduct.targetMargin, rate) * rate).toLocaleString('fr-FR')} GNF. Tu peux choisir n’importe quel autre prix.</Text>}

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
});
