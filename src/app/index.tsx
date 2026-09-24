import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, useCapitalStore } from '@/store/useCapitalStore';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { CapitalChart } from '@/components/CapitalChart';
import { BudgetBanner, BudgetSettings } from '@/components/BudgetBanner';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { formatUSD, formatGNF } from '@/constants/currency';
import { exportTransactionsToCSV } from '@/utils/exportCsv';

export default function DashboardScreen() {
  const getNetCapital = useCapitalStore((s) => s.getNetCapital);
  const transactions = useCapitalStore((s) => s.transactions);
  const { rate: liveRate, loading: rateLoading, lastUpdated, error: rateError } = useExchangeRate();
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setShowFormModal(true);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowFormModal(true);
  };
  const handleExport = async () => {
    try {
      await exportTransactionsToCSV(transactions, liveRate);
    } catch (e: any) {
      Alert.alert('Export impossible', e?.message ?? 'Une erreur est survenue.');
    }
  };

  const netCapitalUSD = getNetCapital();
  const netCapitalGNF = netCapitalUSD * liveRate;

  const totalIncomeUSD = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((a, t) => a + t.amount, 0);
  const totalExpenseUSD = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((a, t) => a + t.amount, 0);

  const now = new Date();
  const monthTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const monthIncomeUSD = monthTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((a, t) => a + t.amount, 0);
  const monthExpenseUSD = monthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((a, t) => a + t.amount, 0);
  const monthNetUSD = monthIncomeUSD - monthExpenseUSD;
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const isPositive = netCapitalUSD >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.subtitle}>Tableau de bord</Text>
            <Text style={styles.title}>Meta Capital</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={[styles.headerIcon, showBudgetSettings && styles.headerIconActive]}
              onPress={() => setShowBudgetSettings((v) => !v)}
            >
              <Ionicons name="wallet-outline" size={20} color={showBudgetSettings ? '#f59e0b' : '#60a5fa'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIcon, transactions.length === 0 && { opacity: 0.4 }]}
              onPress={handleExport}
              disabled={transactions.length === 0}
            >
              <Ionicons name="share-outline" size={20} color="#60a5fa" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Capital Card */}
        <View style={[styles.capitalCard, isPositive ? styles.capitalCardPositive : styles.capitalCardNegative]}>
          <View style={styles.capitalCardGlow} />

          <Text style={styles.capitalLabel}>Capital disponible</Text>

          <Text style={[styles.capitalAmountUSD, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{formatUSD(netCapitalUSD)}
          </Text>

          <View style={styles.gnfRow}>
            <Ionicons name="swap-horizontal-outline" size={13} color="#f59e0b" />
            <Text style={styles.capitalAmountGNF}>
              {isPositive ? '+' : ''}{formatGNF(netCapitalGNF)}
            </Text>
          </View>

        </View>

        <View style={styles.statCardsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statIconWrap}><Ionicons name="arrow-down-circle-outline" size={14} color="#34d399" /></View>
              <Text style={styles.statLabel}>Dépôts</Text>
            </View>
            <Text style={[styles.statValueUSD, styles.positive]}>+{formatUSD(totalIncomeUSD)}</Text>
            <Text style={styles.statValueGNF}>+{formatGNF(totalIncomeUSD * liveRate)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIconWrap, styles.statIconExpense]}><Ionicons name="arrow-up-circle-outline" size={14} color="#f87171" /></View>
              <Text style={styles.statLabel}>Retraits</Text>
            </View>
            <Text style={[styles.statValueUSD, styles.negative]}>-{formatUSD(totalExpenseUSD)}</Text>
            <Text style={styles.statValueGNF}>-{formatGNF(totalExpenseUSD * liveRate)}</Text>
          </View>
        </View>

        {/* Bandeau taux de change */}
        <View style={[styles.rateCard, rateError && styles.rateCardError]}>
          {rateLoading ? (
            <>
              <ActivityIndicator size={12} color="#f59e0b" />
              <Text style={styles.rateText}>Récupération du taux en cours…</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={rateError ? 'warning-outline' : 'trending-up-outline'}
                size={13}
                color={rateError ? '#f87171' : '#f59e0b'}
              />
              <Text style={styles.rateText}>
                {rateError ? 'Taux hors ligne · ' : 'Taux live · '}
                <Text style={[styles.rateHighlight, rateError && { color: '#f87171' }]}>
                  1 $ = {liveRate.toLocaleString('fr-FR')} GNF
                </Text>
                {lastUpdated ? <Text style={styles.rateTime}>  ·  MàJ {lastUpdated}</Text> : null}
              </Text>
            </>
          )}
        </View>

        {/* Résumé du mois */}
        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <View>
              <Text style={styles.monthTitle}>Ce mois-ci</Text>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
            </View>
            <Ionicons name="calendar-outline" size={18} color="#60a5fa" />
          </View>
          <View style={styles.monthStats}>
            <View style={styles.monthStat}>
              <Text style={styles.monthStatLabel}>Entrées</Text>
              <Text style={[styles.monthStatValue, styles.positive]}>+{formatUSD(monthIncomeUSD)}</Text>
            </View>
            <View style={styles.monthStatDivider} />
            <View style={styles.monthStat}>
              <Text style={styles.monthStatLabel}>Sorties</Text>
              <Text style={[styles.monthStatValue, styles.negative]}>-{formatUSD(monthExpenseUSD)}</Text>
            </View>
            <View style={styles.monthStatDivider} />
            <View style={styles.monthStat}>
              <Text style={styles.monthStatLabel}>Net</Text>
              <Text style={[styles.monthStatValue, monthNetUSD >= 0 ? styles.positive : styles.negative]}>
                {monthNetUSD >= 0 ? '+' : ''}{formatUSD(monthNetUSD)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bannière budget */}
        <BudgetBanner />

        {/* Paramètres budget (toggle) */}
        {showBudgetSettings && <BudgetSettings />}

        {/* Graphique évolution */}
        {transactions.length >= 2 && <CapitalChart />}

        {/* Liste des transactions */}
        <TransactionList liveRate={liveRate} onEdit={openEditTransaction} />
      </ScrollView>

      {/* FAB pour ajouter une transaction */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openNewTransaction}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal Formulaire */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTransaction ? 'Modifier l’opération' : 'Nouvelle opération'}</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TransactionForm
              key={editingTransaction?.id ?? 'new'}
              liveRate={liveRate}
              initialTransaction={editingTransaction ?? undefined}
              onComplete={() => {
                setShowFormModal(false);
                setEditingTransaction(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  subtitle: { color: '#4b5563', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  title: { color: '#f9fafb', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  headerIconActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#1a1000',
  },

  capitalCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  capitalCardPositive: { backgroundColor: '#0a1a2e', borderColor: '#1e3a5f' },
  capitalCardNegative: { backgroundColor: '#1a0a0a', borderColor: '#5f1e1e' },
  capitalCardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1d4ed8',
    opacity: 0.06,
  },

  capitalLabel: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  capitalAmountUSD: { fontSize: 46, fontWeight: '800', letterSpacing: -1.5 },
  gnfRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 2 },
  capitalAmountGNF: { color: '#f59e0b', fontSize: 17, fontWeight: '600' },
  positive: { color: '#34d399' },
  negative: { color: '#f87171' },

  statCardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#0f172a', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#1f2937', gap: 5 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconExpense: { backgroundColor: '#450a0a' },
  statLabel: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  statValueUSD: { fontSize: 15, fontWeight: '800' },
  statValueGNF: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1400',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2000',
  },
  rateCardError: { backgroundColor: '#1a0a0a', borderColor: '#2a0000' },
  rateText: { color: '#6b7280', fontSize: 12, flex: 1 },
  rateHighlight: { color: '#f59e0b', fontWeight: '700' },
  rateTime: { color: '#4b5563', fontWeight: '400' },
  monthCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  monthLabel: { color: '#6b7280', fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  monthStats: { flexDirection: 'row', alignItems: 'center' },
  monthStat: { flex: 1, gap: 4 },
  monthStatLabel: { color: '#6b7280', fontSize: 11 },
  monthStatValue: { fontSize: 13, fontWeight: '800' },
  monthStatDivider: { width: 1, height: 28, backgroundColor: '#1f2937', marginHorizontal: 10 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
});
