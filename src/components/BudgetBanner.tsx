import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCapitalStore, CATEGORY_LABELS, TransactionCategory } from '@/store/useCapitalStore';
import { useBudgetStore } from '@/store/useBudgetStore';
import { formatUSD } from '@/constants/currency';

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'ADVERTISING',
  'PRODUCT_PURCHASE',
  'PERSONAL_EXPENSE',
];

interface BudgetAlert {
  category: TransactionCategory;
  spent: number;
  limit: number;
  percent: number;
}

/** Retourne les dépenses du mois courant par catégorie (en USD) */
function useMonthlyExpenses(): Record<TransactionCategory, number> {
  const transactions = useCapitalStore((s) => s.transactions);
  return useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthly = transactions.filter(
      (t) => t.type === 'EXPENSE' && t.date >= startOfMonth
    );
    return monthly.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      },
      {} as Record<TransactionCategory, number>
    );
  }, [transactions]);
}

// ─── Bandeau alertes ─────────────────────────────────────────────────────────

export function BudgetBanner() {
  const budgets = useBudgetStore((s) => s.budgets);
  const monthlyExpenses = useMonthlyExpenses();
  const [expanded, setExpanded] = useState(false);

  const alerts: BudgetAlert[] = budgets
    .filter((b) => b.monthlyLimit > 0)
    .map((b) => {
      const spent = monthlyExpenses[b.category] ?? 0;
      const percent = (spent / b.monthlyLimit) * 100;
      return { category: b.category, spent, limit: b.monthlyLimit, percent };
    })
    .filter((a) => a.percent >= 80) // Alerte à partir de 80%
    .sort((a, b) => b.percent - a.percent);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={styles.headerText}>
            {alerts.length === 1
              ? `Budget dépassé · ${CATEGORY_LABELS[alerts[0].category]}`
              : `${alerts.length} budgets en alerte`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={14}
          color="#6b7280"
        />
      </TouchableOpacity>

      {expanded &&
        alerts.map((a) => {
          const isOver = a.percent > 100;
          const barColor = isOver ? '#ef4444' : '#f59e0b';
          const barWidth = Math.min(a.percent, 100);
          return (
            <View key={a.category} style={styles.alertRow}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertCat}>{CATEGORY_LABELS[a.category]}</Text>
                <Text style={[styles.alertPct, { color: barColor }]}>
                  {isOver ? '+' : ''}{(a.percent - 100).toFixed(0)}%{' '}
                  {isOver ? 'dépassé' : 'restant' }
                </Text>
              </View>
              <View style={styles.alertAmounts}>
                <Text style={styles.alertSpent}>{formatUSD(a.spent)}</Text>
                <Text style={styles.alertLimit}> / {formatUSD(a.limit)}</Text>
              </View>
              {/* Barre de progression */}
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${barWidth}%` as any, backgroundColor: barColor }]}
                />
              </View>
            </View>
          );
        })}
    </View>
  );
}

// ─── Panneau de configuration des budgets ────────────────────────────────────

export function BudgetSettings() {
  const { budgets, setBudget, removeBudget } = useBudgetStore();
  const [editing, setEditing] = useState<TransactionCategory | null>(null);
  const [inputVal, setInputVal] = useState('');

  const getBudgetLimit = (cat: TransactionCategory) =>
    budgets.find((b) => b.category === cat)?.monthlyLimit;

  const handleSave = (cat: TransactionCategory) => {
    const val = parseFloat(inputVal.replace(',', '.'));
    if (!val || val <= 0) {
      Alert.alert('Valeur invalide', 'Entre un montant positif en USD.');
      return;
    }
    setBudget(cat, val);
    setEditing(null);
    setInputVal('');
  };

  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Budgets mensuels</Text>
      {EXPENSE_CATEGORIES.map((cat) => {
        const limit = getBudgetLimit(cat);
        const isEditing = editing === cat;
        return (
          <View key={cat} style={styles.settingsRow}>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsCat}>{CATEGORY_LABELS[cat]}</Text>
              {!isEditing && (
                <Text style={styles.settingsLimit}>
                  {limit ? formatUSD(limit) + ' / mois' : 'Aucun budget'}
                </Text>
              )}
            </View>
            {isEditing ? (
              <View style={styles.settingsEdit}>
                <TextInput
                  style={styles.settingsInput}
                  value={inputVal}
                  onChangeText={setInputVal}
                  keyboardType="decimal-pad"
                  placeholder="0.00 $"
                  placeholderTextColor="#4b5563"
                  autoFocus
                />
                <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(cat)}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setEditing(null); setInputVal(''); }}
                >
                  <Ionicons name="close" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.settingsActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => { setEditing(cat); setInputVal(limit?.toString() ?? ''); }}
                >
                  <Ionicons name="pencil-outline" size={14} color="#60a5fa" />
                </TouchableOpacity>
                {limit && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeBudget(cat)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner
  container: {
    backgroundColor: '#1a1000',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d1f00',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  alertRow: { gap: 6 },
  alertInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCat: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  alertPct: { fontSize: 12, fontWeight: '700' },
  alertAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  alertSpent: { color: '#f9fafb', fontSize: 13, fontWeight: '700' },
  alertLimit: { color: '#6b7280', fontSize: 12 },
  barTrack: {
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },

  // Settings panel
  settingsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  settingsTitle: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  settingsInfo: { flex: 1, gap: 2 },
  settingsCat: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  settingsLimit: { color: '#6b7280', fontSize: 12 },
  settingsEdit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsInput: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#f9fafb',
    fontSize: 14,
    width: 90,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 6,
  },
  cancelBtn: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 6,
  },
  settingsActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#0a1628',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  removeBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 6,
  },
});
