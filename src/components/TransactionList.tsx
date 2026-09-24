import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import {
  useCapitalStore,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  Transaction,
} from '@/store/useCapitalStore';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
  formatUSD,
  formatGNF,
} from '@/constants/currency';

const SWIPE_THRESHOLD = -80;
const DELETE_THRESHOLD = -140;

interface SwipeableRowProps {
  item: Transaction;
  liveRate: number;
  onDelete: () => void;
}

function SwipeableRow({ item, liveRate, onDelete }: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue<number | 'auto'>('auto');

  const isIncome = item.type === 'INCOME';
  const sign = isIncome ? '+' : '-';
  const amountUSD = item.amount;
  const amountGNF = amountUSD * liveRate;

  const pmColor = item.paymentMethod ? PAYMENT_METHOD_COLORS[item.paymentMethod] : '#4b5563';
  const pmLabel = item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] : null;
  const pmIcon = item.paymentMethod ? PAYMENT_METHOD_ICONS[item.paymentMethod] : null;

  const triggerDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDelete();
  }, [onDelete]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      // Seulement swipe vers la gauche
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, DELETE_THRESHOLD - 20);
      }
    })
    .onEnd((e) => {
      if (translateX.value < DELETE_THRESHOLD) {
        // Suppression directe
        translateX.value = withTiming(-400, { duration: 200 });
        runOnJS(triggerDelete)();
      } else if (translateX.value < SWIPE_THRESHOLD) {
        // Montrer le bouton delete
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Revenir
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value !== 0) {
      translateX.value = withSpring(0);
    }
  });

  const combinedGesture = Gesture.Simultaneous(gesture, tapGesture);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-40, -80],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-80, -140],
      [1, 1.15],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const bgStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(
      translateX.value,
      [0, -80],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: bgOpacity };
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Background rouge derrière */}
      <Animated.View style={[styles.deleteBackground, bgStyle]}>
        <Animated.View style={deleteStyle}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.deleteText}>Supprimer</Text>
        </Animated.View>
      </Animated.View>

      {/* Ligne principale */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.row, rowStyle]}>
          {/* Icon badge catégorie */}
          <View style={[styles.iconBadge, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
            <Ionicons
              name={CATEGORY_ICONS[item.category] as any}
              size={18}
              color={isIncome ? '#34d399' : '#f87171'}
            />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.category}>{CATEGORY_LABELS[item.category]}</Text>
              {pmLabel && pmIcon && (
                <View style={[styles.pmBadge, { backgroundColor: pmColor + '20', borderColor: pmColor + '50' }]}>
                  <Ionicons name={pmIcon as any} size={10} color={pmColor} />
                  <Text style={[styles.pmText, { color: pmColor }]}>{pmLabel}</Text>
                </View>
              )}
            </View>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
            ) : null}
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Montants */}
          <View style={styles.amountWrap}>
            <Text style={[styles.amountUSD, isIncome ? styles.income : styles.expense]}>
              {sign}{formatUSD(Math.abs(amountUSD))}
            </Text>
            <Text style={styles.amountGNF}>
              {sign}{formatGNF(Math.abs(amountGNF))}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Filtres ────────────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

interface FilterBarProps {
  active: FilterType;
  onChange: (f: FilterType) => void;
  counts: { all: number; income: number; expense: number };
}

function FilterBar({ active, onChange, counts }: FilterBarProps) {
  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tout', count: counts.all },
    { key: 'INCOME', label: 'Dépôts', count: counts.income },
    { key: 'EXPENSE', label: 'Retraits', count: counts.expense },
  ];

  return (
    <View style={styles.filterBar}>
      {filters.map((f) => (
        <View
          key={f.key}
          style={[
            styles.filterBtn,
            active === f.key && styles.filterBtnActive,
            active === f.key && f.key === 'INCOME' && styles.filterBtnIncome,
            active === f.key && f.key === 'EXPENSE' && styles.filterBtnExpense,
          ]}
        >
          <Text
            style={[styles.filterText, active === f.key && styles.filterTextActive]}
            onPress={() => onChange(f.key)}
          >
            {f.label}
          </Text>
          <View style={[styles.filterCount, active === f.key && styles.filterCountActive]}>
            <Text style={[styles.filterCountText, active === f.key && styles.filterCountTextActive]}>
              {f.count}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Liste principale ────────────────────────────────────────────────────────

interface TransactionListProps {
  liveRate?: number;
}

export function TransactionList({ liveRate = 8600 }: TransactionListProps) {
  const transactions = useCapitalStore((s) => s.transactions);
  const deleteTransaction = useCapitalStore((s) => s.deleteTransaction);
  const [filter, setFilter] = React.useState<FilterType>('ALL');
  const [search, setSearch] = React.useState('');

  const filtered = transactions.filter((t) => {
    if (filter !== 'ALL' && t.type !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const label = CATEGORY_LABELS[t.category].toLowerCase();
      return (
        label.includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.amount.toFixed(2).includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: transactions.length,
    income: transactions.filter((t) => t.type === 'INCOME').length,
    expense: transactions.filter((t) => t.type === 'EXPENSE').length,
  };

  const confirmDelete = (id: string, description: string) => {
    Alert.alert('Supprimer ?', description || 'Cette transaction sera supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);
  };

  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={48} color="#1f2937" />
        <Text style={styles.emptyTitle}>Aucune transaction</Text>
        <Text style={styles.emptySubtitle}>Tes dépôts et retraits apparaîtront ici</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color="#4b5563" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor="#4b5563"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Ionicons
            name="close-circle"
            size={16}
            color="#4b5563"
            onPress={() => setSearch('')}
          />
        )}
      </View>

      <FilterBar active={filter} onChange={setFilter} counts={counts} />

      {filtered.slice(0, 30).map((item) => (
        <SwipeableRow
          key={item.id}
          item={item}
          liveRate={liveRate}
          onDelete={() => deleteTransaction(item.id)}
        />
      ))}

      {filtered.length === 0 && (
        <View style={styles.emptyFilter}>
          <Ionicons name={search.trim() ? 'search-outline' : 'filter-outline'} size={22} color="#1f2937" />
          <Text style={styles.emptyFilterText}>
            {search.trim()
              ? `Aucun résultat pour « ${search.trim()} »`
              : 'Aucune transaction dans ce filtre'}
          </Text>
        </View>
      )}

      <Text style={styles.hint}>← Glisse vers la gauche pour supprimer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 32 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Filtres
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  filterBtnActive: { borderColor: '#374151' },
  filterBtnIncome: { backgroundColor: '#064e3b20', borderColor: '#065f4660' },
  filterBtnExpense: { backgroundColor: '#45000a20', borderColor: '#7f1d1d60' },
  filterText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#f9fafb' },
  filterCount: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: '#4b5563' },
  filterCountText: { color: '#9ca3af', fontSize: 10, fontWeight: '700' },
  filterCountTextActive: { color: '#f9fafb' },

  // Swipeable
  swipeContainer: {
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  deleteText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 12,
  },

  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  incomeBadge: { backgroundColor: '#064e3b' },
  expenseBadge: { backgroundColor: '#450a0a' },

  info: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  category: { color: '#f9fafb', fontSize: 13, fontWeight: '700' },

  pmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pmText: { fontSize: 10, fontWeight: '700' },

  desc: { color: '#6b7280', fontSize: 12 },
  date: { color: '#374151', fontSize: 11 },

  amountWrap: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  amountUSD: { fontSize: 14, fontWeight: '800' },
  amountGNF: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  income: { color: '#34d399' },
  expense: { color: '#f87171' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { color: '#4b5563', fontSize: 15, fontWeight: '700' },
  emptySubtitle: { color: '#374151', fontSize: 13 },
  emptyFilter: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  emptyFilterText: { color: '#374151', fontSize: 13 },

  // Recherche
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 14,
  },

  hint: { color: '#1f2937', fontSize: 11, textAlign: 'center', marginTop: 4 },
});
