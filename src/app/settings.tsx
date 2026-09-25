import { TransactionForm } from '@/components/TransactionForm';
import { useBiometricLock } from '@/hooks/use-biometric-lock';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useCapitalStore } from '@/store/useCapitalStore';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { rate, loading, lastUpdated, error, refresh } = useExchangeRate();
  const transactions = useCapitalStore((state) => state.transactions);
  const clearTransactions = useCapitalStore((state) => state.clearTransactions);
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const { available: biometricAvailable, enabled: biometricEnabled, enable: enableBiometric, disable: disableBiometric } = useBiometricLock();

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      await disableBiometric();
      return;
    }
    await enableBiometric();
  };

  const handleClearHistory = () => {
    if (transactions.length === 0) {
      Alert.alert('Historique vide', 'Il n’y a aucune transaction à supprimer.');
      return;
    }
    Alert.alert('Effacer tout l’historique ?', 'Toutes les transactions seront supprimées et le capital reviendra à zéro.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: clearTransactions },
    ]);
  };

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
            {loading ? <ActivityIndicator size="small" color="#60a5fa" /> : <TouchableOpacity style={styles.refreshButton} onPress={() => refresh()}><Ionicons name="refresh-outline" size={17} color="#60a5fa" /></TouchableOpacity>}
          </View>
          <Text style={styles.help}>Le taux est récupéré automatiquement en ligne et conservé localement pour continuer à convertir sans réseau.</Text>
        </View>

        <Text style={styles.sectionHeading}>Comment les montants sont utilisés</Text>
        <View style={styles.ruleCard}><Ionicons name="cube-outline" size={19} color="#f59e0b" /><View><Text style={styles.ruleTitle}>Produits</Text><Text style={styles.ruleText}>Produit et publicité en USD · transitaire en GNF</Text></View></View>
        <View style={styles.ruleCard}><Ionicons name="cart-outline" size={19} color="#34d399" /><View><Text style={styles.ruleTitle}>Ventes</Text><Text style={styles.ruleText}>Prix réel et livreur en GNF</Text></View></View>
        <View style={styles.ruleCard}><Ionicons name="calculator-outline" size={19} color="#60a5fa" /><View><Text style={styles.ruleTitle}>Capital</Text><Text style={styles.ruleText}>Net de la vente converti en USD</Text></View></View>

        <Text style={styles.sectionHeading}>Actions</Text>
        <TouchableOpacity style={styles.actionCard} onPress={handleBiometricToggle} disabled={!biometricAvailable}>
          <Ionicons name="finger-print-outline" size={19} color={biometricAvailable ? '#34d399' : '#64748b'} />
          <View style={styles.actionInfo}><Text style={styles.ruleTitle}>Verrouillage biométrique</Text><Text style={styles.ruleText}>{biometricAvailable ? (biometricEnabled ? 'Activé · toucher pour désactiver' : 'Protéger l’accès à l’application') : 'Biométrie indisponible sur cet appareil'}</Text></View>
          <Ionicons name={biometricEnabled ? 'toggle' : 'toggle-outline'} size={25} color={biometricAvailable ? '#34d399' : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setShowInitialBalance(true)}>
          <Ionicons name="flag-outline" size={19} color="#f59e0b" />
          <View style={styles.actionInfo}><Text style={styles.ruleTitle}>Ajouter un capital de départ</Text><Text style={styles.ruleText}>Disponible uniquement ici</Text></View>
          <Ionicons name="chevron-forward" size={17} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, styles.dangerCard]} onPress={handleClearHistory}>
          <Ionicons name="trash-outline" size={19} color="#f87171" />
          <View style={styles.actionInfo}><Text style={[styles.ruleTitle, styles.dangerText]}>Effacer l’historique</Text><Text style={styles.ruleText}>Réinitialise aussi le capital calculé</Text></View>
          <Ionicons name="chevron-forward" size={17} color="#64748b" />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showInitialBalance} animationType="slide" transparent onRequestClose={() => setShowInitialBalance(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Capital de départ</Text>
              <TouchableOpacity onPress={() => setShowInitialBalance(false)}><Ionicons name="close" size={24} color="#9ca3af" /></TouchableOpacity>
            </View>
            <TransactionForm allowInitialBalance liveRate={rate} onComplete={() => setShowInitialBalance(false)} />
          </View>
        </View>
      </Modal>
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
  refreshButton: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  ruleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 14 },
  ruleTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  ruleText: { color: '#cbd5e1', fontSize: 13 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1f2937', padding: 14 },
  dangerCard: { borderColor: '#3f1d25' },
  actionInfo: { flex: 1 },
  dangerText: { color: '#fca5a5' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: '#f9fafb', fontSize: 19, fontWeight: '800' },
});
