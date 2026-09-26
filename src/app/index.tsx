import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
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
  const { rate: liveRate } = useExchangeRate();
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
          <Text style={styles.title}>Meta Capital</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={[styles.headerIcon, showBudgetSettings && styles.headerIconActive]}
              onPress={() => setShowBudgetSettings((v) => !v)}
            >
              <Ionicons name="wallet-outline" size={20} color={showBudgetSettings ? '#fff' : '#888'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIcon, transactions.length === 0 && { opacity: 0.4 }]}
              onPress={handleExport}
              disabled={transactions.length === 0}
            >
              <Ionicons name="share-outline" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Big Balance */}
        <View style={styles.capitalCard}>
          <Text style={styles.capitalLabel}>Capital Actuel</Text>
          <Text style={styles.capitalAmountUSD}>{formatUSD(netCapitalUSD)}</Text>
          <View style={styles.gnfRow}>
            <Ionicons name="swap-horizontal-outline" size={14} color="#666" />
            <Text style={styles.capitalAmountGNF}>{formatGNF(netCapitalGNF)}</Text>
          </View>
        </View>

        {/* Clean Stat Cards */}
        <View style={styles.statCardsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statIconWrap}><Ionicons name="arrow-down-outline" size={14} color="#34d399" /></View>
              <Text style={styles.statLabel}>Entrées (Mois)</Text>
            </View>
            <Text style={styles.statValueUSD}>+{formatUSD(monthIncomeUSD)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIconWrap, styles.statIconExpense]}><Ionicons name="arrow-up-outline" size={14} color="#f87171" /></View>
              <Text style={styles.statLabel}>Sorties (Mois)</Text>
            </View>
            <Text style={styles.statValueUSD}>-{formatUSD(monthExpenseUSD)}</Text>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNewTransaction}>
        <Ionicons name="add" size={28} color="#000" />
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
  safe: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#111',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconActive: { backgroundColor: '#333' },

  capitalCard: {
    alignItems: 'center',
    marginBottom: 36,
  },
  capitalLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  capitalAmountUSD: { color: '#fff', fontSize: 54, fontWeight: '800', letterSpacing: -2 },
  gnfRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  capitalAmountGNF: { color: '#666', fontSize: 16, fontWeight: '500' },

  statCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#111', borderRadius: 20, padding: 16, gap: 4 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconExpense: { backgroundColor: 'rgba(248, 113, 113, 0.15)' },
  statLabel: { color: '#888', fontSize: 13, fontWeight: '500' },
  statValueUSD: { color: '#fff', fontSize: 18, fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalCloseBtn: { padding: 4, backgroundColor: '#222', borderRadius: 16 },
});
