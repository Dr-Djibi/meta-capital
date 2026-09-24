import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCapitalStore } from '@/store/useCapitalStore';

const CHART_HEIGHT = 80;
const CHART_WIDTH = 300;
const POINTS = 12; // Afficher les 12 dernières transactions max

/**
 * Graphique SVG "sparkline" d'évolution du capital net.
 * Rendu en pur JS/SVG inline — aucune dépendance externe.
 */
export function CapitalChart() {
  const transactions = useCapitalStore((s) => s.transactions);

  const dataPoints = useMemo(() => {
    if (transactions.length === 0) return [];

    // Prendre les N dernières transactions (ordre chronologique)
    const sorted = [...transactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-POINTS);

    // Calculer le capital cumulé à chaque étape
    let running = 0;
    return sorted.map((t) => {
      running += t.type === 'INCOME' ? t.amount : -t.amount;
      return running;
    });
  }, [transactions]);

  if (dataPoints.length < 2) return null;

  const min = Math.min(...dataPoints, 0);
  const max = Math.max(...dataPoints, 0.01);
  const range = max - min || 1;

  // Normaliser entre 0 et CHART_HEIGHT
  const normalize = (v: number) =>
    CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT;

  const stepX = CHART_WIDTH / (dataPoints.length - 1);
  const points = dataPoints.map((v, i) => ({
    x: i * stepX,
    y: normalize(v),
  }));

  // Construire le chemin SVG de la courbe
  const pathD = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  // Zone de remplissage (area)
  const areaD =
    pathD +
    ` L${points[points.length - 1].x},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;

  const isPositive = dataPoints[dataPoints.length - 1] >= 0;
  const lineColor = isPositive ? '#34d399' : '#f87171';
  const areaColor = isPositive ? '#34d39920' : '#f8717120';

  // Ligne zéro
  const zeroY = normalize(0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Évolution du capital</Text>
      <View style={styles.chartWrap}>
        {/* SVG rendu via View + positionnement absolu des "points" */}
        {/* On dessine la courbe avec des lignes entre chaque point */}
        <View style={[styles.svgArea, { height: CHART_HEIGHT }]}>
          {/* Ligne zéro */}
          <View
            style={[
              styles.zeroLine,
              { top: zeroY },
            ]}
          />
          {/* Segments de courbe */}
          {points.slice(1).map((p, i) => {
            const prev = points[i];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    width: length,
                    left: prev.x,
                    top: prev.y,
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: lineColor,
                  },
                ]}
              />
            );
          })}
          {/* Points */}
          {points.map((p, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  left: p.x - 3,
                  top: p.y - 3,
                  backgroundColor:
                    i === points.length - 1 ? lineColor : lineColor + '80',
                  width: i === points.length - 1 ? 8 : 5,
                  height: i === points.length - 1 ? 8 : 5,
                  borderRadius: i === points.length - 1 ? 4 : 2.5,
                },
              ]}
            />
          ))}
        </View>

        {/* Légende valeurs min/max */}
        <View style={styles.legend}>
          <Text style={[styles.legendVal, { color: isPositive ? '#34d399' : '#f87171' }]}>
            {dataPoints[dataPoints.length - 1] >= 0 ? '+' : ''}
            {dataPoints[dataPoints.length - 1].toFixed(1)}$
          </Text>
          <Text style={styles.legendCount}>{dataPoints.length} ops</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a111e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    gap: 10,
  },
  label: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chartWrap: { gap: 6 },
  svgArea: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1f2937',
  },
  segment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendVal: { fontSize: 13, fontWeight: '800' },
  legendCount: { color: '#374151', fontSize: 11 },
});
