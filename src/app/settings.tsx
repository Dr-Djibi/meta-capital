import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';

export default function SettingsScreen() {
  const { rate, loading, lastUpdated, error } = useExchangeRate();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Configuration</Text>
        <Text style={styles.title}>Paramètres</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taux de change</Text>
          <View style={styles.rateRow}>
            <View style={styles.iconBox}><Ionicons name={error ? 'warning-outline' : 'globe-outline'} size={20} color={error ? '#f87171' : '#60a5fa'} /></View>
            <View style={styles.rateInfo}>
              <Text style={styles.rateValue}>1 USD = {Math.round(rate).toLocaleString('fr-FR')} GNF</Text>
              <Text style={styles.rateMeta}>{loading ? 'Actualisation en cours…' : error ? 'Hors ligne · taux précédent ou secours' : `Dernière mise à jour à ${lastUpdated ?? 'maintenant'}`}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#60a5fa" />}
          </View>
          <Text style={styles.help}>Le taux est récupéré automatiquement en ligne et conservé localement pour continuer à convertir sans réseau.</Text>
        </View>

        <Text style={styles.sectionHeading}>Comment les montants sont utilisés</Text>
        <View style={styles.ruleCard}><Ionicons name="cube-outline" size={19} color="#f59e0b" /><View><Text style={styles.ruleTitle}>Produits</Text><Text style={styles.ruleText}>Coût fournisseur et fret en USD</Text></View></View>
        <View style={styles.ruleCard}><Ionicons name="cart-outline" size={19} color="#34d399" /><View><Text style={styles.ruleTitle}>Ventes</Text><Text style={styles.ruleText}>Prix réel et livreur en GNF</Text></View></View>
        <View style={styles.ruleCard}><Ionicons name="calculator-outline" size={19} color="#60a5fa" /><View><Text style={styles.ruleTitle}>Capital</Text><Text style={styles.ruleText}>Net de la vente converti en USD</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  subtitle: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  title: { color: '#f9fafb', fontSize: 27, fontWeight: '800', marginBottom: 6 },
  section: { backgroundColor: '#0f172a', borderRadius: 18, borderWidth: 1, borderColor: '#1f2937', padding: 16, gap: 13 },
  sectionTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '800' },
  sectionHeading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  rateInfo: { flex: 1, gap: 4 },
  rateValue: { color: '#f9fafb', fontSize: 16, fontWeight: '800' },
  rateMeta: { color: '#64748b', fontSize: 11 },
  help: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  ruleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 14 },
  ruleTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  ruleText: { color: '#cbd5e1', fontSize: 13 },
});
