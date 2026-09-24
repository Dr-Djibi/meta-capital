import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  useCapitalStore,
  TransactionCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  Transaction,
} from '@/store/useCapitalStore';
import {
  Currency,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
  toUSD,
  USD_TO_GNF,
} from '@/constants/currency';

const INCOME_CATEGORIES: TransactionCategory[] = [
  'INITIAL_BALANCE',
  'PERSONAL_FUNDS',
  'FAMILY_SUPPORT',
  'SALES_REVENUE',
];
const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'ADVERTISING',
  'PRODUCT_PURCHASE',
  'PERSONAL_EXPENSE',
];

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'ORANGE_MONEY',
  'CARTE_BANCAIRE',
  'ESPECES',
  'VIREMENT',
];

interface TransactionFormProps {
  liveRate?: number;
  onComplete?: () => void;
  initialTransaction?: Transaction;
}

export function TransactionForm({ liveRate = USD_TO_GNF, onComplete, initialTransaction }: TransactionFormProps) {
  const addTransaction = useCapitalStore((s) => s.addTransaction);
  const updateTransaction = useCapitalStore((s) => s.updateTransaction);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialTransaction?.type ?? 'INCOME');
  const [amount, setAmount] = useState(initialTransaction?.originalAmount.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(initialTransaction?.currency ?? 'USD');
  const [description, setDescription] = useState(initialTransaction?.description ?? '');
  const [category, setCategory] = useState<TransactionCategory>(initialTransaction?.category ?? 'PERSONAL_FUNDS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialTransaction?.paymentMethod ?? 'ORANGE_MONEY');

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (t: 'INCOME' | 'EXPENSE') => {
    setType(t);
    setCategory(t === 'INCOME' ? 'PERSONAL_FUNDS' : 'ADVERTISING');
  };

  // Calcul de la conversion en direct (utilise le taux live si disponible)
  const parsed = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(parsed) && parsed > 0;
  const convertedLabel = isValidAmount
    ? currency === 'USD'
      ? `≈ ${Math.round(parsed * liveRate).toLocaleString('fr-FR')} GNF`
      : `≈ ${(parsed / liveRate).toFixed(2)} $`
    : null;

  // Animation du bouton submit
  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const handleSubmit = () => {
    if (!isValidAmount) {
      Alert.alert('Montant invalide', 'Entre un montant positif.');
      return;
    }
    const amountInUSD = toUSD(parsed, currency, liveRate);
    const transactionData = {
      amount: amountInUSD,
      currency,
      originalAmount: parsed,
      type,
      category,
      paymentMethod,
      description,
    };
    if (initialTransaction) {
      updateTransaction(initialTransaction.id, transactionData);
    } else {
      addTransaction(transactionData);
    }
    // Animation de succès
    submitScale.value = withSequence(
      withTiming(0.93, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 200 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setDescription('');

    if (onComplete) {
      setTimeout(onComplete, 300); // slight delay to show the animation before closing
    }
  };

  return (
    <View style={styles.card}>
      {/* Type toggle — Dépôt / Retrait */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, type === 'INCOME' && styles.incomeActive]}
          onPress={() => handleTypeSwitch('INCOME')}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={18}
            color={type === 'INCOME' ? '#fff' : '#6b7280'}
          />
          <Text style={[styles.toggleText, type === 'INCOME' && styles.toggleTextActive]}>
            Dépôt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, type === 'EXPENSE' && styles.expenseActive]}
          onPress={() => handleTypeSwitch('EXPENSE')}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={18}
            color={type === 'EXPENSE' ? '#fff' : '#6b7280'}
          />
          <Text style={[styles.toggleText, type === 'EXPENSE' && styles.toggleTextActive]}>
            Retrait
          </Text>
        </TouchableOpacity>
      </View>

      {/* Montant + Sélecteur de devise */}
      <View style={styles.amountBlock}>
        <View style={styles.amountRow}>
          <View style={styles.inputWrapper}>
            <Ionicons name="cash-outline" size={18} color="#4b5563" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={`Montant (${currency})`}
              placeholderTextColor="#4b5563"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Toggle devise USD / GNF */}
          <View style={styles.currencyToggle}>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === 'USD' && styles.currencyBtnActive]}
              onPress={() => setCurrency('USD')}
            >
              <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>
                $
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === 'GNF' && styles.currencyBtnActive]}
              onPress={() => setCurrency('GNF')}
            >
              <Text style={[styles.currencyText, currency === 'GNF' && styles.currencyTextActive]}>
                GNF
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conversion en temps réel */}
        {convertedLabel && (
          <View style={styles.conversionRow}>
            <Ionicons name="swap-horizontal-outline" size={12} color="#f59e0b" />
            <Text style={styles.conversionText}>{convertedLabel}</Text>
          </View>
        )}
      </View>

      {/* Moyens de paiement */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Moyen de paiement</Text>
        <View style={styles.paymentGrid}>
          {ALL_PAYMENT_METHODS.map((method) => {
            const isActive = paymentMethod === method;
            const color = PAYMENT_METHOD_COLORS[method];
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentCard,
                  isActive && { borderColor: color, backgroundColor: color + '18' },
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Ionicons
                  name={PAYMENT_METHOD_ICONS[method] as any}
                  size={20}
                  color={isActive ? color : '#4b5563'}
                />
                <Text style={[styles.paymentText, isActive && { color }]}>
                  {PAYMENT_METHOD_LABELS[method]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.inputWrapper}>
        <Ionicons name="pencil-outline" size={18} color="#4b5563" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Description (optionnel)"
          placeholderTextColor="#4b5563"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Catégories */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat] as any}
                size={14}
                color={category === cat ? '#fff' : '#6b7280'}
              />
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.View style={submitAnimStyle}>
        <TouchableOpacity
          style={[styles.submitBtn, type === 'EXPENSE' && styles.submitBtnExpense]}
          onPress={handleSubmit}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {type === 'INCOME' ? 'Enregistrer le dépôt' : 'Enregistrer le retrait'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  toggle: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  incomeActive: { backgroundColor: '#065f46' },
  expenseActive: { backgroundColor: '#7f1d1d' },
  toggleText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  toggleTextActive: { color: '#fff' },

  amountBlock: { gap: 6 },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, color: '#f9fafb', fontSize: 15 },

  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  currencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: { backgroundColor: '#f59e0b' },
  currencyText: { color: '#6b7280', fontWeight: '700', fontSize: 13 },
  currencyTextActive: { color: '#000' },

  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 4,
  },
  conversionText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },

  section: { gap: 8 },
  sectionLabel: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1f2937',
  },
  paymentText: { color: '#6b7280', fontSize: 12, fontWeight: '600', flexShrink: 1 },

  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    marginRight: 8,
  },
  catChipActive: { backgroundColor: '#1d4ed8' },
  catText: { color: '#6b7280', fontSize: 12 },
  catTextActive: { color: '#fff', fontWeight: '600' },

  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnExpense: { backgroundColor: '#dc2626' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
