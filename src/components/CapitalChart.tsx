import React, { useMemo } from 'react';
import { useWindowDimensions, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCapitalStore } from '@/store/useCapitalStore';
import { formatUSD } from '@/constants/currency';

const CHART_HEIGHT = 148;
const POINTS = 12;

export function CapitalChart() {
  const transactions = useCapitalStore((state) => state.transactions);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, windowWidth - 64);
  const dataPoints = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const history = sorted.reduce<number[]>((acc, transaction) => {
      const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(prev + (transaction.type === 'INCOME' ? transaction.amount : -transaction.amount));
      return acc;
    }, []);
    return history.slice(-POINTS);
  }, [transactions]);

  if (dataPoints.length < 2) return null;

  const firstValue = dataPoints[0];
  const currentValue = dataPoints[dataPoints.length - 1];
  const change = currentValue - firstValue;
  const trendUp = change >= 0;
  const lineColor = currentValue >= 0 ? '#34d399' : '#f87171';
  const min = Math.min(...dataPoints, 0);
  const max = Math.max(...dataPoints, 0.01);
  const range = max - min || 1;
  const normalize = (value: number) => CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT;
  const points = dataPoints.map((value, index) => ({ x: (index * chartWidth) / (dataPoints.length - 1), y: normalize(value) }));
  const zeroY = normalize(0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Trésorerie</Text>
          <Text style={styles.title}>Évolution du capital</Text>
        </View>
        <View style={[styles.trendBadge, trendUp ? styles.trendPositive : styles.trendNegative]}>
          <Ionicons name={trendUp ? 'trending-up' : 'trending-down'} size={13} color={lineColor} />
          <Text style={[styles.trendText, { color: lineColor }]}>{formatUSD(Math.abs(change))}</Text>
        </View>
      </View>

      <View style={[styles.chartArea, { width: chartWidth }]}>
        {[0.25, 0.5, 0.75].map((position) => (
          <View key={position} style={[styles.gridLine, { top: CHART_HEIGHT * position }]} />
        ))}
        <View style={[styles.zeroLine, { top: zeroY }]} />
        {points.slice(1).map((point, index) => {
          const previous = points[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`segment-${index}`}
              style={[styles.segment, { width: length, left: previous.x, top: previous.y, transform: [{ rotate: `${angle}deg` }], backgroundColor: lineColor }]}
            />
          );
        })}
        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          const size = isLast ? 10 : 6;
          return (
            <View
              key={`point-${index}`}
              style={[styles.point, { left: point.x - size / 2, top: point.y - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: isLast ? lineColor : `${lineColor}99` }]}
            />
          );
        })}
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{formatUSD(max)}</Text>
        <Text style={styles.currentValue}>{formatUSD(currentValue)}</Text>
        <Text style={styles.axisLabel}>{formatUSD(min)}</Text>
      </View>
      <Text style={styles.caption}>{dataPoints.length} dernières opérations · solde cumulé</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0a111e', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1e3a5f', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#60a5fa', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#f9fafb', fontSize: 16, fontWeight: '800', marginTop: 3 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9 },
  trendPositive: { backgroundColor: '#052e2b' },
  trendNegative: { backgroundColor: '#350d12' },
  trendText: { fontSize: 11, fontWeight: '800' },
  chartArea: { height: CHART_HEIGHT, position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#162235' },
  zeroLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#334155' },
  segment: { position: 'absolute', height: 2.5, borderRadius: 2, transformOrigin: 'left center' },
  point: { position: 'absolute' },
  axisRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  axisLabel: { color: '#64748b', fontSize: 10 },
  currentValue: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },
  caption: { color: '#475569', fontSize: 10 },
});
