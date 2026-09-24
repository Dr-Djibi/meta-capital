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
  Product,
  ProductStatus,
  STATUS_LABELS,
  STATUS_ICONS,
  calcSuggestedPrice,
} from '@/store/useProductStore';
import { USD_TO_GNF } from '@/constants/currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';

const STATUSES: ProductStatus[] = ['DRAFT', 'ORDERED', 'IN_STOCK', 'ARCHIVED'];

const STATUS_COLORS: Record<ProductStatus, string> = {
  DRAFT: '#374151',
  ORDERED: '#1e40af',
  IN_STOCK: '#065f46',
  ARCHIVED: '#1f2937',
};

function getProductCostUSD(product: Product, rate: number) {
  const freightGNF = product.freightPerKgGNF ?? (product.freightPerKg ?? 0) * USD_TO_GNF;
  const dailyBudgetUSD = getDailyAdBudgetUSD(product);
  return product.purchasePrice + (product.weight * freightGNF) / rate + (dailyBudgetUSD * (product.adDays ?? 1)) / Math.max(product.quantity ?? 1, 1);
}

function getDailyAdBudgetUSD(product: Product) {
  if (product.dailyAdBudgetUSD !== undefined) return product.dailyAdBudgetUSD;
  if (product.dailyAdBudgetGNF !== undefined) return product.dailyAdBudgetGNF / USD_TO_GNF;
  return product.estimatedCpa ?? 0;
}

export default function ProduitsScreen() {
  const { products, addProduct, deleteProduct, updateProduct } = useProductStore();
  const { rate } = useExchangeRate();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');

  const [title, setTitle] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [weight, setWeight] = useState('');
  const [freightPerKgGNF, setFreightPerKgGNF] = useState('100000');
  const [dailyAdBudgetUSD, setDailyAdBudgetUSD] = useState('5');
  const [adDays, setAdDays] = useState('7');
  const [targetMargin, setTargetMargin] = useState('40');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const f = (v: string) => parseFloat(v.replace(',', '.')) || 0;

  const previewPrice = calcSuggestedPrice(
    f(purchasePrice),
    f(weight),
    f(freightPerKgGNF),
    f(dailyAdBudgetUSD),
    f(adDays),
    f(quantity),
    f(targetMargin) / 100,
    rate
  );

  const filteredProducts = products.filter((product) => {
    const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
    const matchesSearch = product.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
    setQuantity('1');
    setWeight('');
    setFreightPerKgGNF('100000');
    setDailyAdBudgetUSD('5');
    setAdDays('7');
    setTargetMargin('40');
    setSupplierUrl('');
    setImageUri(undefined);
    setEditingProduct(null);
    setShowForm(false);
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setTitle(product.title);
    setPurchasePrice(product.purchasePrice.toString());
    setQuantity((product.quantity ?? 0).toString());
    setWeight(product.weight.toString());
    setFreightPerKgGNF((product.freightPerKgGNF ?? (product.freightPerKg ?? 0) * USD_TO_GNF).toString());
    setDailyAdBudgetUSD(getDailyAdBudgetUSD(product).toString());
    setAdDays((product.adDays ?? 1).toString());
    setTargetMargin((product.targetMargin * 100).toString());
    setSupplierUrl(product.supplierUrl ?? '');
    setImageUri(product.imageUri);
    setShowForm(true);
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
    const productData = {
      title: title.trim(),
      purchasePrice: f(purchasePrice),
      quantity: Math.max(0, Math.floor(f(quantity))),
      weight: f(weight),
      freightPerKgGNF: f(freightPerKgGNF),
      dailyAdBudgetUSD: f(dailyAdBudgetUSD),
      adDays: Math.max(1, Math.floor(f(adDays))),
      targetMargin: f(targetMargin) / 100,
      supplierUrl: supplierUrl.trim() || undefined,
      imageUri,
      status: editingProduct?.status ?? 'DRAFT',
    };
    if (editingProduct) updateProduct(editingProduct.id, productData);
    else addProduct(productData);
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
            <Text style={styles.formTitle}>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</Text>

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

            {/* Prix & Poids (Ligne 1) */}
            <View style={styles.row2}>
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
                <Text style={styles.inputLabel}>Poids</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="0.00"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>kg</Text>
                </View>
              </View>
              <View style={styles.inputGroupQuantity}>
                <Text style={styles.inputLabel}>Quantité prévue / stock</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput style={styles.inputSmall} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} placeholder="1" placeholderTextColor="#4b5563" />
                  <Text style={styles.unit}>unités</Text>
                </View>
              </View>
            </View>

            {/* Transitaire en GNF */}
            <View style={styles.row2}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transitaire / kg</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={freightPerKgGNF}
                    onChangeText={setFreightPerKgGNF}
                    placeholder="100000"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>GNF/kg</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Budget pub / jour</Text>
                <View style={styles.inputWrapperSmall}>
                  <TextInput
                    style={styles.inputSmall}
                    keyboardType="decimal-pad"
                    value={dailyAdBudgetUSD}
                    onChangeText={setDailyAdBudgetUSD}
                    placeholder="5"
                    placeholderTextColor="#4b5563"
                  />
                  <Text style={styles.unit}>$ / jour</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Durée de publicité</Text>
              <View style={styles.inputWrapperSmall}>
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="number-pad"
                  value={adDays}
                  onChangeText={setAdDays}
                  placeholder="7"
                  placeholderTextColor="#4b5563"
                />
                <Text style={styles.unit}>jours</Text>
              </View>
            </View>

            {/* Marge + Prix conseillé (Ligne 3) */}
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
                <Text style={styles.inputLabel}>Prix de vente conseillé</Text>
                <Text style={styles.previewPrice}>{previewPrice.toFixed(2)} $</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>{editingProduct ? 'Enregistrer les modifications' : 'Enregistrer le produit'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {products.length > 0 && (
          <View style={styles.catalogTools}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color="#4b5563" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un produit"
                placeholderTextColor="#4b5563"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setStatusFilter('ALL')}
              >
                <Text style={[styles.filterText, statusFilter === 'ALL' && styles.filterTextActive]}>Tous ({products.length})</Text>
              </TouchableOpacity>
              {STATUSES.filter((status) => products.some((product) => product.status === status)).map((status) => {
                const count = products.filter((product) => product.status === status).length;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                      {STATUS_LABELS[status]} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
        {filteredProducts.map((p) => (
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
              <TouchableOpacity style={styles.editBtn} onPress={() => editProduct(p)}>
                <Ionicons name="pencil-outline" size={17} color="#60a5fa" />
              </TouchableOpacity>
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

            <View style={styles.priceSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.priceLabel}>Prix de revient unitaire</Text>
                <Text style={styles.costValue}>{getProductCostUSD(p, rate).toFixed(2)} $</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.priceLabel}>Vente unitaire conseillée</Text>
                <Text style={styles.priceHighlight}>{calcSuggestedPrice(p.purchasePrice, p.weight, p.freightPerKgGNF ?? (p.freightPerKg ?? 0) * USD_TO_GNF, getDailyAdBudgetUSD(p), p.adDays ?? 1, p.quantity ?? 1, p.targetMargin, rate).toFixed(2)} $</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.priceLabel}>Quantité</Text>
                <Text style={styles.quantityValue}>{p.quantity ?? 0}</Text>
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

        {products.length > 0 && filteredProducts.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color="#1f2937" />
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            <Text style={styles.emptySubtitle}>Essaie un autre nom ou un autre statut</Text>
          </View>
        )}
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
  catalogTools: { gap: 10, marginBottom: 14 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  searchInput: { flex: 1, paddingVertical: 11, color: '#f9fafb', fontSize: 14 },
  filterRow: { gap: 6 },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  filterChipActive: { backgroundColor: '#1e3a5f', borderColor: '#2563eb' },
  filterText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#dbeafe' },
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
  inputGroupQuantity: { flex: 1.1, gap: 5 },
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
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
  },

  priceSummary: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, backgroundColor: '#030712', borderRadius: 11, padding: 11, gap: 6 },
  priceLabel: { color: '#64748b', fontSize: 10, lineHeight: 13 },
  costValue: { color: '#f59e0b', fontSize: 15, fontWeight: '800' },
  priceHighlight: { color: '#60a5fa', fontSize: 16, fontWeight: '800' },
  quantityValue: { color: '#e5e7eb', fontSize: 16, fontWeight: '800' },

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
