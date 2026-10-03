import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { parseSMSBatch, ParsedSMS } from '@/utils/smsParser';
import { useCapitalStore, CATEGORY_LABELS, CATEGORY_ICONS, TransactionCategory } from '@/store/useCapitalStore';
import { toUSD, USD_TO_GNF, PAYMENT_METHOD_COLORS } from '@/constants/currency';

interface SmsImportModalProps {
  visible: boolean;
  onClose: () => void;
  liveRate?: number;
  onImportSuccess?: (count: number) => void;
}

const SAMPLE_ORANGE_MONEY = `Bonjour,vous venez d efectuar un paiement de 14000.00GNF chez Achat de pass pour tiers2.Frais 0.00GNF, Nouveau Solde 13432045.55GNF, Ref :MP261002.1231.B32921. Orange Money vous remercie.`;
const SAMPLE_PAYCARD = `vous avez effectue un paiement VISA a FACEBK *WBYAA8J8S4 Dublin IE de 93 400 GNF. Reference: 2610-98VR9W. Solde : 48 900 GNF.`;

const CATEGORIES: TransactionCategory[] = [
  'PERSONAL_FUNDS',
  'FAMILY_SUPPORT',
  'SALES_REVENUE',
  'ADVERTISING',
  'PRODUCT_PURCHASE',
  'PERSONAL_EXPENSE',
];

export function SmsImportModal({
  visible,
  onClose,
  liveRate = USD_TO_GNF,
  onImportSuccess,
}: SmsImportModalProps) {
  const addTransaction = useCapitalStore((s) => s.addTransaction);
  const [pastedText, setPastedText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedSMS[]>([]);

  useEffect(() => {
    if (pastedText.trim()) {
      const items = parseSMSBatch(pastedText);
      setParsedItems(items);
    } else {
      setParsedItems([]);
    }
  }, [pastedText]);

  const handleUpdateCategory = (index: number, newCat: TransactionCategory) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category: newCat } : item))
    );
  };

  const handleUpdateDescription = (index: number, newDesc: string) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description: newDesc } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportAll = () => {
    if (parsedItems.length === 0) {
      Alert.alert('Aucune transaction', 'Veuillez coller au moins un message SMS valide.');
      return;
    }

    let importedCount = 0;
    for (const item of parsedItems) {
      const amountUSD = toUSD(item.amountGNF, 'GNF', liveRate);
      addTransaction({
        amount: amountUSD,
        currency: 'GNF',
        originalAmount: item.amountGNF,
        type: item.type,
        category: item.category,
        paymentMethod: item.paymentMethod,
        description: item.description + (item.reference ? ` (Ref: ${item.reference})` : ''),
      });
      importedCount++;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Import réussi ! 🎉',
      `${importedCount} transaction(s) ont été importée(s) dans votre journal.`
    );

    if (onImportSuccess) {
      onImportSuccess(importedCount);
    }

    // Reset & Close
    setPastedText('');
    setParsedItems([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color="#60a5fa" />
              </View>
              <Text style={styles.title}>Importer via SMS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.subtitle}>
              Collez vos messages de transaction Orange Money ou PayCard pour les enregistrer automatiquement.
            </Text>

            {/* Input area */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textArea}
                placeholder="Collez vos SMS ici (Orange Money, PayCard)..."
                placeholderTextColor="#6b7280"
                multiline
                value={pastedText}
                onChangeText={setPastedText}
                numberOfLines={4}
              />
              {pastedText.length > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setPastedText('')}>
                  <Ionicons name="close-circle-outline" size={16} color="#9ca3af" />
                  <Text style={styles.clearBtnText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sample helper buttons */}
            <View style={styles.samplesRow}>
              <Text style={styles.samplesLabel}>Essayer un exemple :</Text>
              <TouchableOpacity
                style={[styles.sampleChip, { borderColor: PAYMENT_METHOD_COLORS.ORANGE_MONEY }]}
                onPress={() => setPastedText(SAMPLE_ORANGE_MONEY)}
              >
                <Ionicons name="phone-portrait-outline" size={13} color={PAYMENT_METHOD_COLORS.ORANGE_MONEY} />
                <Text style={[styles.sampleText, { color: PAYMENT_METHOD_COLORS.ORANGE_MONEY }]}>
                  Orange Money
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sampleChip, { borderColor: PAYMENT_METHOD_COLORS.CARTE_BANCAIRE }]}
                onPress={() => setPastedText(SAMPLE_PAYCARD)}
              >
                <Ionicons name="card-outline" size={13} color={PAYMENT_METHOD_COLORS.CARTE_BANCAIRE} />
                <Text style={[styles.sampleText, { color: PAYMENT_METHOD_COLORS.CARTE_BANCAIRE }]}>
                  PayCard (Carte)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preview extracted items */}
            {parsedItems.length > 0 ? (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsHeader}>
                  {parsedItems.length} transaction(s) détectée(s) :
                </Text>

                {parsedItems.map((item, idx) => {
                  const isExpense = item.type === 'EXPENSE';
                  const providerColor =
                    item.provider === 'ORANGE_MONEY'
                      ? PAYMENT_METHOD_COLORS.ORANGE_MONEY
                      : PAYMENT_METHOD_COLORS.CARTE_BANCAIRE;
                  const usdApprox = (item.amountGNF / liveRate).toFixed(2);

                  return (
                    <View key={idx} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.badgesRow}>
                          <View style={[styles.badge, { backgroundColor: providerColor + '20', borderColor: providerColor }]}>
                            <Text style={[styles.badgeText, { color: providerColor }]}>
                              {item.provider === 'ORANGE_MONEY' ? 'Orange Money' : 'PayCard (Carte)'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: isExpense ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                borderColor: isExpense ? '#ef4444' : '#10b981',
                              },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: isExpense ? '#f87171' : '#34d399' }]}>
                              {isExpense ? 'Retrait' : 'Dépôt'}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                          <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>

                      {/* Montant */}
                      <View style={styles.amountRow}>
                        <Text style={[styles.amountGNF, { color: isExpense ? '#f87171' : '#34d399' }]}>
                          {isExpense ? '-' : '+'}{Math.round(item.amountGNF).toLocaleString('fr-FR')} GNF
                        </Text>
                        <Text style={styles.amountUSD}>≈ {usdApprox} $</Text>
                      </View>

                      {/* Description input */}
                      <View style={styles.descInputWrapper}>
                        <Ionicons name="pencil-outline" size={14} color="#6b7280" />
                        <TextInput
                          style={styles.descInput}
                          value={item.description}
                          onChangeText={(txt) => handleUpdateDescription(idx, txt)}
                          placeholder="Description"
                          placeholderTextColor="#6b7280"
                        />
                      </View>

                      {/* Extra info badges */}
                      {(item.reference || item.feeGNF !== undefined) && (
                        <View style={styles.metaRow}>
                          {item.reference ? (
                            <Text style={styles.metaText}>Ref: {item.reference}</Text>
                          ) : null}
                          {item.feeGNF !== undefined && item.feeGNF > 0 ? (
                            <Text style={styles.metaText}>Frais: {item.feeGNF} GNF</Text>
                          ) : null}
                        </View>
                      )}

                      {/* Category selector */}
                      <Text style={styles.catLabel}>Catégorie :</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.catRow}>
                          {CATEGORIES.map((cat) => {
                            const active = item.category === cat;
                            return (
                              <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, active && styles.catChipActive]}
                                onPress={() => handleUpdateCategory(idx, cat)}
                              >
                                <Ionicons
                                  name={CATEGORY_ICONS[cat] as any}
                                  size={12}
                                  color={active ? '#fff' : '#9ca3af'}
                                />
                                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                                  {CATEGORY_LABELS[cat]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            ) : pastedText.trim().length > 0 ? (
              <View style={styles.noResultsBox}>
                <Ionicons name="alert-circle-outline" size={28} color="#f59e0b" />
                <Text style={styles.noResultsText}>
                  Aucun format de SMS reconnu. Assurez-vous d'avoir collé le texte exact du SMS Orange Money ou PayCard.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Action button */}
          {parsedItems.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.importBtn} onPress={handleImportAll}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.importBtnText}>
                  Importer {parsedItems.length} transaction(s)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#f9fafb', fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  subtitle: { color: '#9ca3af', fontSize: 13, lineHeight: 18 },

  inputCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  textArea: {
    color: '#f9fafb',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  clearBtnText: { color: '#9ca3af', fontSize: 12 },

  samplesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  samplesLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#111827',
  },
  sampleText: { fontSize: 12, fontWeight: '600' },

  resultsSection: { gap: 14 },
  resultsHeader: { color: '#60a5fa', fontSize: 13, fontWeight: '700' },

  itemCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgesRow: { flexDirection: 'row', gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amountGNF: { fontSize: 20, fontWeight: '800' },
  amountUSD: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },

  descInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  descInput: { flex: 1, paddingVertical: 8, color: '#f9fafb', fontSize: 13 },

  metaRow: { flexDirection: 'row', gap: 12 },
  metaText: { color: '#6b7280', fontSize: 11, fontFamily: 'monospace' },

  catLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  catRow: { flexDirection: 'row', gap: 6 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1f2937',
  },
  catChipActive: { backgroundColor: '#2563eb' },
  catChipText: { color: '#9ca3af', fontSize: 11 },
  catChipTextActive: { color: '#fff', fontWeight: '700' },

  noResultsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#172554',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  noResultsText: { color: '#93c5fd', fontSize: 12, flex: 1, lineHeight: 17 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  importBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
