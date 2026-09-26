import { Currency, getPaymentMethodColor, getPaymentMethodIcon, getPaymentMethodLabel, PaymentMethod, StandardPaymentMethod, toUSD, USD_TO_GNF } from '@/constants/currency';
import { useCapitalStore } from '@/store/useCapitalStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

const ALL_PAYMENT_METHODS: StandardPaymentMethod[] = [
  'ORANGE_MONEY',
  'CARTE_BANCAIRE',
  'ESPECES',
  'VIREMENT',
];

interface InitialBalanceFormProps {
  liveRate?: number;
  onComplete?: () => void;
}

export function InitialBalanceForm({ liveRate = USD_TO_GNF, onComplete }: InitialBalanceFormProps) {
  const addTransaction = useCapitalStore((s) => s.addTransaction);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');

  const parsed = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(parsed) && parsed > 0;
  const convertedLabel = isValidAmount
    ? currency === 'USD'
      ? `≈ ${Math.round(parsed * liveRate).toLocaleString('fr-FR')} GNF`
      : `≈ ${(parsed / liveRate).toFixed(2)} $`
    : null;

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const handleSubmit = () => {
    if (!isValidAmount) {
      Alert.alert('Montant invalide', 'Veuillez entrer un montant positif.');
      return;
    }

    const amountInUSD = toUSD(parsed, currency, liveRate);
    
    addTransaction({
      amount: amountInUSD,
      currency,
      originalAmount: parsed,
      type: 'INCOME',
      category: 'INITIAL_BALANCE',
      paymentMethod,
      description: 'Capital de départ',
    });

    submitScale.set(withSequence(
      withTiming(0.93, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 200 })
    ));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (onComplete) {
      setTimeout(onComplete, 300);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.introText}>
        Saisissez le montant dont vous disposez actuellement pour initialiser votre caisse.
      </Text>

      <View style={styles.amountBlock}>
        <View style={styles.amountRow}>
          <View style={styles.inputWrapper}>
            <Ionicons name="wallet-outline" size={20} color="#4b5563" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={`Montant (${currency})`}
              placeholderTextColor="#4b5563"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <View style={styles.currencyToggle}>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === 'USD' && styles.currencyBtnActive]}
              onPress={() => setCurrency('USD')}
            >
              <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>$</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === 'GNF' && styles.currencyBtnActive]}
              onPress={() => setCurrency('GNF')}
            >
              <Text style={[styles.currencyText, currency === 'GNF' && styles.currencyTextActive]}>GNF</Text>
            </TouchableOpacity>
          </View>
        </View>
        {convertedLabel && (
          <View style={styles.conversionRow}>
            <Ionicons name="swap-horizontal-outline" size={12} color="#f59e0b" />
            <Text style={styles.conversionText}>{convertedLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sur quel compte ?</Text>
        <View style={styles.paymentGrid}>
          {ALL_PAYMENT_METHODS.map((method) => {
            const isActive = paymentMethod === method;
            const color = getPaymentMethodColor(method);
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
                  name={getPaymentMethodIcon(method) as any}
                  size={20}
                  color={isActive ? color : '#4b5563'}
                />
                <Text style={[styles.paymentText, isActive && { color }]}>
                  {getPaymentMethodLabel(method)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Animated.View style={submitAnimStyle}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="rocket-outline" size={20} color="#000" />
          <Text style={styles.submitText}>Initialiser le capital</Text>
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
    gap: 16,
  },
  introText: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  amountBlock: { gap: 8 },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, color: '#f9fafb', fontSize: 17, fontWeight: '600' },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  currencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: { backgroundColor: '#f59e0b' },
  currencyText: { color: '#6b7280', fontWeight: '700', fontSize: 14 },
  currencyTextActive: { color: '#000' },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
  },
  conversionText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  section: { gap: 10 },
  sectionLabel: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1f2937',
  },
  paymentText: { color: '#6b7280', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  submitText: { color: '#000', fontWeight: '800', fontSize: 16 },
});
