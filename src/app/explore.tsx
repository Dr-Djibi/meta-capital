import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useProductStore,
  ProductStatus,
  STATUS_LABELS,
  STATUS_ICONS,
  calcSuggestedPrice,
} from '@/store/useProductStore';

const STATUSES: ProductStatus[] = ['DRAFT', 'ORDERED', 'IN_STOCK', 'ARCHIVED'];

const STATUS_COLORS: Record<ProductStatus, string> = {
  DRAFT: '#374151',
  ORDERED: '#1e40af',
  IN_STOCK: '#065f46',
  ARCHIVED: '#1f2937',
};

export default function ProduitsScreen() {
  const { products, addProduct, deleteProduct, updateProduct } = useProductStore();
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [estimatedCpa, setEstimatedCpa] = useState('4');
  const [targetMargin, setTargetMargin] = useState('40');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();

  const f = (v: string) => parseFloat(v.replace(',', '.')) || 0;

  const previewPrice = calcSuggestedPrice(
    f(purchasePrice),
    f(shippingCost),
    f(estimatedCpa),
    f(targetMargin) / 100
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const resetForm = () => {
    setTitle('');
    setPurchasePrice('');
    setShippingCost('');
    setEstimatedCpa('4');
    setTargetMargin('40');
    setSupplierUrl('');
    setImageUri(undefined);
    setShowForm(false);
  };

  const handleAdd = () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Le nom du produit est obligatoire.');
      return;
    }
    if (f(purchasePrice) <= 0) {
      Alert.alert('Champ requis', 'Le prix d\'achat est obligatoire.');
      return;
    }
    addProduct({
      title: title.trim(),
      purchasePrice: f(purchasePrice),
      shippingCost: f(shippingCost),
      estimatedCpa: f(estimatedCpa),
      targetMargin: f(targetMargin) / 100,
      supplierUrl: supplierUrl.trim() || undefined,
      imageUri,
      status: 'DRAFT',
    });
    resetForm();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.subtitle}>Catalogue</Text>
            <Text style={styles.title}>Produits</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, showForm && styles.addBtnCancel]}
            onPress={() => (showForm ? resetForm() : setShowForm(true))}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
            <Text style={styles.addBtnText}>{showForm ? 'Annuler' : 'Ajouter'}</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nouveau produit</Text>

            {/* Image picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePickerInner}>
                  <Ionicons name="camera-outline" size={28} color="#4b5563" />
                  <Text style={styles.imagePickerText}>Ajouter une photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nom */}
            <View style={styles.inputWrapper}>
              <Ionicons name="pricetag-outline" size={16} color="#4b5563" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nom du produit *"
                placeholderTextColor="#4b5563"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* URL fournisseur */}
            <View style={styles.inputWrapper}>
              <Ionicons name="link-outline" size={16} color="#4b5563" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Lien fournisseur (URL)"
                placeholderTextColor="#4b5563"
                value={supplierUrl}
                onChangeText={setSupplierUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Prix ligne 1 */}
            <View style={styles.row3}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prix achat</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0.00"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>$</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frais port</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={shippingCost}
                    onChangeText={setShippingCost}
                    placeholder="0.00"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>$</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CPA Meta</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={estimatedCpa}
                    onChangeText={setEstimatedCpa}
                    placeholder="4.00"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>$</Text>
                </View>
              </View>
            </View>

            {/* Marge + Prix conseillé */}
            <View style={styles.row2}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Marge cible</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={targetMargin}
                    onChangeText={setTargetMargin}
                    placeholder="40"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>%</Text>
                </View>
              </View>
              <View style={[styles.inputGroup, styles.pricePreviewBox]}>
                <Text style={styles.inputLabel}>Prix conseillé</Text>
                <Text style={styles.previewPrice}>{previewPrice.toFixed(2)} $</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Enregistrer le produit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {products.length === 0 && !showForm && (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color="#1f2937" />
            <Text style={styles.emptyTitle}>Aucun produit</Text>
            <Text style={styles.emptySubtitle}>
              Appuie sur Ajouter pour créer ton premier produit
            </Text>
          </View>
        )}

        {/* Product cards */}
        {products.map((p) => (
          <View key={p.id} style={styles.productCard}>
            {/* Product Header */}
            <View style={styles.productHeader}>
              {p.imageUri ? (
                <Image source={{ uri: p.imageUri }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="cube-outline" size={24} color="#374151" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>
                <View style={styles.statusBadge}>
                  <Ionicons
                    name={STATUS_ICONS[p.status] as any}
                    size={12}
                    color="#9ca3af"
                  />
                  <Text style={styles.productStatus}>{STATUS_LABELS[p.status]}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() =>
                  Alert.alert('Supprimer ?', `"${p.title}" sera supprimé définitivement.`, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteProduct(p.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Price breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>Achat</Text>
                <Text style={styles.priceVal}>{p.purchasePrice.toFixed(2)} $</Text>
              </View>
              <Ionicons name="add" size={14} color="#374151" />
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>Port</Text>
                <Text style={styles.priceVal}>{p.shippingCost.toFixed(2)} $</Text>
              </View>
              <Ionicons name="add" size={14} color="#374151" />
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>CPA</Text>
                <Text style={styles.priceVal}>{p.estimatedCpa.toFixed(2)} $</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#374151" />
              <View style={[styles.priceCol, styles.priceColHighlight]}>
                <Text style={[styles.priceLabel, { color: '#60a5fa' }]}>
                  Prix ({(p.targetMargin * 100).toFixed(0)}%)
                </Text>
                <Text style={styles.priceHighlight}>{p.suggestedPrice.toFixed(2)} $</Text>
              </View>
            </View>

            {/* Status picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      p.status === s && { backgroundColor: STATUS_COLORS[s] },
                    ]}
                    onPress={() => updateProduct(p.id, { status: s })}
                  >
                    <Ionicons
                      name={STATUS_ICONS[s] as any}
                      size={13}
                      color={p.status === s ? '#e5e7eb' : '#4b5563'}
                    />
                    <Text
                      style={[styles.statusText, p.status === s && styles.statusTextActive]}
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Supplier link */}
            {p.supplierUrl ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(p.supplierUrl!)}
              >
                <Ionicons name="open-outline" size={14} color="#60a5fa" />
                <Text style={styles.linkText}>Voir le fournisseur</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnCancel: { backgroundColor: '#374151' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  form: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  formTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '700' },
  imagePicker: {
    backgroundColor: '#111827',
    borderRadius: 12,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePickerInner: { alignItems: 'center', gap: 6 },
  imagePreview: { width: '100%', height: 110 },
  imagePickerText: { color: '#4b5563', fontSize: 13 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, color: '#f9fafb', fontSize: 14 },
  row3: { flexDirection: 'row', gap: 8 },
  row2: { flexDirection: 'row', gap: 8 },
  inputGroup: { flex: 1, gap: 5 },
  inputLabel: { color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  inputWrapperSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  inputSmall: { flex: 1, paddingVertical: 10, color: '#f9fafb', fontSize: 14 },
  unit: { color: '#4b5563', fontSize: 13 },
  pricePreviewBox: {
    backgroundColor: '#0a1628',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPrice: { color: '#60a5fa', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: '#374151', fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: '#1f2937', fontSize: 13, textAlign: 'center', maxWidth: 200 },

  productCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  productHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  productInfo: { flex: 1, gap: 5 },
  productTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productStatus: { color: '#6b7280', fontSize: 12 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  priceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030712',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    flexWrap: 'nowrap',
  },
  priceCol: { alignItems: 'center', gap: 3 },
  priceColHighlight: { flex: 1 },
  priceLabel: { color: '#374151', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  priceVal: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  priceHighlight: { color: '#60a5fa', fontSize: 16, fontWeight: '800' },

  statusRow: { flexDirection: 'row', gap: 6 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statusText: { color: '#4b5563', fontSize: 12 },
  statusTextActive: { color: '#e5e7eb', fontWeight: '600' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  linkText: { color: '#60a5fa', fontSize: 13 },
});
