# PASSATION.md — Meta Capital · État du Projet & Roadmap

> Document de passation mis à jour le **24 septembre 2026**.
> Ce fichier remplace `context.md` et sert de référence centrale pour tout dev ou agent IA qui reprend le projet.

---

## 1. Vision du Projet

Application mobile personnelle sous **Expo (React Native + TypeScript)** pour :
- Suivre en temps réel le **capital disponible** (fonds propres, aides familiales, dépenses)
- Calculer automatiquement les **prix de vente optimaux** pour des produits e-commerce avec Meta Ads
- Gérer les fonds selon **plusieurs moyens de paiement** (Orange Money, carte, espèces, virement)
- Afficher tous les montants en **double devise : USD et Franc Guinéen (GNF)**

---

## 2. Stack Technique

| Outil | Usage |
|---|---|
| **Expo SDK** | Framework React Native |
| **expo-router** | Navigation file-based |
| **Zustand + AsyncStorage** | State management + persistance offline |
| **TypeScript** | Typage strict |
| **Ionicons** | Icônes UI |
| **StyleSheet natif** | UI (pas NativeWind pour l'instant) |

---

## 3. Ce qui est déjà implémenté ✅

### A. Dashboard (`src/app/index.tsx`)
- Capital net affiché en **USD (grand)** + **GNF (secondaire en or)**
- Stats Dépôts / Retraits avec double devise
- Bandeau indicateur du taux de change actif
- Teinte verte/rouge de la carte selon le solde

### B. Formulaire de transaction (`src/components/TransactionForm.tsx`)
- Toggle **Dépôt / Retrait** (vert / rouge)
- Saisie du montant avec **sélecteur de devise USD ou GNF**
- **Conversion en temps réel** sous le champ (ex: `50 $` → `≈ 430 000 GNF`)
- **Grille de moyens de paiement** :
  - 🟠 Orange Money
  - 🟣 Carte bancaire
  - 🟢 Espèces
  - 🔵 Virement
- Sélecteur de catégorie horizontal (chips)
- Bouton submit coloré selon le type (vert dépôt / rouge retrait)

### C. Liste des transactions (`src/components/TransactionList.tsx`)
- Chaque ligne affiche : **USD + GNF**, badge coloré du moyen de paiement
- Compteur de transactions
- État vide avec illustration
- Suppression par appui long

### D. Store Zustand (`src/store/useCapitalStore.ts`)
- Champ `currency` (USD | GNF) sur chaque transaction
- Champ `originalAmount` (montant tel que saisi)
- Champ `paymentMethod` (Orange Money, Carte, Espèces, Virement)
- Montants stockés **toujours en USD** pour cohérence des calculs
- Persistance clé `capital-store-v2`

### E. Constantes devises (`src/constants/currency.ts`)
- Taux fixe : **1 USD = 8 600 GNF** (modifiable ici)
- Fonctions : `toUSD()`, `toGNF()`, `formatUSD()`, `formatGNF()`, `formatDual()`
- Labels, icônes et couleurs des moyens de paiement

---

## 4. Modèle de Données Actuel

### Transaction
```ts
{
  id: string;
  amount: number;           // TOUJOURS en USD
  currency: 'USD' | 'GNF'; // Devise originale saisie
  originalAmount: number;   // Montant tel que saisi
  type: 'INCOME' | 'EXPENSE';
  category: TransactionCategory;
  paymentMethod: 'ORANGE_MONEY' | 'CARTE_BANCAIRE' | 'ESPECES' | 'VIREMENT';
  description: string;
  date: string; // ISO 8601
}
```

### Catégories disponibles
| Code | Label | Type |
|---|---|---|
| `PERSONAL_FUNDS` | Fonds propres | Dépôt |
| `FAMILY_SUPPORT` | Aide famille | Dépôt |
| `SALES_REVENUE` | Recette vente | Dépôt |
| `ADVERTISING` | Meta Ads | Retrait |
| `PRODUCT_PURCHASE` | Achat stock | Retrait |
| `PERSONAL_EXPENSE` | Dépense perso | Retrait |

---

## 5. Ce qui N'est PAS encore fait ❌

### Écran Produits (Étape 4 — priorité haute)
- [ ] Liste des produits avec photo, titre, statut
- [ ] Formulaire ajout produit : photo (`expo-image-picker`), lien fournisseur, prix d'achat, frais port, CPA estimé, marge cible
- [ ] Calculateur automatique du prix de vente recommandé :
  ```
  CUT = Prix achat + Frais port unitaires + CPA estimé
  Prix vente = CUT / (1 - Marge souhaitée)
  ```
- [ ] Statuts produit : `DRAFT` → `ORDERED` → `IN_STOCK` → `ARCHIVED`

### Fonctionnalités Finance avancées
- [ ] **Taux de change dynamique** — récupérer le vrai taux USD/GNF via API (ex: exchangerate-api.com)
- [ ] **Graphique de trésorerie** — courbe d'évolution du capital dans le temps (ex: Victory Native ou Gifted Charts)
- [ ] **Budget mensuel** — définir un budget max par catégorie et alerter quand on dépasse
- [ ] **Export** — générer un CSV ou PDF du journal de transactions
- [ ] **Filtres** — filtrer la liste par date, catégorie, moyen de paiement, type
- [ ] **Recherche** — barre de recherche dans les transactions
- [ ] **Récurrence** — transactions répétitives (ex: pub Meta Ads quotidienne)

### UX / UI
- [ ] **Swipe to delete** — glisser une transaction vers la gauche pour supprimer (au lieu du long press)
- [ ] **Animations** — animer l'ajout de transaction (slide in + haptic feedback)
- [ ] **Mode clair / sombre** — support du thème light (le thème dark est déjà en place)
- [ ] **Onboarding** — écran de bienvenue avec config initiale (devise préférée, nom)
- [ ] **Widget** — widget Android/iOS pour voir le capital d'un coup d'œil

### Orange Money intégration
- [ ] Lire les SMS de confirmation Orange Money pour **auto-importer les transactions** (Android uniquement via `expo-sms` ou `react-native-sms`)
- [ ] Parser le format : `Vous avez reçu X GNF de ...`

---

## 6. Idées Futures 💡

| Idée | Priorité | Complexité |
|---|---|---|
| Taux de change temps réel (API) | 🔴 Haute | Faible |
| Graphique évolution capital | 🔴 Haute | Moyenne |
| Swipe to delete | 🟡 Moyenne | Faible |
| Filtres / recherche | 🟡 Moyenne | Faible |
| Export CSV | 🟡 Moyenne | Moyenne |
| Budget par catégorie + alertes | 🟡 Moyenne | Moyenne |
| Auto-import SMS Orange Money | 🟢 Basse | Haute |
| Widget écran d'accueil | 🟢 Basse | Haute |
| Transactions récurrentes | 🟢 Basse | Moyenne |
| Multi-compte | 🟢 Basse | Haute |

---

## 7. Formules Clés

**Capital Net**
```
Capital Net = Σ(Dépôts en USD) − Σ(Retraits en USD)
```

**Coût Unitaire Total (CUT)**
```
CUT = Prix achat + Frais de port unitaires + CPA estimé
```

**Prix de Vente Recommandé**
```
Prix vente = CUT / (1 − Marge souhaitée)
```

**Conversion devise**
```
Taux actuel : 1 USD = 8 600 GNF  →  src/constants/currency.ts
```

---

## 8. Structure des Fichiers

```
src/
├── app/
│   ├── index.tsx          ← Dashboard principal
│   ├── explore.tsx        ← Écran Produits (à construire)
│   └── _layout.tsx        ← Layout + tabs
├── components/
│   ├── TransactionForm.tsx ← Formulaire dépôt/retrait
│   ├── TransactionList.tsx ← Liste avec double devise
│   └── ...
├── constants/
│   ├── currency.ts        ← Taux USD/GNF, formatage, moyens de paiement
│   └── theme.ts           ← Couleurs thème
└── store/
    ├── useCapitalStore.ts  ← État transactions (Zustand)
    └── useProductStore.ts  ← État produits (Zustand)
```
