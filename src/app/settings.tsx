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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Règles de conversion</Text>
          <View style={styles.rule}><Ionicons name="cube-outline" size={17} color="#f59e0b" /><Text style={styles.ruleText}>Produit, coût fournisseur et fret : USD</Text></View>
          <View style={styles.rule}><Ionicons name="cart-outline" size={17} color="#34d399" /><Text style={styles.ruleText}>Prix réel de vente et livreur : GNF</Text></View>
          <View style={styles.rule}><Ionicons name="calculator-outline" size={17} color="#60a5fa" /><Text style={styles.ruleText}>Capital : net de la vente converti en USD</Text></View>
        </View>
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
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  rateInfo: { flex: 1, gap: 4 },
  rateValue: { color: '#f9fafb', fontSize: 16, fontWeight: '800' },
  rateMeta: { color: '#64748b', fontSize: 11 },
  help: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleText: { color: '#cbd5e1', fontSize: 13 },
});
